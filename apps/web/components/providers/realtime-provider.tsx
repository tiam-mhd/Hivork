'use client';

import {
  NotificationUnreadCountSchema,
  RealtimeEventSchema,
  type RealtimeEventDto,
} from '@hivork/contracts/realtime';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { API_URL, apiFetch } from '@/lib/api/client';
import { useStaffAuth } from '@/lib/auth/use-staff-auth';
import { computeRealtimeBackoffMs } from '@/lib/realtime/backoff';
import { getRealtimeEventTitle } from '@/lib/realtime/event-titles';

const MAX_NOTIFICATIONS = 20;
const POLL_INTERVAL_MS = 60_000;
const IGNORED_EVENT_TYPES = new Set(['system.connected', 'heartbeat']);

export type RealtimeConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export type NotificationItem = RealtimeEventDto & { read: boolean };

type RealtimeContextValue = {
  status: RealtimeConnectionStatus;
  notifications: NotificationItem[];
  unreadCount: number;
  highPriorityToast: string | null;
  clearHighPriorityToast: () => void;
  markAllRead: () => Promise<void>;
  subscribe: (type: string, handler: (event: RealtimeEventDto) => void) => () => void;
};

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

function buildStreamUrl(accessToken: string): string {
  const url = new URL(`${API_URL}/realtime/stream`);
  url.searchParams.set('access_token', accessToken);
  return url.toString();
}

function buildWsUrl(accessToken: string): string {
  const httpUrl = new URL(`${API_URL}/realtime/ws`);
  httpUrl.searchParams.set('access_token', accessToken);
  return httpUrl.toString().replace(/^http/, 'ws');
}

