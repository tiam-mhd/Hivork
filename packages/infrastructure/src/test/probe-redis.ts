import Redis from 'ioredis';

export async function probeRedis(url: string): Promise<boolean> {
  const client = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 2_000,
  });

  try {
    await client.connect();
    await client.ping();
    await client.quit();
    return true;
  } catch {
    try {
      await client.quit();
    } catch {
      // ignore
    }
    return false;
  }
}
