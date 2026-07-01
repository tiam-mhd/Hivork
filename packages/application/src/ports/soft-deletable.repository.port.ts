export type SoftDeletableRecord = {
  id: string;
  tenantId: string;
  deletedAt: Date | null;
  deletedById: string | null;
  deleteReason: string | null;
  version: number;
};

export type SoftDeleteCommand = {
  id: string;
  tenantId: string;
  deletedById: string;
  deleteReason?: string;
};

export type RestoreCommand = {
  id: string;
  tenantId: string;
  restoredById: string;
};

export interface ISoftDeletableRepository<TRecord extends SoftDeletableRecord = SoftDeletableRecord> {
  findActiveById(id: string, tenantId: string): Promise<TRecord | null>;
  findDeletedById(id: string, tenantId: string): Promise<TRecord | null>;
  softDelete(command: SoftDeleteCommand): Promise<TRecord>;
  restore(command: RestoreCommand): Promise<TRecord>;
  listDeleted(tenantId: string, limit?: number): Promise<TRecord[]>;
}
