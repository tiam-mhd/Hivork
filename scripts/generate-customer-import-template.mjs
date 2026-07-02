import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildCustomerImportTemplateBuffer } from '../packages/application/dist/customers/excel/customer-import-template.generator.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targets = [
  path.join(root, 'assets', 'templates', 'customer-import-template.xlsx'),
  path.join(root, 'apps', 'web', 'public', 'templates', 'customer-import-template.xlsx'),
];

const buffer = await buildCustomerImportTemplateBuffer();

for (const target of targets) {
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, buffer);
  console.log(`Wrote ${target}`);
}
