# Project Guidelines

> Documento maestro de instrucciones para asistentes de IA (GitHub Copilot, Claude, agentes autónomos) que trabajan en este repositorio.
> Mantener **accionable, conciso y libre de contenido motivacional**. Para guías de contribución humana, ver `CONTRIBUTING.md`.

Guía rápida:

| Tipo de cambio                             | Leer primero                      |
| ------------------------------------------ | --------------------------------- |
| UI pura                                    | `9` y `14`                        |
| API o base de datos                        | `5.x` relevantes, `8.3` y `11`    |
| Permisos, roles, tenant scope o RLS        | `regla 1`, `4`, `5.1`, `7` y `18` |
| Finanzas o documentos con efecto económico | `5.2` a `5.7`, `15` y `18`        |
| Integraciones externas                     | `12` y `15`                       |

---

## 0. Priority Order (resolución de conflictos)

Si dos reglas dan instrucciones opuestas para la misma acción concreta, la regla con mayor prioridad es la que aparece primero en esta lista:

1. **Seguridad, permisos, tenant scope y RLS**
2. **Documentación maestra vigente en `docs/plans/` y `docs/07-ANALISIS/`**
3. **Skills locales** en `.agents/skills/`, `.agent/skills/`, `.claude/skills/`
4. **Patrones existentes** del repo (`src/`, `prisma/`, `docs/`)
5. **Reglas de este documento**
6. **Preferencias estilísticas**

Resolución rápida:

| Conflicto                                       | Regla                                                                                                                                                                 |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Seguridad, permisos, tenant scope o RLS         | Aplica la regla 1                                                                                                                                                     |
| Documentos maestros con fecha                   | Gana el más reciente por ISO                                                                                                                                          |
| Documentos maestros sin fecha                   | `docs/plans/` > `docs/07-ANALISIS/` > `docs/05-FASES/` > `docs/01-GUIAS/`                                                                                             |
| Petición del usuario incompatible con una regla | Rechaza solo la parte conflictiva, explica la regla aplicable y ofrece una alternativa compatible; si toca seguridad, permisos, tenant scope o RLS, aplica la regla 1 |

---

## 1. Project Context

- Aplicación: **SaaS multi-tenant con módulos de ERP** (facturación, inventario, contabilidad, CRM, RRHH, etc.).
- Stack: Next.js 14 App Router, TypeScript, Prisma v6, PostgreSQL (Neon), Tailwind CSS, Vercel.
- Prioriza patrones existentes antes de introducir nuevas estructuras.
- Prefiere cambios pequeños, locales y consistentes con el estilo presente en `src/`, `prisma/` y `docs/`.

---

## 2. Skill Discovery Protocol

Antes de cualquier tarea de código, busca una skill relevante en este orden:

1. `.agents/skills/`
2. `.agent/skills/`
3. `.claude/skills/`

- Si existe una skill local relevante, **léela y síguela** antes de implementar.
- Las tres rutas pueden coexistir; usa `.agents/skills/` como ubicación canónica para nuevas skills y trata `.agent/skills/` como compatibilidad solo si el repo ya la usa.
- Si no existe, usa documentación confiable y, cuando el entorno lo permita, consulta `https://skills.sh/`.
- Para React/Next.js, permisos/RBAC, frontend, migraciones o refactors, **revisa primero** si ya existe skill específica.

---

## 3. Documentation Review (obligatoria antes de planificar)

Revisa la documentación maestra en este orden:

1. `docs/plans/`
2. `docs/07-ANALISIS/`
3. `docs/05-FASES/`
4. `docs/01-GUIAS/`

Reglas:

- **Solo crea un plan nuevo** si ningún documento existente cubre todos los aspectos.
- Cuando exista documentación relevante, **refiérela y extiéndela** en lugar de redefinirla.
- Toda modificación propuesta debe respetar la documentación maestra antes de cerrar el trabajo.

### Fuentes maestras obligatorias para permisos/RLS/tenant scope

- `docs/07-ANALISIS/PLAN_MAESTRO_PERMISOS_2026-03-03.md`
- `docs/plans/2026-05-02-tenant-scoped-authorization-rls-master-design.md` ← **fuente maestra obligatoria**
- `docs/plans/2026-05-08-system-permissions-tenant-scope-remediation-master-design.md`

