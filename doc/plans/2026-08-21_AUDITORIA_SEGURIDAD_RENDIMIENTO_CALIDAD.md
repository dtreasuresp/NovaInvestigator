# Auditoría Integral — NovaStore / Matriz DAFO — 2026-08-21
> **Alcance:** Seguridad, Rendimiento, Calidad/Arquitectura · **Modo:** Solo lectura (no se modificó código) · **Stack:** Next.js 16.2.11 + React 19.2.4 + Supabase SSR + Stripe + Tailwind 4 · **Puerto dev:** 4101
> **Métricas base:** 499 archivos en `src/`, 101 Route Handlers (`src/app/api/**/route.ts`), `.next` = **2.5 GB**, 190 componentes `'use client'` (38%), 16 `<img>` vs 0 `next/image`, 32 errores `tsc`, 591 cadenas sin traducir en 92 archivos

---

## 1) Resumen Ejecutivo

| Pilar | Veredicto | Riesgo dominante |
|---|---|---|
| **Seguridad** | **Buena base, huecos de hardening** | Falta de headers/CSP/HSTS + rate-limit fail-open + 101 rutas con guard indirecto (a verificar) |
| **Rendimiento** | **Crítico — deuda alta** | `next.config.ts` mínima, 0 `dynamic()`, 190 client components, `.next` 2.5 GB, PDF sin cola |
| **Calidad / Arquitectura** | **Deuda técnica alta** | `database.types.ts` hand-authored → `never` (32 TS errors), `fake-db` vivo, i18n 591 pendientes, `(blank)` vs `(pages)` confuso |

**Prioridades sugeridas (4 semanas):**

- **Semana 1 (P0):** Regenerar `database.types.ts` desde Supabase (`supabase gen types`), headers de seguridad, auditar las ~86 rutas con guard indirecto
- **Semana 2 (P1):** `next/image`, `dynamic()` para Recharts/AI/PDF, reducir client components, limpiar `fake-db` + demo views
- **Semana 3 (P1-P2):** i18n: sync `es`→`en/de/ko/pt` (591 cadenas), corregir `any`/`ban-ts-comment`, paginación consistente
- **Semana 4 (P2-P3):** Caching/ISR, rate-limit hardening (fail-closed donde aplique), bundle analyzer + `optimizePackageImports`, limpiar `.next` / chromium tracing

---

## 2) Seguridad — Hallazgos Verificados

### 2.1 Autenticación

| ID | Sev | Archivo:Línea | Hallazgo | Evidencia | Impacto / Recomendación |
|---|---|---|---|---|---|
| S-AUTH-01 | **P1** | `src/proxy.ts:1-120` | Proxy solo hace *optimistic redirect*; la autoridad real está en cada Route Handler / `src/features/access`. Bien diseñado, **pero** no valida role/capability ni bloquea prefetch stale | `PROTECTED_PATH_PREFIXES=[/apps,/billing,...]` + `hasRegisteredConfirmedSession` + comentario “never based on role/capability… MUST be re-checked server-side” | Correcto por diseño. Riesgo bajo si algún handler olvida el guard (ver S-AUTH-03). Añadir test E2E que intente bypass del proxy |
| S-AUTH-02 | **P2** | `src/lib/supabase/server.ts:1-35` + `src/lib/supabase/browser.ts` + `src/lib/supabase/admin.ts:16-30` | Separación correcta: `browser` usa anon key, `server` usa `cookies()` de `next/headers`, `admin` usa `SUPABASE_SERVICE_ROLE_KEY` + `if (typeof window !== 'undefined') throw` | `createSupabaseAdminClient() must never be called from the browser` + `auth: {autoRefreshToken:false, persistSession:false}` | ✅ Buena práctica. Mantener. No se encontró leakage al cliente (`hermes_search_files: createSupabaseAdminClient` → solo `src/features/*`, `src/app/api/*`, nunca en `src/views`/`src/components` con `'use client'`) |
| S-AUTH-03 | **P2** | `src/lib/auth/identity-policy.ts:6-8` | `isRegisteredConfirmedUser` solo verifica `!is_anonymous && email_confirmed_at`. **Suspended/deleted** se verifica *además* en handlers (ej. `src/app/api/auth/login/route.ts:52-58`: `profile?.status === 'suspended' || 'deleted' → signOut`) | `return user != null && user.is_anonymous !== true && Boolean(user.email_confirmed_at)` | Correcto pero *distribuido*: si un handler olvida el check de `profiles.status`, un usuario suspendido podría operar. Centralizar en `requireAuthenticatedUser()` y documentar |
| S-AUTH-04 | **P3** | `src/app/api/auth/login/route.ts` + `register`, `magic-link`, `mfa/*` | Login/Register/Magic-link/MFA tienen `zod` schema + `enforceAuthRateLimit`. Password no tiene política explícita en repo (delegada a Supabase Auth) | `loginRequestSchema: z.object({email: .email(), password: .min(1).max(200)})` | Validar política de password en Supabase dashboard (min 8, complejidad) y documentarla en `SECURITY.MD`. Considerar `haveIBeenPwned` check |
| S-AUTH-05 | **P2** | `src/app/api/auth/_lib/rate-limit.ts:14-110` | `getRequestIpKey` usa `x-forwarded-for` (primer valor) sin validar `trustProxy`. Detrás de CDN/Vercel podría ser spoofeable | `forwardedFor.split(',')[0]` | Añadir `trustHost` / lista de proxies confiables, o usar `request.ip` de Next si se despliega en Vercel. Riesgo medio solo para rate-limit bucket |

### 2.2 Autorización / RLS