function parseRealtimePayload(raw: string): RealtimeEventDto | null {
  if (!raw || raw === 'heartbeat') {
    return null;
  }

  try {
    const json: unknown = JSON.parse(raw);
    if (typeof json === 'object' && json !== null && 'type' in json && json.type === 'heartbeat') {
      return null;
    }
    const parsed = RealtimeEventSchema.safeParse(json);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, accessToken, refreshSession } = useStaffAuth();
  const [status, setStatus] = useState<RealtimeConnectionStatus>('disconnected');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [highPriorityToast, setHighPriorityToast] = useState<string | null>(null);

  const seenEventIdsRef = useRef(new Set<string>());
  const subscribersRef = useRef(new Map<string, Set<(event: RealtimeEventDto) => void>>());
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transportCleanupRef = useRef<(() => void) | null>(null);
  const statusRef = useRef<RealtimeConnectionStatus>('disconnected');

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const ingestEvent = useCallback((event: RealtimeEventDto) => {
    if (IGNORED_EVENT_TYPES.has(event.type)) {
      return;
    }
    if (seenEventIdsRef.current.has(event.id)) {
      return;
    }
    seenEventIdsRef.current.add(event.id);

    setNotifications((current) => {
      const next: NotificationItem[] = [{ ...event, read: false }, ...current].slice(
        0,
        MAX_NOTIFICATIONS,
      );
      return next;
    });
    setUnreadCount((count) => count + 1);

    if (event.priority === 'high') {
      setHighPriorityToast(getRealtimeEventTitle(event.type));
    }

    const handlers = subscribersRef.current.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        handler(event);
      }
    }
    const wildcard = subscribersRef.current.get('*');
    if (wildcard) {
      for (const handler of wildcard) {
        handler(event);
      }
    }
  }, []);

  const pollUnreadCount = useCallback(async () => {
    try {
      const result = await apiFetch<unknown>('/notifications/unread-count');
      const parsed = NotificationUnreadCountSchema.safeParse(result);
      if (parsed.success) {
        setUnreadCount(parsed.data.unreadCount);
      }
    } catch {
      // polling is best-effort
    }
  }, []);

  const markAllRead = useCallback(async () => {
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    setUnreadCount(0);
    try {
      await apiFetch('/notifications/mark-read', { method: 'POST' });
    } catch {
      // local state already cleared
    }
  }, []);

  const clearHighPriorityToast = useCallback(() => {
    setHighPriorityToast(null);
  }, []);

  const subscribe = useCallback(
    (type: string, handler: (event: RealtimeEventDto) => void) => {
      const bucket = subscribersRef.current.get(type) ?? new Set();
      bucket.add(handler);
      subscribersRef.current.set(type, bucket);
      return () => {
        bucket.delete(handler);
        if (bucket.size === 0) {
          subscribersRef.current.delete(type);
        }
      };
    },
    [],
  );

  const scheduleReconnect = useCallback(
    (connect: () => void) => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      reconnectAttemptRef.current += 1;
      const delay = computeRealtimeBackoffMs(reconnectAttemptRef.current);
      reconnectTimerRef.current = setTimeout(connect, delay);
    },
    [],
  );

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      setStatus('disconnected');
      transportCleanupRef.current?.();
      transportCleanupRef.current = null;
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
      return;
    }

    let disposed = false;

    const startPolling = () => {
      if (pollTimerRef.current) {
        return;
      }
      void pollUnreadCount();
      pollTimerRef.current = setInterval(() => {
        void pollUnreadCount();
      }, POLL_INTERVAL_MS);
    };

    const stopPolling = () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };

    const connectWebSocket = (): (() => void) => {
      const ws = new WebSocket(buildWsUrl(accessToken));

      ws.onopen = () => {
        if (disposed) {
          return;
        }
        reconnectAttemptRef.current = 0;
        setStatus('connected');
        stopPolling();
        void pollUnreadCount();
      };

      ws.onmessage = (message) => {
        if (typeof message.data !== 'string') {
          return;
        }
        const event = parseRealtimePayload(message.data);
        if (event) {
          ingestEvent(event);
        }
      };

      ws.onerror = () => {
        if (!disposed) {
          setStatus('disconnected');
          startPolling();
        }
      };

      ws.onclose = () => {
        if (disposed) {
          return;
        }
        setStatus('disconnected');
        startPolling();
        scheduleReconnect(connect);
      };

      return () => {
        ws.close();
      };
    };

    const connectEventSource = (): (() => void) => {
      const source = new EventSource(buildStreamUrl(accessToken));
      let usingWebSocket = false;

      source.onopen = () => {
        if (disposed) {
          return;
        }
        reconnectAttemptRef.current = 0;
        setStatus('connected');
        stopPolling();
        void pollUnreadCount();
      };

      source.onmessage = (message) => {
        const event = parseRealtimePayload(message.data);
        if (event) {
          ingestEvent(event);
        }
      };

      source.addEventListener('heartbeat', () => {
        // keep-alive from server
      });

      source.onerror = () => {
        if (disposed || usingWebSocket) {
          return;
        }
        source.close();
        usingWebSocket = true;
        setStatus('connecting');
        transportCleanupRef.current = connectWebSocket();
      };

      return () => {
        source.close();
      };
    };

    const connect = () => {
      if (disposed) {
        return;
      }
      transportCleanupRef.current?.();
      setStatus('connecting');
      transportCleanupRef.current = connectEventSource();
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && statusRef.current !== 'connected') {
        void pollUnreadCount();
      }
    };

    connect();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      stopPolling();
      transportCleanupRef.current?.();
      transportCleanupRef.current = null;
    };
  }, [accessToken, ingestEvent, isAuthenticated, pollUnreadCount, scheduleReconnect]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const interval = setInterval(() => {
      void refreshSession();
    }, 12 * 60_000);

    return () => clearInterval(interval);
  }, [isAuthenticated, refreshSession]);

  const value = useMemo<RealtimeContextValue>(
    () => ({
      status,
      notifications,
      unreadCount,
      highPriorityToast,
      clearHighPriorityToast,
      markAllRead,
      subscribe,
    }),
    [
      status,
      notifications,
      unreadCount,
      highPriorityToast,
      clearHighPriorityToast,
      markAllRead,
      subscribe,
    ],
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtime(): RealtimeContextValue {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within RealtimeProvider');
  }
  return context;
}
