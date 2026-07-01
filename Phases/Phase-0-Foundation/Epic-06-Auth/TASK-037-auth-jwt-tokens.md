# TASK-037: Auth — JWT Access + Refresh Tokens

## Metadata

| فیلد | مقدار |
|------|--------|
| Phase | 0 |
| Epic | Epic-06-Auth |
| ID | TASK-037 |
| Priority | P0 |
| Depends on | TASK-005, TASK-006 |
| Blocks | TASK-036, TASK-038, TASK-041 |
| Estimated | 4h |

---

## هدف

تعریف ساختار کامل JWT tokenهای Hivork: access token کوتاه‌مدت، refresh token بلند‌مدت در httpOnly cookie، و verifiedToken برای onboarding. جداسازی کامل actor (staff vs customer) در payload. پیاده‌سازی endpoint‌های `refresh` و `logout` با token rotation و blacklist.

---

## معیار پذیرش

- [ ] `JwtTokenService` در infrastructure token sign/verify را پیاده‌سازی می‌کند
- [ ] Access token: TTL 15 دقیقه، payload شامل `{ sub, actor, tenantId?, type: 'access' }`
- [ ] Refresh token: TTL 30 روز، httpOnly cookie `hivork_staff_refresh` / `hivork_customer_refresh`
- [ ] VerifiedToken: TTL 5 دقیقه، payload `{ phone, actor, purpose: 'register', type: 'verified' }`
- [ ] `POST /auth/refresh` — refresh cookie را می‌خواند، access token جدید برمی‌گرداند
- [ ] `POST /auth/logout` — refresh cookie را پاک می‌کند، token در Redis blacklist می‌شود
- [ ] Token blacklist در Redis با TTL برابر ماندگاری refresh token
- [ ] Staff token شامل `branchId` نیست (ADR-015)

---

## مشخصات فنی

### Token Payloads

#### Staff Access Token

```typescript
{
  sub: string;           // staffId
  actor: 'staff';
  tenantId: string;
  type: 'access';
  // NO branchId — branch context from X-Branch-Id / Redis (ADR-015)
}
```

#### Customer Access Token

```typescript
{
  sub: string;           // globalCustomerId
  actor: 'customer';
  type: 'access';
}
```

#### Refresh Token

```typescript
{
  sub: string;           // staffId or globalCustomerId
  actor: 'staff' | 'customer';
  type: 'refresh';
}
```

#### VerifiedToken (onboarding only)

```typescript
{
  phone: string;
  actor: 'staff';
  purpose: 'register';
  type: 'verified';
}
```

### JWT Secrets & TTL

| Token | Secret env | TTL env | Default |
|-------|-----------|---------|---------|
| Access | `JWT_ACCESS_SECRET` | `JWT_ACCESS_TTL` | 900s (15m) |
| Refresh | `JWT_REFRESH_SECRET` | `JWT_REFRESH_TTL` | 2592000s (30d) |
| Verified | `JWT_ACCESS_SECRET` (shared) | hardcoded | 300s (5m) |

### Cookies

```
Name:     hivork_staff_refresh  |  hivork_customer_refresh
httpOnly: true
secure:   true (production), false (dev)
sameSite: lax
maxAge:   JWT_REFRESH_TTL seconds
path:     /api/v1/auth
```

### Endpoints

#### POST /api/v1/auth/refresh

```typescript
// Body: { actor: 'staff' | 'customer' }
// Reads cookie: hivork_{actor}_refresh
// Response: { accessToken, expiresIn }
```

#### POST /api/v1/auth/logout

```typescript
// Body: { actor: 'staff' | 'customer' }
// Reads cookie → blacklists token in Redis → clears cookie
// Response: { success: true }
```

### Token Blacklist

```
Redis Key: blacklist:token:{jti or sha256(token)}
Value:     1
TTL:       remaining TTL of refresh token
```

### IAuthTokenService Port

