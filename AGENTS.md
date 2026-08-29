# NovaResearch / Research — AI Assistant Instructions

Instrucción canónica para asistentes de IA y agentes autónomos que trabajan en este repositorio.
Los archivos `CLAUDE.md` y `.github/copilot-instructions.md` son puntos de entrada que redirigen o derivan de aquí.

Ante cualquier contradicción entre archivos de instrucciones o documentación previa, este documento prevalece de forma absoluta.

---

## Product Naming & Architecture

Este repositorio sigue una taxonomía y arquitectura de producto estricta que no debe alterarse ni confundirse:

```text
                    NovaResearch
                  Platform / Suite
                         │
                         ▼
                      Research
                Research Application
                         │
                    API / MCP
                         │
                         ▼
                       NovAi
               Independent AI Product
```

### Reglas Canónicas de Identidad:

1. **NovaResearch**: Es la plataforma principal y suite de aplicaciones (reemplaza a *NovaStore*). Representa la plataforma SaaS multi-tenant, la gobernanza de accesos, facturación, workspaces y suite de productos de DGTECNOVA SRL.
2. **Research**: Es la aplicación de investigación y análisis estratégico cuantitativo (reemplaza conceptualmente a *NovaInvestigator* / *Investigator*). Vive dentro de NovaResearch y opera sobre diagnósticos matriciales (EFI, EFE, DAFO, CAME, QSPM) y trazabilidad de evidencias.
3. **NovAi**: Es un **producto de IA autónomo e independiente**, dotado de su propio runtime cognitivo, sistema de herramientas, memoria gobernada y adapters. Se integra con NovaResearch y la aplicación Research exclusivamente mediante **API y MCP**.
   - ❌ **Prohibición Absoluta:** **NUNCA** describas, documentes o trates a NovAi como un submódulo hijo o propiedad interna de Research o NovaResearch.
   - NovAi es un producto de IA desacoplado que puede ser consumido por NovaResearch / Research y por otros clientes externos mediante API y MCP.
4. **Preservación de Identidades en Modificaciones:**
   - Al realizar cualquier cambio de código, UI, documentación o prompts, los asistentes de IA **DEBEN** preservar estrictamente la distinción entre:
     - **Identidad de plataforma:** NovaResearch.
     - **Identidad de aplicación:** Research.
     - **Identidad de producto de IA independiente:** NovAi.

---

## 0. Reglas de Oro para Agentes de IA (Zero Confusion Protocol)

Para evitar confusiones, alucinaciones o modificaciones erróneas, **todo agente DEBE seguir estas reglas estrictas**:

1. **Jerarquía de Autoridad en Caso de Conflicto:**
   1. **Seguridad, Multi-tenancy y RLS** (Regla no negociable bajo ninguna circunstancia).
   2. **Documentación Maestra Vigente en [`doc/plans/`](file:///d:/03.%20MATRIZ%20DAFO/doc/plans)**.
   3. **Skills locales** en [`.agents/skills/`](file:///d:/03.%20MATRIZ%20DAFO/.agents/skills) y [`.claude/skills/`](file:///d:/03.%20MATRIZ%20DAFO/.claude/skills).
   4. **Patrones de código existentes** en `src/`.

2. **Resolución rápida de conflictos**:

  | Conflicto                                       | Regla                                                                                                                                                                 |
  | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | Seguridad, permisos, tenant scope o RLS         | Aplica la regla 1                                                                                                                                                     |
  | Documentos maestros con fecha                   | Gana el más reciente por ISO                                                                                                                                          |
  | Documentos maestros sin fecha                   | `docs/plans/`                                                                                                                                                         |
  | Petición del usuario incompatible con una regla | Rechaza solo la parte conflictiva, explica la regla aplicable y ofrece una alternativa compatible; si toca seguridad, permisos, tenant scope o RLS, aplica la regla 1 |

3. **Protocolo Obligatorio de 6 Pasos para Toda Tarea:**
   - **Paso 1 (Contexto & Skills):** Antes de codificar, identifica si existe skill relevante en este orden: 1. `.agents/skills/`, 2. `.agent/skills/`, 3. `.claude/skills/`.
      - Si existe una skill local relevante, **léela y síguela** antes de implementar.
      - Las tres rutas pueden coexistir; usa `.agents/skills/` como ubicación canónica para nuevas skills y trata `.agent/skills/` como compatibilidad solo si el repo ya la usa.
      - Si no existe, usa documentación confiable y, cuando el entorno lo permita, consulta `https://skills.sh/`.
      - Para React/Next.js, permisos/RBAC, frontend, migraciones o refactors, **revisa primero** si ya existe skill específica.  (ej. `supabase`, `stripe-best-practices`, `next-best-practices`, `tailwind-v4-shadcn`, `react-hook-form`, `zod`) y lee el plan maestro relevante en `doc/plans/`.
      - Only create a new plan if no existing doc covers the request.
   - **Paso 2 (Capa SODA):** Identifica la capa y feature (`src/features/<modulo>/`). Nunca mezcles lógica de base de datos en vistas o componentes.
   - **Paso 3 (Validación de Límites):** Payloads siempre validados con Zod (`schema.ts`), permisos con `access.ts`, y `tenantId` resuelto desde la sesión del Principal autenticado.
   - **Paso 4 (Disciplina de Alcance):** **Un cambio = un propósito.** No modifiques archivos fuera del alcance solicitado ni hagas refactors masivos no pedidos.
   - **Paso 5 (Validación Local & Sincronización de Dependencias):**
      - Al sincronizar el repositorio o actualizar paquetes, ejecuta `pnpm outdated` y `pnpm update` respetando las versiones del framework bloqueadas (Next.js 16.2.x, React 19.2.x, Tailwind v4).
      - Siempre ejecuta `pnpm check-types` y `pnpm test` (o `npx react-doctor@latest` para UI) antes de hacer push o dar por cerrada la tarea.
   - **Paso 6 (Trazabilidad, Changelog & Sincronización de Documentación):** Registra el cambio en [`CHANGELOG.md`](file:///d:/03.%20MATRIZ%20DAFO/CHANGELOG.md) siguiendo SemVer 2.0.0 y evalúa si [`README.md`](file:///d:/03.%20MATRIZ%20DAFO/README.md) requiere actualización conforme a la **README Synchronization Policy**.

4. **Anti-patrones Prohibidos (Lo que NUNCA debes hacer):**
   - ❌ **NO uses tecnologías inexistentes o eliminadas:** Prohibido importar o referenciar `Prisma`, `NextAuth`, `Pino`, `Upstash Redis`, `Jest` o rutas obsoletas (`docs/`, `src/styles/`).
   - ❌ **NO tomes `tenantId` del body del request:** Siempre debe resolverse de `getCurrentPrincipal()` o `requireAuthenticatedUser()`.
   - ❌ **NO hagas consultas SQL o mutaciones directas desde vistas (`src/views/`) ni layouts:** La UI solo interactúa mediante Route Handlers `/api/*` o Server Actions que delegan en `src/features/<feature>/service.ts`.
   - ❌ **NO uses `console.log` en producción:** Usa el logger estructurado en `src/lib/logger/index.ts`.
   - ❌ **NO hardcodees strings en interfaces:** Usa los catálogos en `src/locales/` (`es`, `en`, `de`, `ko`, `pt`).
   - ❌ **NO crees side-effects financieros en GET handlers o hooks de React:** Facturaciones y pagos requieren transacciones SQL e idempotencia estricta.

---

## Quick Reference

| Aspecto | Valor |
| :--- | :--- |
| **App** | Plataforma SaaS multi-tenant NovaResearch & Aplicación Research ofrecidas por DGTECNOVA SRL |
| **Stack** | Next.js 16.2.11 App Router, React 19.2.4, TypeScript strict 5.9, Tailwind CSS 4 |
| **Base de Datos** | Supabase PostgreSQL, Row Level Security (RLS) nativo, migraciones en `supabase/migrations/` |
| **Package manager** | **pnpm** (Puerto local de desarrollo: `4101` vía `pnpm dev`) |
| **Auth** | Supabase Auth (`@supabase/ssr` + `@supabase/supabase-js`), MFA, cookies seguras en `src/proxy.ts` |
| **Billing & Pagos** | Stripe Billing & Checkout (`stripe: 22.4.0`), planes, entitlements y customer portal |
| **Logging** | Logger central estructurado en `src/lib/logger/index.ts` (JSON con correlationId y sanitización PII) |
| **Rate limiting** | PostgreSQL RPC / memoria en `src/features/billing/rate-limit.ts` y `src/app/api/auth/_lib/rate-limit.ts` (diseño fail-open intencional ante caídas de red) |
| **UI libs** | shadcn/ui (4.13), `@base-ui/react`, Radix UI Slot, TanStack Table, Recharts, Lucide React, Sonner |
| **i18n** | Catálogos en `src/locales/` (`es`, `en`, `de`, `ko`, `pt`), scripts en `scripts/i18n-*.ts` |
| **Deploy** | Vercel en 2 fases: Push a `dev` $\rightarrow$ Preview (`preview.apps.dgtecnova.com`); Push/Merge a `main` $\rightarrow$ Production (`apps.dgtecnova.com`) |
| **Testing** | Node Test Runner vía `tsx` (`pnpm test` → `tsx --test tests/**/*.test.ts`), TestSprite MCP |

---

## 1. Las 5 Capas del Proyecto (SODA)

El código está dividido en las siguientes capas, ordenadas de más general a más específica:

``` text
d:/03. MATRIZ DAFO/
├── .agents/skills/               # Skills operativas para agentes de IA
├── .claude/skills/               # Skills operativas para agentes de IA
├── .continue/skills/           # Skills operativas para agentes de IA
├── doc/plans/                  # Planes maestros, auditorías y especificaciones metodológicas
├── public/docs/                # Documentación de la aplicación (manuales de usuario, guías de configuración)
├── scripts/                    # Scripts de automatización (i18n sync/scan, stop-server)
├── supabase/migrations/        # Migraciones SQL versionadas (YYYY-MM-DDTHH-mm-ss_name.sql)
├── tests/                      # Tests unitarios e integración (tsx --test)
└── src/
    ├── app/                    # Next.js App Router (Rutas de UI y Route Handlers /api)
    │   ├── (blank)/            # Layouts limpios (Auth, Login, Register, Guest)
    │   ├── (pages)/            # Layouts principales de la app con sidebar y navegación
    │   ├── api/                # Route Handlers server-side (/api/admin/*, /api/auth/*, etc.)
    │   ├── globals.css         # Estilos globales y tokens CSS con Tailwind CSS v4
    │   ├── layout.tsx          # Layout principal de la app con sidebar y navegación
    │   ├── page.tsx            # Vista principal de la app
    │   └── (error)/            # Errores
    │       ├── not-found.tsx   # Vista de error 404
    │       ├── global-error.tsx# Vista de error global
    │       └── server-error.tsx# Vista de error del servidor
    ├── views/                  # Vistas y controladores de UI (React Components desacoplados de DB)
    │   ├── apps/               # Vistas de módulos (investigator, billing, access/roles, etc.)
    │   └── pages/              # Vistas generales (auth, user-profile, settings)
    ├── features/               # Módulos de dominio (access, ai, billing, kanban, novai, platform, users, vid)
    │   └── (cada feature: service.ts, repository.ts, schema.ts, access.ts, errors.ts, http.ts)
    ├── lib/                    # Utilidades transversales e infraestructura
    │   ├── investigations/     # Dominio transversal estratégico (service, repository, schema, access)
    │   ├── supabase/           # Clientes Supabase (server.ts, browser.ts, admin.ts, database.types.ts)
    │   ├── auth/               # Identity policy, resolución de principal y MFA
    │   ├── logger/             # Logger central estructurado con sanitización de PII
    │   ├── currency/           # Formateo y utilidades multi-moneda ISO 4217
    │   └── email/              # Integración de emails transaccionales (Resend)
    ├── configs/                # Configuración de navegación, correo, tema y permisos
    └── locales/                # Catálogos i18n (es, en, de, ko, pt)
```

### Reglas de Responsabilidad por Capa:

1. **`src/app` (UI & Routing):**
   - Contiene las rutas (Next.js App Router), páginas, layouts y Route Handlers (`src/app/api/**/route.ts`).
   - Usa Server Components y Route Handlers para delegar lógica a los servicios.
   - **Regla:** Solo maneja el "qué mostrar" y la negociación HTTP. No debe contener lógica de negocio ni acceso directo a DB.

2. **`src/views` (Views / Controllers):**
   - Archivos `*.tsx` dentro de carpetas como `apps/` y `pages/`.
   - Actúan como controladores visuales desacoplados entre la UI y el dominio.
   - **Regla:** Solo llaman a los servicios de dominio vía Server Actions o endpoints `/api/*`. Prohibido importar clientes de Supabase con service role o hacer queries directas.

3. **`src/features` (Features / Modules de Dominio):**
   - Carpeta principal que contiene la lógica de negocio agrupada por módulos (`access`, `billing`, `users`, `vid`, `investigations`, `ai`, `novai`, `platform`).
   - Cada feature contiene de forma estandarizada:
     - **`service.ts`**: Lógica de negocio y orquestación de operaciones.
     - **`repository.ts`**: Consultas y mutaciones a Supabase PostgreSQL.
     - **`schema.ts`**: Validaciones Zod de entrada y salida.
     - **`access.ts`**: Guards, verificación de roles, capacidades y entitlements.
     - **`errors.ts`**: Clases de error específicas del dominio.
     - **`http.ts`**: Parseo de requests, rate limits y serialización de respuestas.
   - **Regla:** Aquí es donde se implementa y protege toda la lógica de negocio.

4. **`src/features/access` y Domain Logic:**
   - Lógica de autorización pura, agnóstica al framework.
   - Contiene el **Capability Manifest** (`src/features/access/capabilityManifest.ts`), el evaluador de entitlements y las reglas de políticas de identidad.
   - **Regla:** **NUNCA** debe depender de componentes visuales de React.

5. **`src/lib` y `supabase/` (Infrastructure):**
   - Implementación de adaptadores y conexiones a servicios externos:
     - `src/lib/supabase/`: Clientes para browser (`browser.ts`), server (`server.ts`) y backend administrativo (`admin.ts`), más tipos generados (`database.types.ts`).
     - `src/lib/logger/`: Logger estructurado central.
     - `src/lib/currency/`: Utilidades multi-moneda ISO 4217.
     - `supabase/migrations/`: Migraciones SQL versionadas.
   - **Regla:** Contiene la infraestructura técnica y clientes de terceros (Supabase, Stripe, Resend).

### Cómo Decidir Dónde Cambiar

**Escenario A: Quiero cambiar cómo se procesa un pago o suscripción.**

1. Identificar feature: `src/features/billing`.
2. Validar payload: `src/features/billing/schema.ts`.
3. Validar lógica y llamadas a Stripe: `src/features/billing/service.ts`.
4. Persistir cambios en Supabase: `src/features/billing/repository.ts`.
5. Exponer o invocar endpoint: `src/app/api/billing/*`.
6. Actualizar la vista de usuario: `src/views/apps/platform/platform-billing/index.tsx`.

**Escenario B: Quiero agregar una nueva ruta / página.**

1. Crear ruta en `src/app/(pages)/apps/tu-ruta/page.tsx`.
2. Crear vista en `src/views/apps/tu-ruta/index.tsx`.
3. Usar Server Actions o Route Handlers para delegar en `src/features/<feature>/service.ts`.

---

## 2. Architecture (non-obvious)

- **Middleware / Proxy**: `src/proxy.ts` (exporta `proxy` + `config`). Se ejecuta antes de cada request, refresca la sesión de Supabase SSR (`@supabase/ssr`) y hace redirección optimista. **No es la autoridad final:** la seguridad real se revalida siempre server-side en cada Route Handler / Service.
- **Multi-tenancy & RLS**: La base de datos aplica Row Level Security (RLS) nativo. Las tablas tenant-scoped filtran por `tenant_id` y `auth.uid()` con la función `public.has_capability(auth.uid(), tenant_id, ...)`.
- **Permissions & Capabilities**: Sistema basado en el Capability Manifest canónico en `src/features/access/capabilityManifest.ts`. Cada acción declara su recurso, acción y descripción.
- **Supabase Migrations**: Ubicadas en `supabase/migrations/` con formato ISO timestamp `YYYY-MM-DDTHH-mm-ss_name.sql`.

---

## 3. Permissions & Security (repo-specific)

- **Validación en 3 Capas Obligatoria:**
  1. *Proxy / Optimistic Guard* (`src/proxy.ts`): Refresco de cookies y redirección temprana.
  2. *API Route Handler / Domain Gates*: `requireAuthenticatedUser()`, `requireCapability()` y verificación de entitlements en el Service.
  3. *Postgres RLS*: Políticas de seguridad en base de datos.
- **Autorización Híbrida 3D (RBAC + ReBAC + Entitlements):**
  1. *RBAC*: Roles y capacidades funcionales asignadas en el tenant.
  2. *ReBAC*: Pertenencia a recursos concretos (Workspace / Team / Investigación).
  3. *ABAC / Entitlements*: Políticas comerciales y límites del plan contratado por el tenant.
- **Toda acción nueva** debe declararse en `CAPABILITY_MANIFEST` (`src/features/access/capabilityManifest.ts`) y sincronizarse con la migración SQL correspondiente.
- **No usar nombres de rol estáticos como frontera principal** de autorización. Las APIs se protegen por **permiso funcional (capability)**, no por rol jerárquico.
- **Prohibido** reutilizar endpoints administrativos para flujos self-service.
- Cross-tenant writes requieren confirmación administrativa adicional y auditoría estricta con `source: "admin"`.

---

## 4. Multi-tenancy Rules

- Toda query a tablas tenant-scoped debe filtrarse por `tenantId` vía RLS y servicio de dominio. Nunca confiar en filtros frontend.
- **El `tenantId` nunca se toma del body del request.** Se deriva de la membresía activa del Principal autenticado en sesión (`getCurrentPrincipal()`).
- Prohibido queries cross-tenant sin permiso funcional explícito + auditoría.
- Seeds, fixtures y tests: siempre declarar `tenantId`/`organizationId` explícito.
- IDs autogenerados (UUID / CUID) evitan enumeración entre tenants.

---

## 5. SaaS / ERP Domain Rules

Esta aplicación es un **SaaS multi-tenant con módulos de ERP y Análisis Estratégico**. Las siguientes reglas son **obligatorias** para cualquier cambio que toque lógica de negocio, datos persistentes u operaciones financieras.

### 5.1 Multi-tenancy

- Toda query a tablas tenant-scoped debe filtrarse por `tenantId` vía RLS, dominio o ambos. Nunca confíes solo en filtros del frontend.
- Prohibido queries cross-tenant fuera de operaciones administrativas explícitamente autorizadas y auditadas con `source: "admin"`.
- En seeds, fixtures y tests, siempre declara `tenantId` explícito; nunca uses valores por defecto silenciosos.
- Para operaciones batch o jobs, valida que el scope de tenant esté propagado en cada paso del pipeline.

### 5.2 Auditoría y trazabilidad

- Operaciones sensibles (crear, editar, anular, aprobar, pagar, cerrar período, modificar permisos) deben generar registro de auditoría con:
  - `userId`, `tenantId`, `timestamp`, `action`, `entityType`, `entityId`, `before`/`after` cuando aplique.
- **Nunca elimines registros de auditoría**; son inmutables y append-only.
- Para cambios masivos automatizados (migraciones de datos, jobs), registra el origen del cambio (`source: "system" | "migration" | "user"`).
- Los logs de auditoría son distintos de los logs operacionales (sección 15); no los mezcles.

### 5.3 Idempotencia y operaciones financieras

- Endpoints que **crean documentos con efectos económicos** (facturas, pagos, suscripciones, checkouts) deben aceptar `idempotencyKey` o equivalente para evitar duplicados por reintentos de red.
- **Prohibido** hacer side-effects financieros dentro de hooks de React, server components o GET handlers.
- Operaciones que afectan saldos, planes o inventario deben ejecutarse dentro de **transacciones SQL** con aislamiento explícito.
- Para reversiones, **emite un documento inverso** (nota de crédito, asiento de contrapartida); no edites ni elimines el original.

### 5.4 Soft-delete y ciclo de vida

- Datos transaccionales (facturas, pagos, movimientos, investigaciones) **nunca se borran físicamente**; usa estados (`active`, `voided`, `archived`).
- Datos maestros (organizaciones, perfiles, miembros) usan soft-delete (`deletedAt`) y deben filtrarse por defecto en queries.
- Prohibido queries que ignoren `deletedAt` sin justificación explícita en comentario.

### 5.5 Períodos contables y fechas de negocio

- Operaciones que afectan contabilidad o períodos deben validar que el período no esté cerrado antes de persistir.
- Distingue claramente entre:
  - `createdAt` (timestamp del sistema)
  - `documentDate` (fecha legal del documento)
  - `accountingDate` (fecha de imputación contable)
- Cierres de período, mes y año son operaciones **transaccionales, idempotentes y auditadas**.

### 5.6 Numeración legal y secuencias

- Folios, números de factura y correlativos fiscales deben ser **secuenciales, sin saltos visibles** y generados por una fuente única (DB sequence o tabla de contadores con lock transaccional).
- **Prohibido** generar números legales en el cliente o en código no transaccional.
- En reversiones o anulaciones, no reutilices el número; emite uno nuevo.

### 5.7 Concurrencia y bloqueo optimista

- Para entidades editables por múltiples usuarios (investigaciones, configuraciones, roles), usa **optimistic locking** vía `version` o `updatedAt` en el `WHERE` del UPDATE.
- En conflictos, devuelve error explícito (`409 Conflict`) al cliente con información para resolver; no sobrescribas silenciosamente.

### 5.8 Jobs, colas y procesos en background

- Tareas pesadas (envío de emails, generación de PDFs masivos, reportes, sincronización fiscal) deben ejecutarse en procesos asíncronos desacoplados del request del usuario.
- Todos los jobs deben ser **idempotentes** y **reintentables** con backoff.
- Registra el `tenantId` en cada job; nunca proceses jobs sin contexto de tenant.

### 5.9 Importaciones, exportaciones y bulk operations

- Importaciones masivas (Excel/CSV) deben validarse en **dos fases**: parseo + dry-run, y luego persistencia transaccional.
- Reporta errores por fila con contexto suficiente para que el usuario corrija sin reintentar todo.
- Exportaciones grandes (>5k filas): streaming o jobs en background, no respuestas síncronas.
- Respeta límites de tenant (cuotas, planes) antes de ejecutar bulk operations.

### 5.10 Configuración por tenant y feature flags

- Configuración (impuestos, monedas habilitadas, módulos activos, integraciones) debe ser **por tenant**.
- Feature flags y entitlements por tenant/plan deben validarse en **API y dominio**, no solo en UI.
- Cambios de configuración con efecto retroactivo requieren auditoría reforzada y versionado.

### 5.11 Integraciones fiscales, bancarias y Stripe

- Llamadas a Stripe, bancos o entes fiscales: **siempre** con timeout, retry con backoff y circuit breaker cuando aplique.
- Estados de documentos y checkouts deben modelarse como máquina de estados explícita (`draft → pending → active | canceled`).
- **Nunca** asumas éxito por status HTTP; valida el payload de respuesta.
- Guarda request y response crudos (sin PII ni claves secretas) para trazabilidad.

### 5.12 Reportes y consistencia eventual

- Reportes financieros oficiales deben generarse desde la fuente transaccional en PostgreSQL.
- Para dashboards en tiempo real, prefiere agregaciones precalculadas con invalidación explícita.

### 5.13 Onboarding, planes, límites y NovAi Copilot

- **Titularidad del Tenant:** El plan, suscripción, Customer de Stripe y límites pertenecen al `tenant_id` (organización), no al usuario individual.
- **Frontera de Guest Trial:** Permite explorar y solicitar trial sin cuenta Supabase permanente, pero exige email confirmado para checkout real y persistencia.
- **Gobernanza de IA (NovAi):** Doble cuota de consultas:
  - Cuota mensual del tenant (`limits.ai_queries_monthly`) descontada vía RPC `consume_billing_entitlement_usage`.
  - Política diaria en ventana móvil de 24h (`limits.ai_queries_daily`).
  - Restricción de chat libre (`ai.free_chat`) solo para planes Pro/Enterprise/Lifetime; planes básicos usan catálogo de prompts predefinidos.
- Al alcanzar límites: responder con código de error estructurado (`quota_exceeded`) y degradar con mensaje claro.

---

## 6. Secrets and Sensitive Data

- **Nunca** incluyas valores reales de `.env`, claves API, tokens, DSNs, service role keys, contraseñas o cookies en código, comentarios, PRs, logs o respuestas.
- Si detectas un secreto hardcodeado existente, repórtalo y propón rotación de inmediato.
- Para variables nuevas, documenta en `.env.example` con valor placeholder genérico.
- **PII** de clientes (emails, nombres, documentos de identidad, teléfonos) no debe aparecer en logs ni tests salvo datos sintéticos deterministas.

---

## 7. Architecture and Safety

- En permisos, navegación y autorización, valida las **tres capas** (Proxy/API Handler → Domain Gates → UI Filtering).
- En flujos de bootstrap, setup, migraciones y operaciones sensibles, favorece:
  - **Idempotencia**
  - **Orden transaccional claro**
  - **Trazabilidad** en auditoría
- Respeta el diseño maestro tenant-scoped y las políticas de RLS en base de datos.

---

## 8. Coding Conventions

### 8.1 Estilo general

- Usa comentarios solo cuando expliquen el **porqué** de decisiones no obvias.
- En el dominio, usa invariants/assertions para estados imposibles.
- Para estados posibles o recuperables, usa errores estructurados o clases en `errors.ts`.
- Sin abstracciones prematuras: tres líneas similares son preferibles a una abstracción anticipada incorrecta.
- Valida en los límites del sistema con Zod schemas (`schema.ts`).
- Corrige la causa raíz dentro del alcance solicitado.

### 8.2 Determinism

- Fija versiones exactas en dependencias críticas (auth, Supabase, Stripe, Next.js).
- No introduzcas `Date.now()`, `Math.random()` ni `crypto.randomUUID()` en lógica de dominio sin inyección de dependencia testeable.
- Seeds, migraciones y fixtures deben usar valores determinísticos.

### 8.3 Error Handling

- En límites del sistema (API handlers, integraciones externas, jobs), maneja errores explícitamente y devuelve respuestas estructuradas (`{ error: { code, message, details } }`).
- **Prohibido** `catch { }` vacío sin comentario justificando por qué.
- Para integraciones externas (Stripe, Resend), implementa timeouts explícitos y retries con backoff.

### 8.4 Scope Discipline

- **No modifiques archivos fuera del alcance solicitado**, aunque detectes mejoras obvias.
- Si encuentras un bug fuera de alcance, repórtalo pero no lo mezcles en el mismo cambio.
- **Un cambio = un propósito.**

---

## 9. UI, Design Tokens, A11y e i18n

### 9.1 Design Tokens (Tailwind CSS v4)

Antes de implementar UI, revisa `src/app/globals.css` y verifica tokens disponibles (`--color-*`, `--radius-*`, `--font-*`):

- **No hardcodees** valores hexadecimales o medidas mágicas que ya existan como token.
- Conserva el lenguaje visual existente salvo rediseño explícito.
- Reutiliza componentes globales de shadcn/ui (`src/components/ui/*` y `src/ai-components/*`) antes de crear nuevos.

### 9.2 Accessibility (a11y)

- Componentes interactivos: roles ARIA correctos, foco visible, soporte de teclado.
- Imágenes, iconos significativos y botones-icono requieren `alt` o `aria-label`.
- Contraste mínimo **WCAG AA** para texto sobre fondos.
- Formularios: `label` asociados, errores vinculados por `aria-describedby`.

### 9.3 Internationalization (i18n)

- Strings visibles para usuario **no deben hardcodearse**; usa los catálogos en `src/locales/` (`es.ts`, `en.ts`, `de.ts`, `ko.ts`, `pt.ts`).
- Mensajes de error de API expuestos al cliente: usar claves de traducción estructuradas.
- Utiliza las herramientas de CLI:
  - `pnpm i18n:check`: Comprueba claves huérfanas y consistencia.
  - `pnpm i18n:scan`: Audita vistas en busca de textos no traducidos.
  - `pnpm i18n:sync`: Sincroniza traducciones hacia los idiomas secundarios.

---

## 10. Currency and Locale

- Antes de tocar monedas, fechas/hora o localización, revisa:
  - `src/lib/currency/` (utilidades de formateo y catálogo ISO 4217).
  - `src/locales/` (traducciones y formatos).
- **Servidor / APIs / exportaciones imprimibles**: emite importes y fechas como valores normalizados según el estándar; el formateo visual con locale se aplica solo en la capa de presentación.
- Facturación electrónica y Stripe: procesar importes en enteros (centavos) o decimales estandarizados según la moneda.

---

## 11. Database and Migrations (Supabase SQL)

- Cambios al esquema → migraciones SQL versionadas en `supabase/migrations/`.
- Convención de nombres: `YYYY-MM-DDTHH-mm-ss_descripcion_breve.sql`.
- Toda tabla nueva debe incluir `enable row level security` y sus políticas RLS asociadas.
- Funciones PostgreSQL deben incluir `security definer` y `set search_path = pg_catalog, public`.
- Evita queries con `select *`; especifica columnas exactas para evitar overfetching.

---

## 12. APIs and Integrations

- Valida endpoints directamente, incluyendo **permisos, tenant scope y RLS**.
- Asegúrate de no romper contratos existentes de API.
- Integraciones externas (Stripe, Resend): maneja errores y respuestas inesperadas con timeouts y retries controlados.

---

## 13. Testing

- **Suite de Pruebas Unitarias e Integración**: Node.js Test Runner vía `tsx` (`pnpm test` ejecuta `tsx --test tests/**/*.test.ts`).
- **Pruebas en modo observador**: `pnpm test:watch`.
- **TestSprite MCP**: Generación de planes de prueba y validación automatizada (`.testsprite`, `testsprite_tests`).
- **Playwright MCP**: Pruebas end-to-end sobre puerto `4101`.
- **Frontend / UI Testing**:
  - Inicia el servidor de desarrollo y verifica flujos en navegador antes de dar la UI por completada.
  - Comprueba **golden path + edge cases**.
  - Formularios y modales: confirma **render + persistencia real**.
- **React Health Check**:
  - Tras cambios en componentes React/Next.js/UI, ejecuta `npx react-doctor@latest`.
  - Corrige cualquier error reportado antes de cerrar la tarea.

---

## 14. Low-Resource Performance & Perceived Speed

Los usuarios objetivo del ERP incluyen PCs de oficina antiguas, notebooks de gama baja y conexiones inestables. **La percepción de rapidez y la eficiencia de recursos son críticas.**

### 14.1 Animaciones y transiciones

- **Prohibido** animaciones puramente decorativas en flujos administrativos (CRUD, listados, formularios).
- Animaciones permitidas solo cuando comuniquen estado funcional (skeleton/loading, checkmark breve, apertura de modal).
- Duración máxima: **200ms** para microinteracciones, **300ms** para paneles.
- Usa `transform` y `opacity` exclusivamente; nunca animes propiedades que provoquen reflow (`width`, `height`, `margin`).
- Respeta `prefers-reduced-motion`.

### 14.2 Percepción de rapidez

- **Skeleton screens > spinners** para cargas mayores a 300ms.
- Renderiza la estructura de la página inmediatamente y carga datos en paralelo.
- Feedback de acción inmediata (<100ms) en la interfaz.

### 14.3 Listas y tablas grandes (ERP)

- Listados con **>50 filas visibles**: implementar virtualización (`@tanstack/react-table`).
- Paginación server-side por defecto en listados de documentos, clientes y transacciones.
- Búsquedas con debounce mínimo de **300ms** y ejecución server-side.

### 14.4 Bundle size y JavaScript en cliente

- Justifica cualquier import que añada >30KB al bundle inicial.
- Prefiere **Server Components** sobre Client Components. `"use client"` solo donde se requiera estado interactivo o hooks del browser.
- Carga diferida (`dynamic()`) para módulos pesados (Recharts, exportadores PDF, editores).
- Prohibido: `moment.js` o `lodash` completo.

### 14.5 Imágenes y assets

- Imágenes vía `next/image` con dimensiones explícitas y formatos optimizados (AVIF/WebP).
- Prohibido usar etiquetas `<img>` nativas sin optimizar en vistas del sistema.

### 14.6 Reflows, repaints y CPU

- Evita efectos visuales pesados que disparen layout en cada frame (sombras animadas, blurs pesados).
- `backdrop-filter` solo cuando aporte valor funcional explícito.

### 14.7 Network y caching cliente

- Cachea responses estables con invalidación explícita.
- Prefetch de rutas solo en hover sostenido (>150ms).

### 14.8 Estado global y re-renders

- Formularios: usa `react-hook-form` con controladores puntuales para evitar renders masivos.

### 14.9 Performance Budgets (bloqueantes en vistas críticas)

- **LCP < 2.5s** en conexión 4G simulada.
- **TBT < 300ms** en CPU throttled.
- **CLS < 0.1**.
- **TTFB < 500ms** en Server Components.

### 14.10 Anti-patrones prohibidos

- ❌ Spinners de pantalla completa en navegación entre rutas internas.
- ❌ Modales con animación de entrada >300ms.
- ❌ Confetti o animaciones decorativas tras guardar un documento.
- ❌ Auto-refresh de listados sin acción explícita del usuario.

---

## 15. Logging and Observability

- Usa el logger central en `src/lib/logger/index.ts`. **Prohibido** `console.log` en código de producción.
- Niveles: `error` (fallos accionables), `warn` (degradaciones), `info` (eventos de negocio relevantes).
- Nunca loguees payloads completos sin sanitizar PII, passwords, tokens o tarjetas de crédito.
- Incluye `correlationId` para trazabilidad transversal en flujos críticos.

---

## 16. Dependencies and Supply Chain

- Antes de añadir una dependencia, verifica mantenimiento activo, licencia compatible y ausencia de alternativas ya existentes en `package.json` o `src/lib/*`.
- Ejecuta `pnpm check-types` y `pnpm audit` antes de cerrar cambios de dependencias.

---

## 17. Planning and Execution

- Empieza por el contexto más cercano al problema: archivo, símbolo, ruta, test o comportamiento fallando.
- Antes del primer cambio, formula una hipótesis local falsable y busca la comprobación más directa.
- Secuencia de validación:
  1. Test específico del comportamiento cambiado (`pnpm test`)
  2. Typecheck y Linting (`pnpm check-types`, `pnpm lint`)
  3. Verificación manual o E2E si aplica
- Si la hipótesis se invalida tras 2 intentos, detente y reformula.

---

## 18. Git Workflow and CI/CD

- Ramas de features actualizadas con `main`.
- Conventional Commits estrictos.
- No mergees cambios que no pasen `pnpm check-types` y `pnpm test` en local.
- No ejecutes acciones con github que el usuario no solicitó (push, merge, restore, etc.)

---

## 19. AI-Assisted Change Traceability

- En PRs generados con asistencia de IA:
  - Resumen claro del objetivo y cambios realizados.
  - Lista de archivos modificados y motivo.
  - Validaciones locales ejecutadas.
- Marca el PR con etiqueta `ai-assisted`.
- Commits atómicos: un commit = un cambio lógico.

---

## 20. Naming Conventions

| Tipo | Convención | Ejemplo |
| :--- | :--- | :--- |
| Componentes React | PascalCase | `UserProfile.tsx` |
| Utilidades / funciones | camelCase | `formatCurrency.ts` |
| Route Handlers / API | kebab-case | `user-profile/route.ts` |
| Tests | `<archivo>.test.<ext>` | `roles-permissions.test.ts` |
| Migraciones Supabase | ISO date + descripción | `2026-08-21T01-26-50_rbac_scope.sql` |

---

## 21. Knowledge Sharing

- Documentar decisiones arquitectónicas y nuevos patrones reutilizables en `doc/plans/`.
- Mantener la documentación técnica sincronizada con el código fuente real.

---

## 22. Security Policy

- Si detectas una vulnerabilidad de seguridad crítica, no la reportes en un commit público.
- Seguir la política documentada en `SECURITY.MD`.

---

## 23. Versioning & Changelog (SemVer 2.0.0)

### 23.1 Esquema de Versionado Semántico

- **MAJOR (vX.0.0):** Cambios incompatibles o disruptivos (Breaking Changes).
- **MINOR (vX.Y.0):** Nuevas funcionalidades compatibles hacia atrás.
- **PATCH (vX.Y.Z):** Correcciones de bugs, optimizaciones y parches de seguridad.

### 23.2 Convención de Commits y Relación con SemVer

| Tipo de Commit | Descripción | Impacto SemVer |
| :--- | :--- | :---: |
| `feat:` | Nueva funcionalidad | **MINOR** |
| `fix:` | Corrección de bug | **PATCH** |
| `perf:` | Mejora de rendimiento | **PATCH** |
| `security:` | Parche o endurecimiento de seguridad/RLS | **PATCH** |
| `refactor:` | Refactorización de código sin cambio funcional | **PATCH / Ninguno** |
| `style:`, `docs:`, `test:`, `chore:`, `build:`, `ci:` | Estilos, docs, tests, dependencias | **Ninguno** |
| `feat!:`, `fix!:`, o `BREAKING CHANGE:` | Cambio incompatible / disruptivo | **MAJOR** |

### 23.3 Estándar de `CHANGELOG.md` (Keep a Changelog)

Todo cambio relevante debe registrarse de inmediato en [`CHANGELOG.md`](file:///d:/03.%20MATRIZ%20DAFO/CHANGELOG.md) bajo el encabezado de versión `## vX.Y.Z (YYYY-MM-DD)` con secciones permitidas en orden:

- `### Added`, `### Fixed`, `### Updated`, `### Removed`, `### Deprecated`, `### Security`.

---

## 24. MCP Tools Disponibles

Servidores MCP configurados en el proyecto ([`.mcp.json`](file:///d:/03.%20MATRIZ%20DAFO/.mcp.json)):

- **`supabase`**: MCP remoto para inspección de esquemas, consultas SQL, asesoramiento de índices y migraciones de base de datos.
- **`TestSprite`**: MCP para generación automática de planes de prueba, PRDs estandarizados y ejecución de pruebas de integración.
- **`stripe`**: MCP para consulta de APIs de Stripe, validación de checkouts, productos y webhooks.

---

## README Synchronization Policy

Esta sección establece la política permanente y obligatoria de gobernanza y sincronización de documentación técnica para todo agente de IA o desarrollador que opere en este repositorio.

### 1. Regla Principal (Living Document)
> **`README.md` is a living document and MUST remain synchronized with the actual implementation of the repository.**

El archivo [`README.md`](file:///d:/03.%20MATRIZ%20DAFO/README.md) es la carta de presentación técnica y el manual arquitectónico primario del sistema. Debe reflejar fielmente las capacidades, herramientas, comandos y modelos efectivamente implementados en el código.

### 2. Obligación de Evaluación por Cambio Significativo
Cada vez que un cambio de código modifique de forma relevante cualquiera de las siguientes áreas:
- **Arquitectura, capas y módulos** (`src/app/`, `src/views/`, `src/features/`, `src/lib/`, `supabase/`).
- **NovAi Cognitive Runtime**: Runtime del agente, model router, context manager, compaction engine, memory engine, token budget, cuotas o telemetry.
- **Catálogo de Tools**: Adición, modificación, renombrado o eliminación de herramientas en `src/features/novai/tools/`.
- **Flujos de Investigación & Evidencia**: Contexto de investigación, gestión de documentos, repositorios de evidencia (`novai_evidence`, `novai_citations`) o estados epistémicos.
- **Metodologías & Análisis Estratégico**: Motores de cálculo de matrices (EFI, EFE, DAFO/SWOT, CAME, QSPM), validaciones o reglas de auditoría.
- **Seguridad & Autorización**: Modelos RBAC, ReBAC, catálogo de capacidades (`CAPABILITY_MANIFEST`), RLS en PostgreSQL o fronteras de autorización server-side.
- **Billing & Entitlements**: Planes comerciales, Stripe Checkout, Customer Portal, webhooks, idempotencia o cuotas de IA.
- **Proveedores de IA & Routing**: Modelos soportados, cascada de proveedores (OpenRouter, OpenCode Zen, Gemini) o directivas de privacidad.
- **Configuración de Entorno**: Variables de entorno nuevas o modificadas en [`.env.example`](file:///d:/03.%20MATRIZ%20DAFO/.env.example).
- **Comandos & Tooling**: Scripts de desarrollo, testing, build, linting o internacionalización en [`package.json`](file:///d:/03.%20MATRIZ%20DAFO/package.json).
- **Testing & Cobertura**: Nuevas suites de pruebas automatizadas o cambios en el harness de testing.
- **Internacionalización (i18n)**: Idiomas soportados o flujos de sincronización de catálogos.

el agente **DEBE evaluar explícitamente si `README.md` requiere actualización**.

### 3. Regla de Consistencia (Pregunta Interna Obligatoria)
Antes de finalizar cualquier tarea que produzca un cambio significativo, el agente debe responder internamente:
> *"Does this change make any statement in README.md inaccurate, incomplete or misleading?"*

Si la respuesta es **SÍ**, el agente **DEBE actualizar `README.md` en la misma tarea y commit lógico**.

### 4. Regla de No Actualización Innecesaria
No es obligatorio modificar `README.md` para cambios internos o parches rutinarios que no alteren:
- Comportamientos o capacidades documentadas.
- Arquitectura o contratos de APIs públicas.
- Herramientas registradas o sus propósitos.
- Comandos de desarrollo, build o testing.
- Requisitos, dependencias principales o seguridad.
- Esquemas de datos relevantes para usuarios o desarrolladores.

Esto previene ruido documental y cambios triviales innecesarios en el historial de control de versiones.

### 5. Fuente Primaria de Verdad (Source of Truth)
La implementación real en código fuente es siempre la **fuente primaria de verdad**. Ante cualquier contradicción entre:
`Código implementado` $\gg$ `doc/plans/` $\gg$ `AGENTS.md` $\gg$ `README.md` $\gg$ `Comentarios`,
el código implementado tiene prioridad absoluta para describir el estado actual. Sin embargo, las contradicciones detectadas deben corregirse de inmediato en la documentación correspondiente.

### 6. Prohibiciones Estrictas de Documentación
El agente tiene **estrictamente prohibido**:
- ❌ Afirmar funcionalidades no implementadas o meramente planificadas.
- ❌ Documentar herramientas o endpoints inexistentes.
- ❌ Inventar comandos, scripts o parámetros no presentes en `package.json`.
- ❌ Inventar variables de entorno no registradas en `.env.example`.
- ❌ Inventar integraciones con servicios externos no verificados en el código.
- ❌ Declarar una funcionalidad experimental o inestable como lista para producción.

### 7. Atomicidad de Cambios y PRs
Cuando un cambio de código significativo exija actualizar `README.md`, la modificación de la documentación debe formar parte del **mismo cambio lógico y PR**, asegurando que el repositorio nunca quede desincronizado.

### 8. Separación de Responsabilidades Documentales
- [`README.md`](file:///d:/03.%20MATRIZ%20DAFO/README.md): **Qué es el proyecto, cómo está construido y cómo funciona** (documentación técnica de producto, arquitectura y uso).
- [`AGENTS.md`](file:///d:/03.%20MATRIZ%20DAFO/AGENTS.md): **Cómo debe operar un agente de IA dentro del repositorio** (reglas de conducta, seguridad, límites y protocolos).

---

## Anexo A: Checklist antes de cerrar un PR

### General

- [ ] Revisé skills locales (`.agents/skills/`) y documentación maestra aplicable en `doc/plans/`
- [ ] El cambio tiene alcance único, sin refactors no solicitados
- [ ] Etiqueté `ai-assisted` si aplica

### Seguridad y SaaS/ERP

- [ ] Respeté tenant-scoped y RLS en Supabase; el `tenantId` proviene del Principal en sesión
- [ ] Operaciones financieras o sensibles son idempotentes, transaccionales y auditadas
- [ ] Nuevas capacidades registradas en `src/features/access/capabilityManifest.ts` y migraciones SQL
- [ ] No introduje secretos, PII ni `console.log`

### UI, i18n y Performance

- [ ] Usé tokens de diseño en `src/app/globals.css` (Tailwind v4)
- [ ] Sin animaciones decorativas; respeté `prefers-reduced-motion`
- [ ] Sin cadenas visibles hardcodeadas; utilicé `src/locales/`
- [ ] Tablas grandes virtualizadas o paginadas server-side

### Validación & Documentación

- [ ] `pnpm check-types` pasa sin errores
- [ ] `pnpm test` pasa en verde (todas las suites)
- [ ] `npx react-doctor@latest` ejecutado si se modificó UI
- [ ] `CHANGELOG.md` actualizado según SemVer 2.0.0
- [ ] `README.md` evaluado y sincronizado conforme a la **README Synchronization Policy** si hubo cambios significativos
