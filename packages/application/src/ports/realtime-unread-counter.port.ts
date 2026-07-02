export interface IRealtimeUnreadCounter {
  increment(tenantId: string, staffId: string): Promise<number>;
  get(tenantId: string, staffId: string): Promise<number>;
  reset(tenantId: string, staffId: string): Promise<void>;
}