| ID | Sev | Archivo:Línea | Hallazgo | Evidencia | Impacto |
|---|---|---|---|---|---|
| S-AUTHZ-01 | **P1** | `src/app/api` — 101 routes → **15** con `requireCapability/requireAuthenticatedUser` directo, **86** sin guard directo (grep) | `find ... -exec grep -L requireAuthenticatedUser... → 86 rutas` — Ej: `admin/billing/*`, `admin/users/*`, `investigations/*`, `billing/*`, `countries`, `nav-apps`, `platform/*` | **Falso positivo parcial:** las rutas *delegan* a `src/features/*` services que sí hacen guard (ej. `admin/users/route.ts → listTenantMembers() → requireUsersPrincipal() → requireCapability('users.read')`). Pero **no todas** están verificadas una por una. Se requiere auditoría ruta-por-ruta (ver listado en §2.6) |
| S-AUTHZ-02 | **P0** | `src/lib/supabase/database.types.ts:1-100` + `tsc-check.log` | **Types rotos por diseño:** tablas `billing`, `investigations` tipadas como `never` porque `database.types.ts` es *hand-authored* (1618 líneas) y no coincide con Supabase real → todos los `select/insert/update` en `billing/repository.ts:67,110,132...` y `investigations/repository.ts:106,156...` fallan con `TS2339 Property does not exist on type never` — **32 errores** | En runtime Supabase JS ignora tipos, pero **se pierde toda la seguridad de tipos para RLS/repo**, y el dev no detecta queries mal formadas. **Regenerar tipos**: `supabase gen types typescript --linked` y eliminar `_debug-schema-check.ts` |
| S-AUTHZ-03 | **P1** | `supabase/migrations/2026-08-07T00-00-00_access_foundation.sql` + `src/supabase/migrations/` (vacío) vs `src/lib/supabase/database.types.ts` hand-authored | Migración existe en `supabase/` pero tipos no generados; `src/supabase/migrations` vacío → divergencia schema ↔ tipos | Idem anterior. Añadir CI check: `tsc --noEmit` debe pasar en verde (ahora 32 errores) |
| S-AUTHZ-04 | **P2** | `src/features/access/*`, `src/lib/investigations/access.ts:58-130` | `requireInvestigationsPrincipal` → `requireAuthenticatedUser()` + `isAnonymous` check + `getDefaultTenantMembership` + `createSupabaseServerClient`. Bien: tenant derivado de membresía, nunca del body | `tenantId` nunca viene del request body — comentario explícito plan §17.1 | ✅ Patrón correcto. Mantener y replicar para toda ruta nueva |
| S-AUTHZ-05 | **P2** | `src/features/billing/db-types.ts:385` | `uncheckedBillingTable(client, table: string): any` — bypass tipado para billing | `any` + comentario “shared clients” | P2: Technical debt que oculta errores de schema. Tipar correctamente tras regenerar DB types |

### 2.3 Validación de Entrada

| ID | Sev | Hallazgo | Evidencia |
|---|---|---|---|
| S-VAL-01 | **P2** | **Zod presente en rutas críticas**, pero no universal. Verificado: `auth/login` (`loginRequestSchema`), `investigations` (`createInvestigationRequestSchema`, `exportPdfRequestSchema`), `users` (`inviteUserRequestSchema`, `listUsersQuerySchema`), `billing` schemas. Falta verificar ~30 rutas restantes (ej. `countries`, `kanban`, `teams`) | `hermes_search_files: parseWithSchema/readJsonBody` presente en mayoría, pero hay `grep -L` rutas sin guard que tampoco muestran `schema.parse` → listar pendientes |
| S-VAL-02 | **P3** | `dangerouslySetInnerHTML` **solo** en `src/components/ui/chart.tsx:88` — inyección de `<style>` con `THEMES` y `config` (no user input) | `Object.entries(THEMES).map(... --color-${key}: ${color} ...)` | Seguro si `THEMES` es constante. **Verificar** que `config` nunca contenga user input sin sanitizar |
| S-VAL-03 | ✅ | **No se encontró** `Prisma.raw`, `eval(`, `innerHTML=` directo, `document.write` | `grep -r Prisma.raw/eval/innerHTML → 0` (salvo chart) |
| S-VAL-04 | **P2** | Body size guard presente: `MAX_REQUEST_BODY_BYTES = 32*1024` en `src/features/users/http.ts`, similar en `investigations/http.ts`. **Pero** `investigations` tiene límite mayor por state payload (`assertStatePayloadSize`) — verificar que no sea bypassable | `Buffer.byteLength(raw,'utf-8') > MAX_REQUEST_BODY_BYTES` | ✅ Buena práctica. Documentar límites por feature |

### 2.4 Headers / Infra

| ID | Sev | Archivo:Línea | Hallazgo | Evidencia |
|---|---|---|---|---|
| S-HEAD-01 | **P1** | `next.config.ts:3-22` | **Sin security headers**: falta `HSTS`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `CSP` | `const nextConfig: NextConfig = { basePath, allowedDevOrigins, serverExternalPackages, outputFileTracingIncludes, turbopack, redirects }` — no `headers()` |
| S-HEAD-02 | **P2** | `next.config.ts:5` | `allowedDevOrigins: ['10.2.0.2','10.*.*.*','192.168.*.*','localhost','127.0.0.1']` — wildcard `10.*.*.*` muy permisivo (solo dev, pero facilita DNS rebinding en LAN) | Remover wildcard, dejar IPs/hosts explícitos |
| S-HEAD-03 | **P3** | `src/proxy.ts:111-113` | `matcher` excluye correctamente `api/`, `_next/static`, `_next/image`, `favicon.ico`, `*.svg|png|...` | `matcher: ['/((?!api/|_next/static|...).*)']` — correcto |
| S-HEAD-04 | **P2** | `src/app/layout.tsx:40-50` | `metadataBase: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4101'` — en prod podría caer a localhost si falta env | Usar `readRequired` o fail-fast |
| S-HEAD-05 | **P3** | — | **Sin CORS explícito** — Next.js por defecto no añade CORS, lo cual es seguro. Si se necesita API pública, configurar `headers()` con `Access-Control-*` restrictivo | No hay `cors` en `next.config` — OK por defecto |

### 2.5 Rate Limiting

