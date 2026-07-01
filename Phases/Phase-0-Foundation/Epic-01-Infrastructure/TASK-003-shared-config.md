# TASK-003: Shared Config (ESLint, Prettier, TSConfig strict)

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-01-Infrastructure |
| ID | TASK-003 |
| Priority | P0 |
| Depends on | TASK-001 |
| Blocks | TASK-006–016 |
| Estimated | 2h |
| Status | ✅ Done |

---

## هدف

Package `@hivork/config` با تنظیمات مشترک TypeScript strict، ESLint، Prettier برای همه workspace packages — اطمینان از یکپارچگی قوانین کیفیت در کل codebase.

---

## معیار پذیرش

- [x] `packages/config` publishable as workspace package (`@hivork/config`)
- [x] `tsconfig.base.json`: `"strict": true`, `"noUncheckedIndexedAccess": true`
- [x] `tsconfig.nestjs.json`: extends base + `emitDecoratorMetadata: true`
- [x] `tsconfig.nextjs.json`: extends base + jsx preserve
- [x] ESLint base: `@typescript-eslint`, no explicit `any` (error)، import order
- [x] Prettier: `singleQuote: true`, `trailingComma: "all"`, `printWidth: 100`
- [x] هر app/package از این config ارث می‌برد — بدون تکرار

---

## مشخصات فنی

### `packages/config/package.json`

```json
{
  "name": "@hivork/config",
  "version": "0.0.0",
  "private": true,
  "scripts": { "build": "tsc", "lint": "echo 'no lint for config'", "test": "echo 'no tests for config'", "typecheck": "tsc --noEmit" }
}
```

### `packages/config/tsconfig.base.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### `packages/config/tsconfig.nestjs.json`

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true
  }
}
```

### `packages/config/prettier.config.js`

```javascript
export default {
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  tabWidth: 2,
  semi: true,
};
```

### `packages/config/eslint.base.js`

```javascript
// Shared ESLint flat config — extended by each package
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';

export const base = tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { import: importPlugin },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'import/order': ['warn', { 'newlines-between': 'always' }],
    },
  },
);
```

### صادرات

- `tsconfig.base.json`
- `tsconfig.nestjs.json`
- `tsconfig.nextjs.json`
- `eslint.base.js`
- `prettier.config.js`

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/config/package.json` |
| Create | `packages/config/tsconfig.base.json` |
| Create | `packages/config/tsconfig.nestjs.json` |
| Create | `packages/config/tsconfig.nextjs.json` |
| Create | `packages/config/eslint.base.js` |
| Create | `packages/config/prettier.config.js` |
| Create | `packages/config/src/index.ts` |
| Update | Root `package.json` devDeps: eslint، prettier، typescript |

---

## مراحل پیاده‌سازی

1. `packages/config/package.json` با اطلاعات workspace
2. `tsconfig.base.json` با `strict: true` و همه required options
3. Variant configs برای NestJS و Next.js
4. ESLint base config (flat config format برای ESLint 9+)
5. Prettier config با استانداردهای پروژه
6. Root devDeps را hoist کن (eslint، prettier، typescript)
7. `pnpm turbo lint` و `pnpm turbo typecheck` را verify کن

---

## Edge Cases & Errors

| سناریو | رفتار |
|--------|--------|
| Package ای که `strict: false` تنظیم کند | CI fail — override مجاز نیست (قانون مطلق) |
| `any` در کد | ESLint error: `@typescript-eslint/no-explicit-any` |
| Import order اشتباه | ESLint warning: `import/order` |
| Package جدید فراموش کند extends کند | Typecheck با پیش‌فرض loose (مخاطره) — review checklist |
| `noUnusedLocals` با type imports | از `type` keyword استفاده کن |
| ESLint v9 flat config | Package های قدیمی plugin ممکن است سازگار نباشند |

---

## تست

```bash
pnpm turbo lint       # باید همه packages lint pass کنند
pnpm turbo typecheck  # باید همه packages typecheck pass کنند
# در یک package تست: import any → ESLint error
```

---

## ممنوعیت‌ها

- `"strict": false` در هر `tsconfig.json` (DEVELOPMENT_RULES §8)
- Per-app duplicate ESLint config بدون `extends` از `eslint.base.js`
- `"any"` بدون مستندسازی دلیل
- ESLint v8 format (از v9 flat config استفاده کن)

---

## Policy Alignment

- [x] DEVELOPMENT_RULES.md §8 — TypeScript strict; no `any`
- [x] `.cursor/rules/06-testing-quality.mdc` — lint + typecheck in CI
- [x] SOFT-DELETE-POLICY — N/A (configuration package)
- [ ] EXCELLENCE-STANDARDS — N/A (no UI یا DB entity)

---

## مراجع

- `.cursor/rules/06-testing-quality.mdc`
- `docs/09-development/DEVELOPMENT_RULES.md` §8

---

## Self-Review Score

| محور | /امتیاز | یادداشت |
|------|---------|---------|
| Metadata (10) | 10/10 | همه فیلدها |
| Completeness (25) | 25/25 | AC دقیق، spec کامل، files table |
| Policy (25) | 25/25 | DEVELOPMENT_RULES §8 explicit |
| Executability (25) | 25/25 | Edge cases، steps، tests |
| Alignment (15) | 14/15 | Sync با rules + tech-stack |
| **جمع** | **99/100** | ✅ Ready |
