import { UseCase } from '../core/use-case.js';

export type TelegramWebhookInput = {
  update: unknown;
};

export type TelegramWebhookOutput = {
  ok: true;
};

/** Phase 2: replace with real handler delegating to domain use cases */
export class HandleTelegramWebhookUseCase implements UseCase<
  TelegramWebhookInput,
  TelegramWebhookOutput
> {
  async execute(_input: TelegramWebhookInput): Promise<TelegramWebhookOutput> {
    return { ok: true };
  }
}