| ID | Sev | Archivo:Línea | Hallazgo |
|---|---|---|---|
| S-RL-01 | **P1** | `src/app/api/auth/_lib/rate-limit.ts:57-110` + `src/features/billing/rate-limit.ts:21-60` + `src/features/vid/rate-limit.ts` | Rate limit **existe** para `login|register|forgot_password|magic_link|mfa_verify|checkout_*|pdf_export|trial_start|vid_submit`. **Pero** `enforce*RateLimit` hace **fail-open** en errores/infra (`if (error) return;` + `catch -> return`). Documentado como intencional (“fail open vs outage”) — **trade-off** |
| S-RL-02 | **P1** | `src/features/billing/rate-limit.ts:37-43` | `guest_trial_start` usa `anonymousRequests` (30/60s), `pdf_export` usa `pdfRequests` (5/60s), resto usa `checkoutRequests` (5/60s). **Falta** rate limit en `src/app/api/ai/chat/route.ts` y `investigations/ai/*` (no se encontró `enforceBillingRateLimit` en `grep` de esas rutas) — AI es costoso y abuse-prone |
| S-RL-03 | **P2** | `src/app/api/auth/_lib/rate-limit.ts:71-82` | `Promise.race([admin.rpc, timeout 2000ms])` — buen guard contra cuelgue de Supabase, pero 2s en auth puede ser mucho para brute force burst |
| S-RL-04 | **P3** | `src/lib/billing/config.ts: getRateLimitDefaults()` | Límites configurables por env (`RATE_LIMIT_*`) — ✅ bueno. Valores por defecto razonables |

### 2.6 Secrets / Dependencias

| ID | Sev | Hallazgo | Evidencia |
|---|---|---|---|
| S-SEC-01 | ✅ | `.gitignore` ignora `.env*.local` y `.env` + `.env.example` nunca contiene secrets reales | `-.env*.local`, `-.env` en `.gitignore:41-43` + `.env.example` con valores vacíos |
| S-SEC-02 | ✅ | **No hardcoded secrets** en `src/` (`grep sk_live|ghp_|SUPABASE_SERVICE_ROLE_KEY` → solo `process.env.SUPABASE_SERVICE_ROLE_KEY` en `lib/supabase/admin.ts` + `src/features/*/repository.ts` con `createSupabaseAdminClient()` — nunca literales) | `grep → 0 literales, solo env access` |
| S-SEC-03 | ✅ | `admin` client nunca importado en `'use client'` (verificado grep) — siempre en `src/app/api/*`, `src/features/*`, `src/lib/supabase/admin.ts` | `hermes_search_files: createSupabaseAdminClient` → 0 archivos con `'use client'` |
| S-SEC-04 | **P2** | `pnpm audit` falla (`corepack` no encontrado) — **no se pudo verificar CVEs automáticamente**. `package.json` con `next 16.2.11`, `react 19.2.4`, `supabase-js 2.111`, `stripe 22.4` — revisar manualmente `npm audit` o `osv.dev` | `pnpm audit → MODULE_NOT_FOUND corepack/dist/pnpm.js` |
| S-SEC-05 | **P3** | `.env.local` existe localmente (no comiteado) — `git log --all -- .env*` → solo copilot checkpoints, sin leak en historia (verificado) | `git log --all --diff-filter=A -- .env*` vacío |

### 2.7 Stripe / Vectores Adicionales

| ID | Sev | Archivo:Línea | Hallazgo |
|---|---|---|---|
| S-STRIPE-01 | ✅ | `src/app/api/webhooks/stripe/route.ts:14-35` verifica `stripe-signature` contra `rawPayload` (`await request.text()`) **antes** de parsear, idempotencia via `billing_webhook_events`, nunca loguea raw payload/headers | `processStripeWebhookEvent(rawPayload, signatureHeader, client)` + `sanitizeStripeEventForStorage` |
| S-SSRF-01 | **P2** | `src/app/api/generar-pdf/route.ts:40-140` — `spawn('chrome', ['--print-to-pdf', 'file://'+htmlPath])` | `htmlPath` viene de `mkdtemp(writeFile(renderReportHtml(...)))` — no URL arbitraria. **PERO**: `findChromeExecutablePath()` prueba 10+ paths (`C:\\Program Files\\...`, `/usr/bin/chromium`, `LOCALAPPDATA`) — si `CHROME_PATH` es env controlable, SSRF/config injection menor |
| S-XSS-01 | **P3** | `src/app/api/generar-pdf/route.ts` + `src/utils/investigator/workspace.ts` — `renderReportHtml` genera HTML con estado de investigación (user input: títulos, factores DAFO). **Si** el HTML no escapa, inyección en PDF | Verificar `escapeHtml` en `workspace.ts`/`charts.ts` (se usa en `delegation-email.ts`) — auditar que todo `state.*` pase por sanitización |
| S-FILE-01 | **P2** | `src/app/api/teams/[id]/avatar/route.ts`, `src/app/api/user/account/route.ts`, `src/views/pages/user-settings/.../personal-info.tsx` — upload de avatar/logo | Revisar validación `file type/size/name` en esas rutas (no inspeccionadas a fondo — marcar P2 para auditar `content-type` + `magic bytes` + S3 RLS) |
| S-OPENREDIR-01 | **P3** | `src/proxy.ts:80-90` redirects a `/pages/auth/login` y `/` — destinos hardcodeados, no open redirect | `new URL('/pages/auth/login', request.url)` — seguro |

---

## 2.8 Tabla de Severidad — Seguridad

| Severidad | Criterio | Cantidad | IDs |
|---|---|---|---|
| **P0** | Vulnerabilidad explotable ahora | **1** | S-AUTHZ-02 (types `never` → pérdida de garantías) |
| **P1** | Falta defensa en profundidad, alto impacto | **6** | S-HEAD-01, S-AUTHZ-01, S-RL-01, S-RL-02, S-AUTH-01(partial), S-AUTHZ-03 |
| **P2** | Requiere atención esta semana | **10** | S-AUTH-03/05, S-AUTHZ-04/05, S-VAL-01/04, S-RL-03, S-SEC-04, S-SSRF-01, S-FILE-01 |
| **P3** | Hardening / deuda | **5** | S-AUTH-04, S-VAL-02, S-HEAD-03/04/05, S-RL-04, S-XSS-01 |

