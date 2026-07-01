import { describe, expect, it, vi } from 'vitest';

import { ConsoleSmsAdapter } from './console-sms.adapter.js';

describe('ConsoleSmsAdapter', () => {
  it('logs SMS payload to stdout', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const adapter = new ConsoleSmsAdapter();

    await adapter.send('09123456789', 'code: 12345');

    expect(log).toHaveBeenCalledWith('[SMS] to=09123456789 message=code: 12345');
    log.mockRestore();
  });
});
