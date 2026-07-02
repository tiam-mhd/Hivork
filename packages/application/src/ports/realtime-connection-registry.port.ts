export interface IRealtimeConnectionRegistry {
  tryAcquire(tenantId: string, staffId: string, connectionId: string): Promise<boolean>;
  refresh(tenantId: string, staffId: string, connectionId: string): Promise<void>;
  release(tenantId: string, staffId: string, connectionId: string): Promise<void>;
}