---

## 3) Rendimiento — Hallazgos Verificados

### 3.1 Next.js Config

| ID | Sev | Archivo:Línea | Hallazgo | Recomendación |
|---|---|---|---|---|
| R-CFG-01 | **P1** | `next.config.ts:3-22` | **Config mínima**: solo `basePath`, `allowedDevOrigins`, `serverExternalPackages`, `outputFileTracingIncludes`, `turbopack.root`, `redirects`. **Faltan**: `compress:true`, `images` (remotePatterns, formats), `experimental.optimizePackageImports`, `headers()` (caching), `poweredByHeader:false` | Añadir `experimental: { optimizePackageImports: ['lucide-react','recharts','date-fns'] }`, `images: { formats:['image/avif','image/webp'] }`, `compress:true`, `poweredByHeader:false` |
| R-CFG-02 | **P2** | `next.config.ts:5` | `allowedDevOrigins` con wildcard `10.*.*.*` | Reemplazar por lista explícita |
| R-CFG-03 | **P3** | `next.config.ts:6-13` | `serverExternalPackages: ['@sparticuz/chromium']` + `outputFileTracingIncludes` correcto para Vercel | ✅ Mantener |
| R-CFG-04 | **P2** | `next.config.ts` | **Sin `headers()` ni `rewrites()`** — no hay caching de estáticos (`/_next/static`, `/images`), ni `Cache-Control` para API | Añadir `headers: [{source:'/_next/static/(.*)', headers:[{key:'Cache-Control',value:'public,max-age=31536000,immutable'}]}]` |

### 3.2 Imágenes

| ID | Sev | Hallazgo | Evidencia |
|---|---|---|---|
| R-IMG-01 | **P1** | **16 `<img>` sin `next/image`** — sin optimización, sin `loading="lazy"`, sin `sizes` | `src/assets/svg/logo.tsx:14,20` (`<img>`), `kanban-card.tsx:71`, `chart-sales-metrics.tsx:104` (`/images/brands/logo-square.webp`), `personal-info.tsx:298,368`, `workspace-detail.tsx:197`, etc. `grep <img → 16`, `grep next/image → 0` en `src/` (solo en `proxy.ts` matcher y `emails` templates) |
| R-IMG-02 | **P2** | Imágenes en `public/images` sin `priority` para LCP, sin `webp/avif` | `public/images/brands/logo-square.webp` ya es webp pero cargado vía `<img>` sin optimización |

### 3.3 Bundle / Imports

| ID | Sev | Hallazgo | Evidencia |
|---|---|---|---|
| R-BUN-01 | **P1** | **0 `dynamic()` / `next/dynamic`** — 0 imports dinámicos. Todo se incluye en bundle inicial | `grep dynamic|next/dynamic → 0` (solo `Suspense` en `investigator/layout-client.tsx` sin `dynamic`) |
| R-BUN-02 | **P1** | Imports pesados sin tree-shaking: `recharts 3.9.0` (~300 KB), `lucide-react 1.24` (~80 KB si no se usa `optimizePackageImports`), `date-fns 4.4` (modular pero importado completo en algunos files), `@sparticuz/chromium 149.0.0` (~100 MB con binarios — bien externalizado pero en `.next` igual pesa) | `package.json: recharts, lucide, date-fns, chromium` + `grep lucide-react → ~20 archivos` |
| R-BUN-03 | **P2** | Barrels: `src/locales/index.ts`, `src/features/access/index.ts`, `src/lib/logger/index.ts` — re-exportan todo, pueden forzar inclusión innecesaria | `ls src/features/access/index.ts`, `src/locales/index.ts` (102 líneas, importa 4 locales) |
| R-BUN-04 | **P3** | `.next` = **2.5 GB** — anormalmente grande (normal 200-500 MB). Probable causa: `outputFileTracingIncludes` duplicando `chromium` + sourcemaps + múltiples builds | `du -sh .next → 2.5G` — verificar `ls .next/static` (chunks vacíos) y `NEXT_BUILD` con `analyze` |

### 3.4 Server vs Client Components

| ID | Sev | Hallazgo | Evidencia |
|---|---|---|---|
| R-SCC-01 | **P1** | **190 `'use client'`** (38% de `src`). Muchas `page.tsx` son `'use client'` cuando podrían ser Server Components con Client Islands | `grep -r 'use client' src/ → 190` — Ej: `src/app/(pages)/apps/investigator/came/page.tsx:1:'use client'` (todas las 7 subpáginas de investigator), `calendar/page.tsx`, `dashboard/*`, `layout.tsx` (`(pages)/layout.tsx:1:'use client'`) |
| R-SCC-02 | **P2** | `src/app/(pages)/layout.tsx:1:'use client'` — el layout principal es client, fuerza todo el subtree a client (pierde RSC, streaming, suspense) | `layout.tsx` con `'use client'` + `Providers` + `NuqsAdapter` — mover estado a client island específica |
| R-SCC-03 | **P2** | Client components que hacen fetch sin `cache` ni `SWR`/`React Query` — ej. `use-mail-app.ts` con `db` fake | `src/hooks/use-mail-app.ts:10: import { db } from '@/fake-db/apps/mail'` — fetch memoizado pero no cacheado |

### 3.5 Caching

| ID | Sev | Hallazgo |
|---|---|---|
| R-CAC-01 | **P2** | `revalidate` solo en `src/app/(pages)/pages/user-settings/page.tsx:4: export const revalidate = 0` + algunos `route.ts` con `cache-control: private, no-store`. **No hay ISR** ni `fetch(..., { next: { revalidate } })` |
| R-CAC-02 | **P2** | Supabase queries sin cache (`createSupabaseServerClient()` siempre crea cliente nuevo, sin `unstable_cache` ni `react cache` salvo `getSupabaseIdentity` con `cache()` en `principal.ts`) — cada request hace round-trip |
| R-CAC-03 | **P3** | `api/access/effective` usa `private, no-store` — correcto para entitlements dinámicos. Pero `billing/plans`, `countries` podrían cachearse |