Si dos documentos maestros se contradicen, aplica la prioridad de la sección 0 y anota el conflicto en el PR.

Si un cambio entra en conflicto con el diseño maestro tenant-scoped/RLS, no lo implementes tal cual: ajústalo o explicita en el PR la regla violada, una alternativa segura y el documento que habría que extender antes de continuar.

---

## 4. Security and Permissions

- Para cambios que toquen permisos, roles, sesiones, APIs, sidebar, tabs, self-service, ownership, tenant scope, provider/customer relationship o RLS, valida explícitamente que:
  - El diseño respeta el modelo **tenant-scoped/RLS**.
  - **No** introduce filtros UI parciales como mecanismo de seguridad.
  - **No** usa `roleHierarchy` como frontera principal de autorización.
  - **No** reutiliza endpoints administrativos para flujos self-service.
- Toda acción nueva debe declararse en el array `CAPABILITY_MANIFEST` de `src/features/access/capabilityManifest.ts`; si el cambio crea una acción nueva, agrega ahí una nueva `CapabilityManifestEntry` siguiendo la forma existente del archivo, no en un manifiesto paralelo, y la actualización entra bajo la excepción de alcance descrita en 8.4.
- Las APIs deben protegerse por **permisos funcionales**, no por rol jerárquico.
- Valida en múltiples capas: **API + dominio + UI filtrada**. Ocultar en UI nunca es suficiente.
- En flujos administrativos que afecten múltiples tenants, exige una confirmación administrativa adicional o una aprobación explícita antes de ejecutar escrituras; para lecturas cruzadas, exige verificación reforzada.

---

## 5. SaaS / ERP Domain Rules

Esta aplicación es un **SaaS multi-tenant con módulos de ERP**. Las siguientes reglas son **obligatorias** para cualquier cambio que toque lógica de negocio, datos persistentes u operaciones financieras.

- Aplica solo las subsecciones 5.x relevantes al cambio; si el cambio no toca datos persistentes, permisos, finanzas o integraciones externas, no arrastres todo el bloque.

### 5.1 Multi-tenancy

- **Toda query** a tablas tenant-scoped debe filtrarse por `tenantId` (o equivalente) vía RLS, dominio o ambos. Nunca confíes solo en filtros del frontend.
- **Prohibido** queries cross-tenant fuera de operaciones administrativas explícitamente autorizadas y auditadas.
- **Prohibido** queries cross-tenant fuera de operaciones administrativas autorizadas por un permiso funcional cross-tenant declarado en el manifiesto de permisos y registradas en auditoría con `source: "admin"`.
- IDs autogenerados (UUID, CUID) son preferibles a secuenciales para evitar enumeración entre tenants.
- En seeds, fixtures y tests, **siempre** declara `tenantId` explícito; nunca uses valores por defecto silenciosos.
- Para operaciones batch o jobs, valida que el scope de tenant esté propagado en cada paso del pipeline.

### 5.2 Auditoría y trazabilidad

- Operaciones sensibles (crear, editar, anular, aprobar, pagar, cerrar período, modificar permisos) deben generar registro de auditoría con:
  - `userId`, `tenantId`, `timestamp`, `action`, `entityType`, `entityId`, `before`/`after` cuando aplique.
- **Nunca elimines registros de auditoría**; son inmutables y append-only.
- Para cambios masivos automatizados (migraciones de datos, jobs), registra el origen del cambio (`source: "system" | "migration" | "user"`).
- Los logs de auditoría son distintos de los logs operacionales (sección 15); no los mezcles.

### 5.3 Idempotencia y operaciones financieras

- Endpoints que **crean documentos con efectos económicos** (facturas, pagos, asientos, notas de crédito) deben aceptar `idempotencyKey` o equivalente para evitar duplicados por reintentos de red.
- **Prohibido** hacer side-effects financieros dentro de hooks de React, server components o GET handlers.
- Operaciones que afectan saldos/inventario/contabilidad deben ejecutarse dentro de **transacciones** con aislamiento explícito.
- Para reversiones, **emite un documento inverso** (nota de crédito, asiento de contra-partida); no edites ni elimines el original.

### 5.4 Soft-delete y ciclo de vida

