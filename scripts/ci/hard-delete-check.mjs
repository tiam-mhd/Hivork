import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const pattern = /\.(delete|deleteMany)\(/;
const roots = ['apps', 'packages', 'modules'].filter((dir) => existsSync(dir));

function collectTsFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist' || entry === '.turbo') continue;
      collectTsFiles(fullPath, files);
      continue;
    }
    if (!entry.endsWith('.ts')) continue;
    if (entry.endsWith('.spec.ts')) continue;
    if (fullPath.includes('prisma-soft-delete')) continue;
    files.push(fullPath);
  }
  return files;
}

const violations = [];

for (const root of roots) {
  for (const file of collectTsFiles(root)) {
    const content = readFileSync(file, 'utf8');
    if (pattern.test(content)) {
      violations.push(relative(process.cwd(), file));
    }
  }
}

if (violations.length > 0) {
  console.error('Hard delete usage found — use soft delete only (ADR-013):');
  for (const file of violations) console.error(`  ${file}`);
  process.exit(1);
}

console.log('ci:hard-delete-check ok');