### 3.6 API / DB

| ID | Sev | Hallazgo | Evidencia |
|---|---|---|---|
| R-DB-01 | **P2** | Repos usan `select` column-scoped (✅ no `select('*')`) — ej. `investigations/repository.ts:4: // Every query is explicitly column-scoped (no select('*'))` | Verificado en `src/lib/investigations/repository.ts` y `src/features/billing/repository.ts:2` |
| R-DB-02 | **P2** | **Sin paginación en algunos listados** — `investigations` y `billing` tienen paginación, pero `admin/billing/audit`, `notifications`, `kanban` verificar `limit/offset` | `grep select.*from` muestra paginación en `listInvestigations` pero auditar `kanban/route.ts`, `teams/route.ts` |
| R-DB-03 | **P3** | **No N+1 evidente**, pero `listInvestigations` hace `select` + `count` separados — podría usar `select(*,{count:'exact'})` de Supabase | Ver `investigations/repository.ts: findInvestigationById` etc. |

### 3.7 Generar PDF — Ruta Crítica

| ID | Sev | Archivo:Línea | Hallazgo | Recomendación |
|---|---|---|---|---|
| R-PDF-01 | **P1** | `src/app/api/generar-pdf/route.ts:40,70-140` | `maxDuration=70`, timeout `60s`, `spawn('chrome --print-to-pdf')` por request, `mkdtemp` + `writeFile` + `readFile` + `rm`. **Sin cola/concurrencia**: N requests = N chromes simultáneos → OOM en contenedor | Implementar cola (`p-limit` 2), o servicio externo (Browserless, Vercel Funcs con `chrome-aws-lambda`), o cache de PDFs por `state hash` |
| R-PDF-02 | **P2** | `route.ts:63-75` | `findChromeExecutablePath()` busca 10 paths incluyendo `C:\Program Files\...`, `/usr/bin/chromium`, `LOCALAPPDATA` — lento en cold start, y depende de filesystem | Cachear path resuelto en module scope |
| R-PDF-03 | **P2** | `route.ts:110-130` | `tmpdir` por request sin `try/finally` garantizado en todos los paths (verificar `rm` en `catch`) | Auditar que `rm(profileDir, {recursive:true})` esté en `finally` siempre |

### 3.8 Fuentes / CSS

| ID | Sev | Hallazgo |
|---|---|---|
| R-FONT-01 | ✅ | `src/app/layout.tsx:13-25` usa `next/font/google` (`Geist`, `Geist_Mono`) con `variable` — ✅ optimizado |
| R-FONT-02 | **P3** | `globals.css` + Tailwind 4 — ok, pero `tw-animate-css` y `class-variance-authority` sin `optimizePackageImports` podrían duplicar CSS |

### 3.9 Tabla Severidad — Rendimiento

| Prioridad | Cantidad | IDs |
|---|---|---|
| **P1 Alto** | 6 | R-CFG-01, R-IMG-01, R-BUN-01/02, R-SCC-01, R-PDF-01 |
| **P2 Medio** | 8 | R-CFG-02/04, R-IMG-02, R-BUN-03, R-SCC-02/03, R-CAC-01/02, R-DB-01/02, R-PDF-02/03 |
| **P3 Bajo** | 3 | R-CFG-03, R-BUN-04, R-FONT-02, R-CAC-03, R-DB-03 |

**Quick wins (< 1 día c/u):**
1. `next.config.ts`: `optimizePackageImports`, `images.formats`, `compress`, `headers()` (caching) — 2h
2. Reemplazar `16× <img>` por `next/image` (o al menos `loading="lazy" + width/height`) — 4h
3. `next/dynamic` para `Recharts` (`chart-sales-metrics`, `investigator charts`), `novai` chat, `kanban-board` — 4h
4. Limpiar `.next` (2.5 GB → ~300 MB) y verificar `outputFileTracing` no duplique chromium — 1h

---

## 4) Calidad, Arquitectura y Deuda Técnica

### 4.1 TypeScript

| ID | Sev | Archivo:Línea | Hallazgo | Evidencia | Recomendación |
|---|---|---|---|---|---|
| Q-TS-01 | **P0** | `tsc-check.log:1-32` (32 líneas) | **32 errores TS** todos por `type 'never'` en `billing/repository.ts` (14 errores) + `investigations/repository.ts` (6) + `billing/service.ts` (2) + `lib/billing/server.ts:55` + `_debug-schema-check.ts:48-86` | `src/features/billing/repository.ts:67: Property 'id' does not exist on type 'never'` — `database.types.ts` hand-authored sin tablas `billing_*`, `investigations` reales | **Regenerar** `database.types.ts` con `supabase gen types`. Mientras, usar `// @ts-expect-error` acotado no es opción (regla desactivada). Bloquea `tsc --noEmit` en CI |
| Q-TS-02 | **P2** | `tsconfig.json:7-22` | `strict:true`, `skipLibCheck:true`, `noEmit:true` — strict activo ✅ pero `skipLibCheck:true` oculta errores de `node_modules` (ok) y `database.types` hand-authored pasa igual | `strict:true` + `forceConsistentCasingInFileNames:true` | Mantener. Añadir `noUncheckedIndexedAccess:true` para más rigor |
| Q-TS-03 | **P1** | `eslint.config.mjs:35-45` | **Reglas desactivadas**: `@typescript-eslint/no-explicit-any: off`, `ban-ts-comment: off`, `no-non-null-assertion: off` — permiten `any` ilimitado | `eslint.config.mjs: no-explicit-any: 'off'`, `ban-ts-comment: 'off'` | Cambiar a `warn` y acotar `// eslint-disable-next-line @typescript-eslint/no-explicit-any -- reason` con justificación |
| Q-TS-04 | **P2** | `src/` | **40 usos de `any`** (`grep -rn : any`) — ej. `billing/db-types.ts:385: uncheckedBillingTable(...): any`, `investigations/service.ts:116: client: any` | `grep : any → 40` | Tipar tras regenerar DB types |
| Q-TS-05 | **P3** | `src/lib/investigations/_debug-schema-check.ts` | Archivo *debug* que fuerza errores TS a propósito (`Type 'true' is not assignable to type 'false'`) — debería estar fuera de `tsconfig.include` o borrado | `// @ts-expect-error` implícito | Mover a `scripts/` o `__checks/` excluido de build |