- Datos transaccionales (facturas, pagos, movimientos) **nunca se borran físicamente**; usa estados (`active`, `voided`, `archived`).
- Datos maestros (clientes, productos, cuentas) usan soft-delete (`deletedAt`) y deben filtrarse por defecto en queries.
- **Prohibido** queries que ignoren `deletedAt` sin justificación explícita en comentario.
- Para historial y reportes, considera que registros "eliminados" pueden necesitar mostrarse en períodos pasados.

### 5.5 Períodos contables y fechas de negocio

- Operaciones que afectan contabilidad deben validar que el **período no esté cerrado** antes de persistir.
- Distingue claramente entre:
  - `createdAt` (timestamp del sistema)
  - `documentDate` (fecha legal del documento)
  - `accountingDate` (fecha de imputación contable)
- Nunca uses `new Date()` directamente para fechas de negocio; usa el reloj inyectable del proyecto si existe.
- Cierres de período, mes y año son operaciones **transaccionales, idempotentes y auditadas**.

### 5.6 Numeración legal y secuencias

- Folios, números de factura y correlativos fiscales deben ser **secuenciales, sin saltos visibles** y generados por una fuente única (DB sequence o tabla de contadores con lock).
- **Prohibido** generar números legales en el cliente o en código no transaccional.
- Considera la regulación fiscal del país: algunos requieren series por sucursal, caja o tipo de documento.
- En reversiones o anulaciones, **no reutilices** el número; emite uno nuevo.

### 5.7 Concurrencia y bloqueo optimista

- Para entidades editables por múltiples usuarios (documentos en borrador, configuraciones), usa **optimistic locking** vía `version` o `updatedAt` en el `WHERE` del UPDATE.
- En conflictos, devuelve error explícito al cliente con información para resolver; no sobrescribas silenciosamente.
- Operaciones críticas (asientos, ajustes de stock) pueden requerir locks pesimistas (`SELECT ... FOR UPDATE`); úsalos solo dentro de transacciones cortas.

### 5.8 Jobs, colas y procesos en background

- Tareas pesadas (envío de emails, generación de PDFs masivos, reportes, sincronización fiscal) deben ejecutarse en **jobs asíncronos**, no en el request del usuario.
- Todos los jobs deben ser **idempotentes** y **reintentables** con backoff.
- Registra el `tenantId` en cada job; nunca proceses jobs sin contexto de tenant.
- Cron jobs y schedulers deben tolerar ejecuciones duplicadas sin efectos secundarios.

### 5.9 Importaciones, exportaciones y bulk operations

- Importaciones masivas (Excel/CSV) deben validarse en **dos fases**: parseo + dry-run, y luego persistencia transaccional.
- Reporta errores por fila con contexto suficiente para que el usuario corrija sin reintentar todo.
- Exportaciones grandes (>5k filas): streaming o jobs en background, no respuestas síncronas.
- Respeta límites de tenant (cuotas, planes) antes de ejecutar bulk operations.

### 5.10 Configuración por tenant y feature flags

- Configuración (impuestos, monedas habilitadas, módulos activos, integraciones) debe ser **por tenant**, a no ser que el sistema requiera configuración global y centralizada.
- El tenant-provider con customer/brand scope es el patrón preferido para configuración; evita flags globales que afecten a todos los tenants.
- Feature flags por tenant/plan deben validarse en **API y dominio**, no solo en UI.
- Cambios de configuración con efecto retroactivo (tasas de impuestos, planes contables) requieren auditoría reforzada y, cuando aplique, versionado.

### 5.11 Integraciones fiscales y bancarias

- Llamadas a SII, AFIP, SAT, DIAN, Hacienda, PEPPOL, bancos: **siempre** con timeout, retry con backoff, circuit breaker si está disponible.
- Estados de documentos fiscales deben modelarse como máquina de estados explícita (`draft → pending → accepted | rejected → ...`).
- **Nunca** asumas éxito por status HTTP; valida el payload de respuesta del organismo.
- Guarda **request y response crudos** (sin PII innecesaria) para trazabilidad legal.

### 5.12 Reportes y consistencia eventual

- Reportes pesados pueden usar réplicas, materialized views o snapshots; documenta el **nivel de frescura** esperado.
- Reportes financieros oficiales deben generarse desde la fuente transaccional, no desde caches.
- Para dashboards en tiempo real, prefiere agregaciones pre-calculadas con invalidación explícita.

