import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NotificationBell } from './notification-bell';

vi.mock('@/components/providers/realtime-provider', () => ({
  useRealtime: () => ({
    unreadCount: 3,
    markAllRead: vi.fn().mockResolvedValue(undefined),
    notifications: [],
    status: 'connected',
    highPriorityToast: null,
    clearHighPriorityToast: vi.fn(),
    subscribe: () => () => undefined,
  }),
}));

describe('NotificationBell', () => {
  it('shows unread badge count', () => {
    render(<NotificationBell />);
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByLabelText('اعلان‌ها')).toBeTruthy();
  });
});
