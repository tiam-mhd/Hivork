/**
 * IFP-TASK-018 — canonical integration suite runs from `@hivork/api`:
 * `apps/api/src/phase-01-auth/phase-01-auth.integration.spec.ts`
 *
 * This package re-exports fixtures/helpers and delegates `pnpm test:phase-01-auth`.
 */
export {
  CAPTCHA_BYPASS_HEADER,
  CAPTCHA_BYPASS_HEADERS,
} from './helpers/captcha-bypass.js';

export {
  PHASE01_DEFAULT_PASSWORD,
  seedPhase01AuthFixture,
  softDeleteTestApiKeys,
  type Phase01Fixtures,
  type Phase01StaffFixture,
  type Phase01ViewerFixture,
} from './fixtures/auth-users.js';