### 5.13 Onboarding, planes y límites

- Cuotas por plan (usuarios, documentos/mes, almacenamiento) deben validarse en **API**, no solo en UI.
- Al alcanzar límites: degrada con mensaje claro, no falles en silencio.
- Cambios de plan (upgrade/downgrade) son operaciones transaccionales que pueden requerir migraciones de datos o desactivación de features.

---

## 6. Secrets and Sensitive Data

- **Nunca** incluyas valores reales de `.env`, claves API, tokens, DSNs, JWT, contraseñas o cookies de sesión en código, comentarios, PRs, logs, fixtures, tests o respuestas de chat.
- Si detectas un secreto hardcodeado existente, **repórtalo en el PR y propón rotación**; no lo reutilices.
- Para variables de entorno nuevas, documenta en `.env.example` con valor placeholder genérico.
- **PII** de clientes (emails, nombres, RUT/NIF/DNI, direcciones, teléfonos) no debe aparecer en logs, fixtures, snapshots ni tests salvo datos sintéticos generados.
- Para datos de prueba realistas, usa generadores deterministas (faker con seed fija), nunca datos reales de producción.

---

## 7. Architecture and Safety

- En permisos, navegación y autorización, valida **tres capas**:
  1. Protección de API
  2. Gates de dominio
  3. Navegación y UI filtradas
- En flujos de bootstrap, setup, migraciones y operaciones sensibles, favorece:
  - **Idempotencia**
  - **Orden transaccional claro**
  - **Trazabilidad** cuando el sistema ya la usa
- En cambios de estado importantes, preserva **semántica explícita de antes/después** cuando el negocio lo requiera.
- Antes de cerrar trabajo en estas superficies, confirma que el cambio respeta el diseño maestro tenant-scoped/RLS.

---

## 8. Coding Conventions

### 8.1 Estilo general

- Usa comentarios solo cuando expliquen el **porqué** de decisiones no obvias. No comentarios triviales.
- **En el dominio**, usa invariants/assertions para estados imposibles.
- Para estados posibles o recuperables, usa `Result`/`Either` o errores específicos.
- **Sin abstracciones prematuras** en código: tres líneas similares son preferibles a una abstracción anticipada incorrecta. Cuando un patrón ya se repite en más de un módulo o tiene uso futuro claro, documenta primero la reutilización.
- Valida solo en **límites del sistema**: inputs de usuario, APIs externas, integraciones.
- **Corrige la causa raíz** dentro del alcance solicitado; si la solución exige salir del alcance, detente, reporta el bloqueo y pide confirmación antes de ampliar.

### 8.2 Determinism

- Fija versiones exactas en dependencias críticas (auth, Prisma, Next.js, crypto). Cuando actualices una crítica como objetivo principal del PR, cambia a una nueva versión exacta en el mismo PR y valida contratos/changelog localmente antes de fusionar.
- No introduzcas `Date.now()`, `Math.random()` ni `crypto.randomUUID()` en lógica de dominio sin inyección de dependencia testeable.
- Seeds, migraciones y fixtures deben usar **valores determinísticos**.

### 8.3 Error Handling

- En límites del sistema (API handlers, integraciones externas, jobs), maneja errores explícitamente y devuelve respuestas **estructuradas**.
- **Prohibido** `catch { }` vacío sin comentario justificando por qué.
- En el dominio, usa `Result`/`Either` o clases de error específicas para estados posibles o recuperables; para estados imposibles, usa invariants/assertions.
- Para integraciones externas (Vercel, Neon, gateways, fiscal), implementa **timeouts explícitos** y **retries con backoff** donde aplique.

### 8.4 Scope Discipline

- **No modifiques archivos fuera del alcance solicitado**, aunque detectes mejoras obvias. Si el cambio introduce una nueva acción o permiso, actualiza `CAPABILITY_MANIFEST` en el mismo PR y no lo trates como un cambio separado.
- Si encuentras un bug fuera de alcance, repórtalo en la descripción del PR o crea un issue; **no lo arregles en el mismo PR**.

### 8.4.1 Legacy code

- If you encounter pre-existing violations in code you must touch for your task, fix only the ones in the lines you are already changing. Report others in the PR description but do not fix.
- No mezcles refactors masivos de formato/imports/renombres con cambios funcionales.
- **Un PR = un propósito.**