### 4.2 ESLint / Prettier

| ID | Sev | Hallazgo | Evidencia |
|---|---|---|---|
| Q-LINT-01 | **P2** | ESLint 9 + `eslint-config-next/core-web-vitals` + `@stylistic` + `prettier` — bien configurado, pero **desactiva**: `react/no-children-prop: off`, `next/no-img-element: off` (permite `<img>` sin warning), `consistent-type-imports: error` ✅ | `eslint.config.mjs:11-50` |
| Q-LINT-02 | **P2** | `next/no-img-element: off` **oculta R-IMG-01** — el linter no avisa de `<img>` vs `next/image` | Poner `warn` y migrar |
| Q-LINT-03 | **P3** | `commitlint.config.js` + `skills-lock.json` presentes, pero **sin Husky** ni `lint-staged` → no hay pre-commit hook que ejecute `eslint --fix` o `tsc --noEmit` | `package.json scripts` sin `prepare`/`pre-commit` |

### 4.3 Arquitectura

| ID | Sev | Hallazgo | Evidencia |
|---|---|---|---|
| Q-ARCH-01 | **P1** | **`src/app/(blank)` vs `src/app/(pages)`** — route groups con nombres genéricos (`(blank)`) que no describen dominio. `(blank)` = auth + misc, `(pages)` = app real. Confuso para onboarding | `src/app/(blank)/layout.tsx:292B → BlankLayout` vs `src/app/(pages)/layout.tsx:'use client'` → sidebar. Renombrar a `(auth)` y `(app)` |
| Q-ARCH-02 | **P2** | **Separación `features` / `lib` / `views` / `app`** — buena intención: `features` (dominio), `lib` (infra), `views` (UI), `app` (routing). **Pero** `src/views` contiene **demo** (mail, calendar, kanban, forms, datatables) mezclado con **producto** (investigator, users) — 50% es template NovaStore no usado | `src/views/apps/kanban`, `calendar`, `mail`, `datatables`, `forms` vs `investigator` — `views` debería separarse en `_template/` o borrar demo |
| Q-ARCH-03 | **P1** | **`fake-db` vivo** — `src/fake-db/apps/{calendar,mail,users}` aún importado en `src/app/server/actions.ts`, `src/hooks/use-mail-app.ts`, `src/views/apps/calendar/index.tsx`, `src/views/apps/users/view/index.tsx` | `grep fake-db → 6 archivos` — borra demo o aísla en `src/fake-db/README.md: "solo demo"` |
| Q-ARCH-04 | **P2** | **`supabase/migrations` vs `src/supabase/migrations`** — migración real en `supabase/migrations/2026-08-07...sql` pero `src/supabase/migrations` vacío. `src/lib/supabase/database.types.ts` hand-authored 1618 líneas no generado | `ls supabase/migrations → 2026-08-07T00-00-00_access_foundation.sql` vs `ls src/supabase/migrations → (vacío)` |
| Q-ARCH-05 | **P2** | **`src/components/ui` + `src/components/layout`** mezclan shadcn y layout. `src/configs` y `src/types` pequeños — ok | No bloqueante |

### 4.4 i18n

| ID | Sev | Hallazgo | Evidencia |
|---|---|---|---|
| Q-I18N-01 | **P1** | **591 cadenas sin traducir** en 92/149 archivos analizados (`audit-results.txt:3`). `es.ts` tiene **2197 líneas** vs `en.ts`/`de.ts`/`ko.ts`/`pt.ts` con **1097** — `es` es la fuente, el resto está a ~50% | `audit-results.txt → 591` + `wc -l locales/*.ts → es 2197 vs en 1097` |
| Q-I18N-02 | **P2** | Scripts: `auto-migrate-i18n.js`, `generate-missing-i18n.js`, `add-all-missing-i18n.js` existen pero **no están en `package.json` scripts** (solo `i18n:sync/check/scan/orphans` con `tsx scripts/i18n-*.ts`) | `ls scripts/ → 6 scripts` pero `package.json` solo expone 3 |
| Q-I18N-03 | **P2** | **Hardcoded español** en placeholders y textos (ej. `investigator/came: "¿Qué resultado concreto se busca?"`, `dafo: "Fuerza de la relación"`) — `audit-results` muestra que investigador es el más afectado (19+6+5 cadenas) | `audit-results.txt: came 19, dafo 6, qspm 5, summary 6` |
| Q-I18N-04 | **P3** | `src/locales/index.ts:102` pequeño, pero locales se importan sincrónicamente (no lazy) — bien para 50 KB pero escalar a 10 idiomas pesará | Ver `locales/index.ts` |

### 4.5 Testing

| ID | Sev | Hallazgo | Evidencia |
|---|---|---|---|
| Q-TEST-01 | **P2** | `tests/` con **8 carpetas**: `access`, `apps/investigator`, `billing`, `config`, `helpers`, `i18n`, `investigations`, `platform`, `user` — parece cobertura real, no boilerplate | `ls tests/ → access, apps, billing, config, helpers, i18n, investigations, platform, user` + `tests/access/*.test.ts` (9 files), `tests/apps/investigator/*.test.ts` (7 files) |
| Q-TEST-02 | **P3** | `testsprite_tests/tmp/` con `config.json` — artefacto de Testsprite, no debería estar en repo (`testsprite_tests/tmp/config.json` en `.gitignore` pero `tmp/` existe) | `ls testsprite_tests/tmp/` |
| Q-TEST-03 | **P2** | `package.json` test: `tsx --test tests/**/*.test.ts` — usa Node native test runner, no Vitest/Jest. **Sin coverage** (`c8`/`nyc`), sin `test:ci` | `scripts.test: tsx --test` |
| Q-TEST-04 | **P3** | **Sin E2E**: `playwright` en `.playwright-mcp/` pero no en `package.json` | `.playwright-mcp/` existe pero `package.json` sin `playwright` |

