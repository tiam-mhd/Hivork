import { describe, expect, it } from 'vitest';

import { HandleTelegramWebhookUseCase } from '../webhooks/handle-telegram-webhook.use-case.js';

describe('HandleTelegramWebhookUseCase', () => {
  it('implements the UseCase contract (skeleton stub)', async () => {
    const useCase = new HandleTelegramWebhookUseCase();

    await expect(useCase.execute({ update: { message_id: 1 } })).resolves.toEqual({
      ok: true,
    });
  });
});