---

## 9. UI, Design Tokens, A11y e i18n

### 9.1 Design Tokens

Antes de implementar UI, lee `src/styles/globals.css` y verifica tokens disponibles:

- `--text-*`, `--fw-*`, `--lh-*`, `--ls-*`
- `--icon-*`
- `--color-*`

Reglas:

- **No hardcodees** valores que ya existan como token.
- Conserva el lenguaje visual existente salvo rediseño explícito.
- Reutiliza componentes globales (dropdowns, modales, botones, inputs, layouts) antes de crear nuevos.
- No crees estilos globales o componentes nuevos a menos que sea necesario.

### 9.2 Accessibility (a11y)

- Componentes interactivos: roles ARIA correctos, foco visible, soporte de teclado.
- Imágenes, iconos significativos y botones-icono requieren `alt` o `aria-label`.
- Contraste mínimo **WCAG AA** para texto sobre fondos.
- Formularios: `label` asociados, errores vinculados por `aria-describedby`.

### 9.3 Internationalization (strings)

- Strings visibles para usuario **no deben hardcodearse**; usa el sistema i18n existente.
- Mensajes de error de API expuestos al cliente: claves de traducción, no literales.

---

## 10. Currency and Locale

- Antes de tocar monedas, fechas/hora o localización, revisa:
  - `src/lib/i18n/locale.ts`
  - `src/lib/currency/formatCurrency.ts`
  - `src/lib/currency/CurrencyProvider.tsx`
  - `src/lib/currency/iso4217.ts`
- **Servidor / documentos imprimibles / APIs**: usa `resolveLocale`, `formatDateLocalized`, `formatDateTimeLocalized`, `formatCurrency`, `formatCurrencyStrict` y el catálogo ISO 4217 existente.
- **UI cliente**: usa `useCurrency().formatAmount`, `formatNumber`, `formatDate`, `formatDateTime`. No crees formateadores locales.
- Si necesitas un formato nuevo, **extiende** `src/lib/i18n/` o `src/lib/currency/`. No crees módulos paralelos.
- Facturación electrónica, UBL, PEPPOL, integraciones fiscales: emite importes y fechas como **valores normalizados del estándar**; el formateo con locale es solo para PDF, HTML y UI visible.

---

## 11. Database and Migrations

- Cambios al esquema → migraciones claras. **Revisa el SQL generado** antes de aplicarlas.
- Datos sensibles o migraciones complejas: considera **estrategias de rollback** y validación post-migración.
- Convención de nombres: prefijo de fecha/hora ISO + descripción breve (`2026-05-15T12-00-00-add-user-profile.ts`).
- Para queries pesadas, evalúa **índices en migración** o **materialized views** antes que cache.
- En Prisma, usa `include`/`select` explícitos. Evita N+1.

---

## 12. APIs and Integrations

- Valida endpoints directamente, incluyendo **permisos, tenant scope y RLS**.
- Asegúrate de no romper **contratos existentes**.
- Integraciones externas: maneja errores y respuestas inesperadas; implementa timeouts y retries.
- Cuando sea posible, **tests de integración** que simulen el servicio externo.

---

## 13. Testing

- Añade o actualiza pruebas enfocadas para el comportamiento cambiado.
- Prefiere **validación orientada a comportamiento** sobre tests acoplados a internos.
- Permisos/tenant scope/RLS/flujos administrativos: cubre la **regresión más cercana al problema real**.

### Frontend / UI

- Inicia el servidor de desarrollo y prueba en navegador antes de reportar UI como completa.
- Verifica **golden path + edge cases** relevantes.
- Formularios, settings, admin: confirma **render + persistencia real** (guardar y recargar).

### React Health Check

- Tras cambios en React/Next.js/UI, ejecuta `npx react-doctor@latest`.
- Si reporta errores → corrige antes de cerrar.
- Si reporta warnings → menciónalos explícitamente en el PR aunque no sean bloqueantes.
- Para diagnóstico detallado: `npx react-doctor@latest . --verbose`.

### API / Backend

- Valida directamente endpoints con permisos, tenant scope y RLS aplicados.
- No rompas contratos existentes.

---

## 14. Low-Resource Performance & Perceived Speed

