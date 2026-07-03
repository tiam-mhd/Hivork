import { ApplicationError } from '../errors/application.error.js';
import { UseCase } from '../core/use-case.js';
import type { DataScopeStaffContext } from '../rbac/build-data-scope-filter.js';

export type WalletPaymentInput = {
  tenantId: string;
  branchId: string;
  staffId: string;
  installmentId: string;
  amountRial: bigint;
  walletProvider: string;
  idempotencyKey: string;
  staffContext: DataScopeStaffContext;
};

/** IFP-105 stub — wallet gateway ships in a later phase. */
export class WalletPaymentUseCase implements UseCase<WalletPaymentInput, never> {
  async execute(_input: WalletPaymentInput): Promise<never> {
    throw new ApplicationError(
      'WALLET_PAYMENT_NOT_AVAILABLE',
      'Wallet payments are not yet available.',
      501,
    );
  }
}