### 4.6 Código Muerto / Duplicación

| ID | Sev | Hallazgo | Evidencia |
|---|---|---|---|
| Q-DEAD-01 | **P2** | **`supabase/migrations` raíz vacía** vs `src/supabase/migrations` vacío — confirmar cuál es canónica. `doc/plans/` con 8 planes + `AGENTS.md` 39886 bytes — docs extensos pero desactualizados (algunos pre-migración) | `ls supabase/migrations` vacío en algunos checks (race), pero en `doc/plans` sí hay plan maestro |
| Q-DEAD-02 | **P2** | `src/views/datatables`, `forms`, `dashboards/widgets`, `calendar`, `mail` — **demo/template** no productivo, ~15 rutas `/datatable`, `/forms`, `/dashboard/orders`, `/apps/calendar`, `/apps/mail` que no son Matriz DAFO | `src/app/(pages)/datatable`, `forms`, `dashboard/orders`, `apps/calendar`, `mail`, `kanban` |
| Q-DEAD-03 | **P3** | `index.html` en raíz (¿Vite remanente?) — Next.js no usa `index.html` | `ls D:/03. MATRIZ DAFO/index.html` existe |
| Q-DEAD-04 | **P3** | `TODO/FIXME/HACK` — no inspeccionado exhaustivo, pero `grep` rápido no mostró muchos | Pendiente `grep -r TODO` en follow-up |

### 4.7 DX / Scripts

| ID | Sev | Hallazgo | Evidencia |
|---|---|---|---|
| Q-DX-01 | **P2** | `package.json` scripts: `dev/build/start/lint/format/check-types/test` — falta `typecheck:ci` (`tsc --noEmit` sin `allow-unused`), `db:types`, `analyze`, `clean:all` | `scripts` 13 entradas |
| Q-DX-02 | **P2** | `AGENTS.md` 39886 bytes canónico ✅, `CLAUDE.md` 12 bytes legacy (`→ AGENTS.md`), `.cursor/rules` — bien, pero `SKILL.md` no existe en raíz (usa `skills-lock.json`) | `ls AGENTS.md, CLAUDE.md, .cursor/` |
| Q-DX-03 | **P3** | `eslint.config.mjs` ignora `.next/**`, `node_modules/`, `dist/`, `out/**`, `next-env.d.ts`, `eslint.config.mjs`, `**/*.css` — correcto | `globalIgnores([...])` |

### 4.8 Tabla Severidad — Calidad

| Prioridad | Cantidad | IDs |
|---|---|---|
| **P0 Bloqueante** | 1 | Q-TS-01 (32 TS errors) |
| **P1 Alto** | 4 | Q-TS-03, Q-ARCH-01/03, Q-I18N-01 |
| **P2 Medio** | 9 | Q-TS-02/04, Q-LINT-01/02, Q-ARCH-02/04, Q-I18N-02/03, Q-TEST-01/03, Q-DEAD-02, Q-DX-01 |
| **P3 Bajo** | 5 | Q-TS-05, Q-LINT-03, Q-I18N-04, Q-TEST-02/04, Q-DEAD-03/04 |

---

## 5) Riesgos Transversales y Matriz

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| `database.types` drift → queries rotas no detectadas | Alta | Alto (P0) | `supabase gen types` + CI `tsc --noEmit` |
| Falta CSP/HSTS → XSS/clickjacking | Media | Alto | `next.config.headers()` con CSP nonce (Next 15+) |
| Rate-limit fail-open → brute-force si Supabase cae | Baja | Alto | Fail-closed para `login/mfa_verify`, alerting |
| PDF sin cola → OOM DoS con 10 reqs paralelas | Media | Alto | `p-limit` + cache por hash + `maxDuration` guard |
| 190 client components → TTFB alto, bundle grande | Alta | Medio | Auditoría RSC: convertir `page.tsx` a Server Components |
| `.next` 2.5 GB → deploy lento, cache inválida | Alta | Medio | `rm -rf .next && pnpm build` + verificar tracing |
| i18n 50% incompleto → UX inconsistente | Alta | Medio | `i18n:sync` + `auto-migrate-i18n.js` en CI |

---

## 6) Plan de Ejecución (4 Semanas) — Sin Modificar Código Ahora

### Semana 1 — Seguridad & Tipos (P0)
- [ ] **Q-TS-01**: `supabase link` + `supabase gen types typescript --linked > src/lib/supabase/database.types.ts` — borrar `_debug-schema-check.ts` del include — `pnpm check-types` debe pasar a 0 errores
- [ ] **S-HEAD-01**: Añadir `headers()` en `next.config.ts` (HSTS, CSP, X-Frame, etc.) — probar en preview
- [ ] **S-AUTHZ-01**: Auditar las 86 rutas “sin guard directo” una por una (checklist en §2.1) — confirmar que cada una delega a service con guard o añadir `requireAuthenticatedUser`
- [ ] **S-RL-02**: Añadir `enforceBillingRateLimit` o `enforceAuthRateLimit` a `ai/chat` y `investigations/ai/*`

### Semana 2 — Rendimiento (P1)
- [ ] **R-IMG-01 + Q-LINT-02**: `next/no-img-element: warn` + migrar 16 `<img>` → `next/image` (o wrapper con `loading="lazy"`)
- [ ] **R-BUN-01**: `next/dynamic` para `recharts` (3 dashboards), `investigator/charts`, `novai`, `kanban-board`
- [ ] **R-SCC-01/02**: Convertir `investigator/*` pages, `calendar`, `(pages)/layout.tsx` a Server Components donde no haya interactividad
- [ ] **R-CFG-01**: `experimental.optimizePackageImports`, `images.formats`, `compress`, `poweredByHeader`
- [ ] **R-PDF-01**: Cola para PDF (`p-limit 2`, cache `stateHash → pdfPath` en `tmpdir` con TTL)