Los usuarios objetivo de este ERP incluyen PCs de oficina antiguas, notebooks de gama baja y conexiones inestables. **La percepción de rapidez es más importante que la velocidad real medida.**

### 14.1 Animaciones y transiciones

- **Prohibido** animaciones puramente decorativas en flujos administrativos (CRUD, listados, formularios).
- Animaciones permitidas solo cuando comuniquen **estado funcional**:
  - Skeleton/loading
  - Confirmación de acción (checkmark breve)
  - Transición de modal/drawer
- Duración máxima: **200ms** para microinteracciones, **300ms** para transiciones de panel.
- Usa `transform` y `opacity` exclusivamente; **nunca** animes `width`, `height`, `top`, `left`, `margin` (causan reflow).
- Respeta `prefers-reduced-motion`: desactiva animaciones cuando el usuario lo configuró en su SO.
- **Prohibido**: parallax, scroll-jacking, animaciones infinitas en loop, partículas de fondo.

Aplicabilidad de 14.x: usa esta sección solo cuando el cambio toque UI, bundles cliente, animaciones, listas grandes o percepción de rapidez.

### 14.2 Percepción de rapidez

- **Skeleton screens > spinners** para cargas >300ms.
- Renderiza la **estructura de la página inmediatamente**; carga datos en paralelo.
- Para acciones del usuario, aplica **optimistic UI** solo en cambios no financieros, no de permisos y no de auditoría (por ejemplo, preferencias de UI o reordenamientos). Nunca lo uses en mutaciones financieras ni cambios de permisos; si falla, revierte con mensaje claro.
- Feedback de acción debe aparecer en **<100ms** aunque la respuesta del servidor tarde más.
- Evita pantallas en blanco entre rutas; usa loading boundaries de Next.js (`loading.tsx`).

### 14.3 Listas y tablas grandes (típico en ERP)

- Listados con **>50 filas visibles**: implementa virtualización (ej. `@tanstack/react-virtual`).
- Paginación servidor-side por defecto en listados de documentos, clientes, productos.
- **Prohibido** cargar todo el dataset y filtrar/ordenar en cliente cuando la tabla puede crecer linealmente con el uso del tenant.
- Búsquedas en tablas grandes: debounce mínimo **300ms**, búsqueda servidor-side.
- Columnas con cálculos pesados: memoizar (`useMemo`) o calcular en servidor.

### 14.4 Bundle size y JavaScript en cliente

- Justifica cualquier import que añada **>30KB gzipped** al bundle inicial.
- Prefiere **server components** sobre client components siempre que sea posible.
- `"use client"` solo donde realmente se necesite interactividad.
- Code-splitting agresivo por ruta y por módulo del ERP.
- Lazy-load de componentes pesados (editores ricos, gráficos, generadores de PDF, scanners).
- Evita librerías de iconos completas; importa solo los iconos usados (tree-shaking real).
- **Prohibido**: moment.js (usa date-fns o nativo), lodash completo (usa imports puntuales), libs de UI de propósito general si ya tenemos un sistema interno.

### 14.5 Imágenes y assets

- Imágenes vía `next/image` con dimensiones explícitas y formato moderno (AVIF/WebP).
- Iconos: SVG inline o sprite; nunca PNG para iconografía.
- Logos de cliente/tenant: tamaños máximos validados en upload (ej. <500KB, dimensiones razonables).
- **Prohibido** cargar fuentes web pesadas con muchos pesos; limita a 2-3 variantes.

### 14.6 Reflows, repaints y CPU

- Evita renders en cascada: revisa árboles de componentes con DevTools.
- **Prohibido** efectos visuales que disparen layout en cada frame (shadows animadas, blurs, filters CSS pesados).
- `backdrop-filter` solo cuando aporta valor funcional; tiene costo alto en GPU integradas.
- Listas con hover effects: evita transiciones que afecten layout de elementos vecinos.

### 14.7 Network y caching cliente

- Cachea responses estables (catálogos, configuración del tenant, lista de monedas) con SWR/React Query e invalidación explícita.
- Prefetch de rutas probables solo en hover **sostenido** (>150ms), no en mouseover instantáneo.
- Polling: prohibido por defecto; si es necesario, intervalo mínimo **30s** y se detiene cuando la pestaña está inactiva (`document.visibilityState`).