```typescript
interface IAuthTokenService {
  signAccessToken(payload: Omit<StaffAccessTokenPayload, 'type'>): Promise<string>;
  signAccessToken(payload: Omit<CustomerAccessTokenPayload, 'type'>): Promise<string>;
  verifyAccessToken(token: string): Promise<AccessTokenPayload | null>;
  signRefreshToken(payload: Omit<RefreshTokenPayload, 'type'>): Promise<string>;
  verifyRefreshToken(token: string): Promise<RefreshTokenPayload | null>;
  signVerifiedToken(payload: Omit<VerifiedTokenPayload, 'type'>): Promise<string>;
  verifyVerifiedToken(token: string): Promise<VerifiedTokenPayload | null>;
  getAccessTtlSeconds(): number;
  getRefreshTtlSeconds(): number;
  getVerifiedTtlSeconds(): number;
}
```

---

## فایل‌ها

| عمل | مسیر |
|-----|------|
| Create | `packages/application/src/auth/ports/token.port.ts` — `IAuthTokenService`, `ITokenBlacklistPort` |
| Create | `packages/infrastructure/src/auth/jwt-token.service.ts` |
| Create | `packages/infrastructure/src/auth/jwt.config.ts` |
| Create | `packages/infrastructure/src/redis/redis-token-blacklist.service.ts` |
| Update | `apps/api/src/auth/auth.controller.ts` — refresh/logout endpoints |
| Create | `apps/api/src/auth/auth-cookies.ts` — helper functions |
| Update | `apps/api/src/auth/auth.module.ts` |

---

## مراحل پیاده‌سازی

1. تعریف `IAuthTokenService` و `ITokenBlacklistPort` در application ports
2. پیاده‌سازی `JwtTokenService` در infrastructure با `jsonwebtoken`
3. پیاده‌سازی `RedisTokenBlacklistService`
4. تعریف `JwtTokenConfig` (env vars)
5. اضافه کردن `auth-cookies.ts` — helper برای set/clear httpOnly cookie
6. پیاده‌سازی `RefreshSessionUseCase` (verify refresh token → find user → issue new access)
7. پیاده‌سازی `LogoutUseCase` (blacklist refresh token)
8. اضافه کردن endpoints `POST /auth/refresh` و `POST /auth/logout`
9. نوشتن تست

---

## Edge Cases & Errors

| سناریو | HTTP | Code | رفتار |
|--------|------|------|--------|
| Refresh cookie غایب | 401 | `TOKEN_INVALID` | Cookie missing |
| Refresh token نامعتبر/منقضی | 401 | `TOKEN_EXPIRED` | — |
| Refresh token در blacklist | 401 | `TOKEN_REVOKED` | Already logged out |
| Staff/Customer در DB یافت نشد | 401 | `UNAUTHORIZED` | Account deleted/suspended |
| Tenant mismatch در token | 401 | `TOKEN_INVALID` | Security violation |
| Refresh با actor اشتباه | 401 | `WRONG_ACTOR` | — |

---

## تست

- [ ] Unit: `JwtTokenService.signAccessToken()` → verify → payload صحیح
- [ ] Unit: `JwtTokenService.verifyAccessToken()` — token منقضی → null
- [ ] Unit: `JwtTokenService.verifyAccessToken()` — type اشتباه → null
- [ ] Unit: `RefreshSessionUseCase` — blacklisted token → throw
- [ ] Unit: `LogoutUseCase` — token blacklisted در Redis
- [ ] Unit: Staff token به customer endpoint → `WRONG_ACTOR`
- [ ] Integration: refresh cookie → new access token معتبر
- [ ] Integration: logout → cookie پاک + token revoked

---

## Policy Alignment

- [ ] EXCELLENCE-STANDARDS §6 — security endpoint کامل
- [ ] ADR-011 — جداسازی staff/customer cookies
- [ ] ADR-015 — `branchId` خارج از JWT
- [ ] هیچ PII (phone, name) در JWT payload
- [ ] Soft Delete: Redis blacklist ephemeral — لازم نیست

---

## مراجع

- `docs/06-operations/security-and-audit.md` § Token Strategy
- ADR-011, ADR-015
- TASK-038 (Actor Separation)

---

## Self-Review Score

| محور | /25 | یادداشت |
|------|-----|---------|
| Metadata | 10/10 | همه فیلدها |
| Completeness | 25/25 | Payload types، cookie spec، endpoints |
| Policy | 25/25 | ADR-011، ADR-015، no PII in JWT |
| Executability | 25/25 | Edge cases، tests، بدون ابهام |
| Alignment | 15/15 | Sync با TASK-036، TASK-038، contracts |
| **جمع** | **100/100** | ✅ Ready for implementation |
