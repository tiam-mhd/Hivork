import { DomainError } from '@hivork/domain';
import { describe, expect, it } from 'vitest';

import { UseCase } from './use-case.js';

type EchoInput = { value: string };
type EchoOutput = { value: string };

class EchoUseCase implements UseCase<EchoInput, EchoOutput> {
  async execute(input: EchoInput): Promise<EchoOutput> {
    if (!input.value) {
      throw new DomainError('EMPTY_VALUE');
    }
    return { value: input.value };
  }
}

describe('UseCase', () => {
  it('defines execute(input) => Promise<output>', async () => {
    const useCase = new EchoUseCase();

    await expect(useCase.execute({ value: 'ok' })).resolves.toEqual({ value: 'ok' });
  });

  it('allows domain errors from use cases', async () => {
    const useCase = new EchoUseCase();

    await expect(useCase.execute({ value: '' })).rejects.toMatchObject({
      code: 'EMPTY_VALUE',
    });
  });
});