### 14.8 Estado global y re-renders

- Evita stores globales que disparen renders masivos. Prefiere estado local o context segmentado.
- Para formularios grandes (típico en ERP: facturas con N líneas), usa `react-hook-form` con `Controller` puntual, sin context-wide re-render.
- Memoiza componentes de fila/celda en tablas grandes.

### 14.9 Performance Budgets (bloqueantes en vistas críticas)

- **LCP <2.5s** en conexión Slow 4G simulada.
- **TBT <300ms** en CPU 4x throttled (Chrome DevTools).
- **CLS <0.1**.
- **TTFB <500ms** en server components.
- Server components sin N+1 en Prisma; `include`/`select` explícitos.
- Bundle inicial: evita imports pesados sin justificar en vistas críticas.
- Vistas críticas del ERP (dashboard, factura nueva, listado de documentos): los budgets son **bloqueantes**, no aspiracionales.

### 14.10 Anti-patrones prohibidos

- ❌ Spinners de pantalla completa en navegación entre rutas internas.
- ❌ Modales con animación de entrada >300ms.
- ❌ Confetti, fireworks, animaciones de "éxito" elaboradas tras guardar un documento.
- ❌ Tooltips que aparecen con delay perceptible (>200ms).
- ❌ Sidebars que se animan en cada cambio de ruta.
- ❌ Auto-refresh de listados sin acción explícita del usuario.
- ❌ Carga ansiosa (`eager`) de imágenes fuera del viewport.

---

## 15. Logging and Observability

- Usa el **logger central** del proyecto. **Prohibido** `console.log` en código de producción.
- Niveles:
  - `error` → fallos accionables
  - `warn` → degradaciones
  - `info` → eventos de negocio relevantes
- **Nunca logues payloads completos** de request/response sin sanitizar PII o secretos.
- Flujos críticos (pagos, facturación, permisos, bootstrap): incluye **correlation IDs** si el sistema ya los usa.
- Recordatorio: logs operacionales ≠ logs de auditoría (ver sección 5.2).

---

## 16. Dependencies and Supply Chain

- Antes de añadir una dependencia, verifica:
  - Mantenimiento activo (commits <12 meses)
  - Licencia compatible
  - Número de mantenedores
  - Alternativas ya presentes en `package.json` o `src/lib/*`
- **Prohibido** añadir dependencias que dupliquen utilidades internas.
- Dependencias críticas (auth, crypto, ORM, framework): requieren **justificación explícita** en el PR.
- Ejecuta `npm audit --production` antes de cerrar PR que toque `package.json`.
- Revisa **vulnerabilidades reportadas por GitHub** (Dependabot/security alerts) y aborda las críticas antes de cerrar.

---

## 17. Planning and Execution

- Empieza por el contexto más cercano al problema: archivo, símbolo, ruta, test o comportamiento fallando.
- Antes del primer cambio, formula una **hipótesis local falsable** y busca la comprobación más barata.
- Después del primer cambio sustantivo, ejecuta de inmediato la **validación más estrecha** posible.
- Secuencia de validación:
  1. Test específico del comportamiento cambiado
  2. Lint/typecheck enfocado en el archivo o slice
  3. Validaciones más amplias solo si siguen siendo necesarias
- Triage del cambio: si es un typo, una corrección localizada de menos de 20 líneas o documentación sin lógica, aplica solo las reglas directamente afectadas y la validación mínima correspondiente.
- No amplíes alcance entre el primer cambio y su primera validación salvo bloqueo concreto.
- Si la hipótesis inicial se invalida tras **2 intentos**, detente y reformula antes del tercero.
- Documenta hipótesis descartadas en el PR si ahorran tiempo a futuros revisores.

---

## 18. Git Workflow and CI/CD

- Todas las pruebas relevantes deben pasar en CI/CD antes de fusionar.
- Cambios que toquen permisos/RLS, finanzas, contratos de API públicos o más de 50 líneas de producción: solicita **revisión adicional**.
- Mantén ramas de features actualizadas con la principal.
- **No cierres tareas / mergees PRs** hasta que validaciones y revisiones estén aprobadas.

### Reglas anti-patrón

