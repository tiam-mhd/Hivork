import { execSync } from 'node:child_process';

process.env.DATABASE_URL ??= 'postgresql://hivork:hivork_dev@127.0.0.1:5432/hivork?schema=public';

execSync('pnpm exec prisma validate', { stdio: 'inherit' });