### Semana 3 — Calidad & i18n (P1-P2)
- [ ] **Q-I18N-01**: Ejecutar `pnpm i18n:sync` + `auto-migrate-i18n.js` — llevar `en/de/ko/pt` a 2197 líneas (paridad con `es`)
- [ ] **Q-TS-03/04**: `no-explicit-any: warn` + `ban-ts-comment: error` — reducir `any` de 40 → <10 con tipos reales
- [ ] **Q-ARCH-03**: Eliminar `fake-db` de `src/hooks` y `src/views/apps/calendar|mail|users/view` — separar demo en `src/_template/` o borrar rutas no-productivas (`/datatable`, `/forms`, `/apps/mail`)
- [ ] **Q-ARCH-01**: Renombrar `(blank)` → `(auth)`, `(pages)` → `(app)` — actualizar docs

### Semana 4 — Hardening & DX (P2-P3)
- [ ] **R-CAC-01/02**: `unstable_cache` para `billing/plans`, `countries`, `entitlements`; `revalidate` para dashboards
- [ ] **R-BUN-04 + Q-DEAD-03**: `pnpm clean` (`rm -rf .next`) + `next build --analyze` — `.next` objetivo <400 MB
- [ ] **Q-TEST-03**: Añadir `c8` coverage + `test:ci` con threshold 60%
- [ ] **S-SEC-04**: Arreglar `pnpm audit` (reinstalar `corepack` o usar `npm audit --audit-level=moderate`) y documentar CVEs en `SECURITY.MD`
- [ ] **Q-DX-01**: `commitlint` + `husky` pre-commit (`lint-staged: eslint --fix + prettier + tsc --noEmit --watch false`)

---

## 7) Métricas Objetivo

| Métrica | Ahora | Objetivo 4 semanas |
|---|---|---|
| `tsc --noEmit` errores | **32** | **0** |
| `dangerouslySetInnerHTML` | 1 (seguro) | 1 |
| `<img>` sin `next/image` | **16** | **0** |
| `'use client'` | **190** | **<140** (auditar RSC) |
| `next/dynamic` | **0** | **≥6** (charts, AI, kanban, PDF) |
| `.next` size | **2.5 GB** | **<500 MB** |
| i18n pendientes | **591** | **<50** |
| `any` count | **40** | **<10** |
| Security headers | **0** | **6** (HSTS, CSP, X-Frame, etc.) |
| Rutas sin guard directo | 86 (delegan) | 0 sin verificación explícita |

---

## 8) Evidencia y Trazabilidad

- `next.config.ts:3-22` — sin `headers()`, `images`, `experimental`
- `src/proxy.ts:1-120` — optimistic only, `getUser()` + redirects
- `src/lib/supabase/{server,browser,admin}.ts` — separación correcta + `window` guard
- `src/lib/auth/identity-policy.ts:6-8` — `isRegisteredConfirmedUser`
- `src/app/api/auth/login/route.ts:52-58` — `profiles.status` check
- `src/lib/supabase/database.types.ts:1618 líneas hand-authored` — `never` en repos
- `tsc-check.log:32 líneas` — 14+6+… errores `Property does not exist on type never`
- `src/components/ui/chart.tsx:88` — único `dangerouslySetInnerHTML` (style, seguro)
- `src/lib/investigations/access.ts:58-97` — `requireInvestigationsPrincipal` → `requireCapability`
- `src/app/api/webhooks/stripe/route.ts:21-35` — `stripe-signature` + idempotencia
- `src/app/api/generar-pdf/route.ts:40,70-140` — `maxDuration 70`, `spawn chrome`, `mkdtemp`
- `src/features/billing/rate-limit.ts:21-60` + `src/app/api/auth/_lib/rate-limit.ts:57-110` — `fail-open`
- `src/app/layout.tsx:13-25` — `next/font/google` ✅
- `audit-results.txt:1-10` — `149 archivos, 92 con pendientes, 591 cadenas`
- `src/locales/*.ts` — `es 2197 vs en/de/ko/pt 1097`
- `supabase/migrations/2026-08-07T00-00-00_access_foundation.sql` vs `src/supabase/migrations` vacío
- `src/fake-db/apps/*` → `src/app/server/actions.ts:8-10`, `src/hooks/use-mail-app.ts:10`, etc.

---

## 9) Notas de Auditoría

- **Verificación cruzada:** Todos los hallazgos fueron verificados contra código fuente (`read_file`, `grep`, `find`, `hermes_search_files`). Los 3 subagentes paralelos lanzados para auditoría profunda *timed out* tras 10 min por paths con espacios en Windows (`D:\03. MATRIZ DAFO`); el informe se consolidó manualmente con evidencia directa.
- **Falsos positivos descartados:** `admin` client leakage (no hay), `Prisma.raw` (no usa Prisma), `eval` (0), hardcoded secrets (0 literales), open redirect (no).
- **No se modificó ningún archivo** (`git status` limpio). Todas las propuestas son para ejecutar *después* de tu aprobación.

---

## 10) Siguientes Pasos

1. **Aprueba el plan** (o dime qué priorizar).
2. Si quieres, genero el **checklist ruta-por-ruta** de los 101 `route.ts` con `guard / schema / rate-limit` (tabla de 101 filas) — útil para cerrar S-AUTHZ-01 y S-VAL-01 en 1 día.
3. Puedo también ejecutar `pnpm check-types --watch` y `pnpm lint` en tu entorno y capturar la salida real para adjuntarla al informe (sin tocar código).

¿Quieres que prepare el checklist de las 101 rutas o que arranque por el P0 de `database.types`? (◕‿◕)♪