- **Nunca** uses `--force` o `--no-verify` sin justificación explícita en el PR.
- **Nunca** modifiques historial de ramas compartidas (`rebase`, `amend` sobre commits ya pusheados).
- **No mergees tu propio PR** salvo en hotfixes con autorización previa.
- **Nunca restaures cambios directamente sobre la rama principal** sin pasar por revisión.
- **Nunca hagas restore a local** sin antes guardar el estado actual en una rama de feature.

---

## 19. AI-Assisted Change Traceability

- En PRs generados con asistencia de IA, incluye en la descripción:
  - Resumen del prompt o intención original
  - Archivos tocados y motivo
  - Validaciones ejecutadas localmente
- Marca el PR con label **`ai-assisted`** para cambios no triviales generados por IA.
- Commits **atómicos**: un commit = un cambio lógico. No vuelques toda la sesión en uno solo.
- Si un cambio se basa en una skill de `.agents/skills/` o `.claude/skills/`, **referencia la skill** en el PR.

---

## 20. Naming Conventions

- Nombres **descriptivos y claros** que reflejen propósito.
- Evita abreviaturas innecesarias y nombres genéricos.

| Tipo                   | Convención             | Ejemplo                                   |
| ---------------------- | ---------------------- | ----------------------------------------- |
| Componentes React      | PascalCase             | `UserProfile.tsx`                         |
| Utilidades / funciones | camelCase              | `formatCurrency.ts`                       |
| Rutas de API           | kebab-case             | `user-profile.ts`                         |
| Tests                  | `<archivo>.test.<ext>` | `UserProfile.test.tsx`                    |
| Migraciones Prisma     | ISO date + descripción | `2026-05-15T12-00-00-add-user-profile.ts` |

### Organización

- Mantén archivos y carpetas **organizados por módulos** del ERP, no dispersos.
- Para módulos grandes, usa subcarpetas para mantener claridad.

---

## 21. Knowledge Sharing (resumen)

> El detalle motivacional y de proceso humano vive en `CONTRIBUTING.md`. Aquí solo lo accionable por IA:

- Si un cambio introduce un patrón reutilizable, **documenta el caso** en `docs/07-ANALISIS/`.
- Si resuelve un problema arquitectónico relevante, **documenta el caso** en `docs/07-ANALISIS/`.
- Mantén la documentación reutilizable actualizada con propósito, aplicación y consideraciones de uso.

---

## 22. Security Policy

- Si detectas una vulnerabilidad de seguridad, **no la reportes en un PR público**.
- Reporta vulnerabilidades a través de los canales oficiales de seguridad de la empresa.
- Considera mantener actualizado un archivo `SECURITY.md` con la política de seguridad y versiones soportadas.

---

## 23. Dependency Updates

- Para actualizaciones de dependencias, valida que no rompan contratos existentes ni introduzcan vulnerabilidades; en dependencias críticas, conserva versiones exactas, revisa changelog y prueba localmente antes de fusionar. Solo cuando el bump crítico sea el objetivo principal del PR, justifica la actualización mayor ahí mismo; si no, sepáralo en otro cambio.
- No forces updates sin revisar el changelog y probar localmente.
- Evita emplear `--force` en las update de dependencias del repo.

---

## Anexo A: Checklist antes de cerrar un PR

### General

- [ ] Revisé skills locales y documentación maestra aplicables
- [ ] El PR tiene alcance único y descripción clara
- [ ] Etiqueté `ai-assisted` si aplica

### Seguridad y SaaS/ERP

- [ ] Respeté tenant-scoped/RLS, permisos y auditoría en API, dominio y UI si el cambio toca esas superficies
- [ ] Operaciones financieras o sensibles son idempotentes, transaccionales y con período válido si aplica
- [ ] No introduje secretos, PII ni `console.log`
- [ ] Validé contratos, N+1 e imports >30KB gzipped cuando correspondía

### UI y Performance

- [ ] Usé tokens de diseño y utilidades de currency/locale existentes si apliqué UI
- [ ] Sin animaciones decorativas; respeté `prefers-reduced-motion`
- [ ] Listas grandes virtualizadas o paginadas server-side cuando correspondía

### Validación

- [ ] Ejecuté tests enfocados al cambio
- [ ] Ejecuté `pnpx react-doctor@latest` si toqué React/UI
- [ ] Ejecuté `pnpm audit --production` si toqué `package.json`
