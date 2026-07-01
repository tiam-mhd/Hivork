#!/usr/bin/env node
/**
 * Rejects physical LTR-oriented Tailwind classes in apps/web (use logical ms-/me-/ps-/pe-).
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = 'apps/web';
const pattern =
  /\b(ml-|mr-|pl-|pr-|left-|right-|text-left|text-right|border-l-|border-r-|rounded-l-|rounded-r-)/;

const allowedFiles = new Set([
  // generated
]);

function collectSourceFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '.next' || entry === '.turbo') continue;
      collectSourceFiles(fullPath, files);
      continue;
    }
    if (!/\.(tsx?|css)$/.test(entry)) continue;
    files.push(fullPath);
  }
  return files;
}

if (!existsSync(ROOT)) {
  console.log('ci:rtl-class-check skipped (apps/web missing)');
  process.exit(0);
}

const violations = [];

for (const file of collectSourceFiles(ROOT)) {
  const rel = relative(process.cwd(), file);
  if (allowedFiles.has(rel)) continue;
  const content = readFileSync(file, 'utf8');
  const match = pattern.exec(content);
  if (match) {
    violations.push({ file: rel, token: match[1] });
  }
}

if (violations.length > 0) {
  console.error('Physical LTR Tailwind classes found in apps/web — use logical properties:');
  for (const v of violations) {
    console.error(`  ${v.file} (${v.token})`);
  }
  process.exit(1);
}

console.log('ci:rtl-class-check ok');
