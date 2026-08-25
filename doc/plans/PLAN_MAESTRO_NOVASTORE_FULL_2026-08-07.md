# Plan maestro: Supabase, Billing & Plans, acceso autenticado y VID

**Proyecto:** NovaInvestigator — análisis estratégico EFI/EFE/DAFO/QSPM/CAME  
**Documento:** Arquitectura técnica para autenticación, acceso, suscripciones y persistencia online  
**Fecha:** 2026-08-07  
**Estado:** Implementación incremental avanzada; componentes globales estratégicos (StrategicPositionMatrix, InvestigationSummarySheet, DafoQuadrantIndices, CameActionsIndices) integrados, arquitectura móvil responsive, tooltips flotantes en validación y persistencia de chat NovAi.
**Última decisión funcional:** 2026-08-25
**Alcance:** NovaStore como plataforma + Investigator como aplicación, Supabase Auth + Supabase Postgres + RLS + Stripe Billing + usuarios + roles + capacidades + entitlements de módulos + investigaciones remotas  
**Principio rector:** conservar la UI y el shell de NovaInvestigator; implementar la funcionalidad detrás de las pantallas actuales

---

## 1. Decisión ejecutiva

La aplicación se mantendrá dentro de `NovaInvestigator` como aplicación Next.js 16 con React 19, Tailwind CSS 4, base-ui/shadcn, TanStack Table y Sonner.

La persistencia y la identidad online se implementarán con:

- **Supabase Auth** para usuarios registrados, sesiones, verificación de email y recuperación de cuenta.
- **Supabase Postgres** para perfiles, tenants, membresías, capacidades, planes, entitlements, investigaciones y auditoría.
- **Supabase RLS** para garantizar aislamiento por tenant, propietario y nivel de acceso.
- **Stripe Billing** para pagos únicos, suscripciones, Checkout, Customer Portal, facturas y webhooks.
- **Route Handlers de Next.js** para operaciones server-side, creación de Checkout, webhooks y servicios de dominio.
- **Sesión guest temporal de aplicación** para solicitar un trial limitado sin crear una identidad permanente de Supabase.

Supabase elimina la necesidad de implementar manualmente el sistema de sesiones, hashing de contraseñas y políticas RLS básicas. No elimina la lógica propia de la aplicación: VID (Verificación de Identidad Digital), capacidades, reglas de negocio, entitlements, persistencia de investigaciones y sincronización con Stripe siguen siendo responsabilidad del proyecto.

**Regla de titularidad comercial (2026-08-09):** el plan, la suscripción,
el Customer de Stripe, las facturas, los entitlements y el estado de Billing
pertenecen al `tenant`/organización propietaria del workspace, nunca al usuario
individual. Los miembros activos del tenant heredan el acceso comercial vigente
según sus capacidades, pero no se representarán como titulares de suscripciones
individuales. El propietario activo del workspace siempre podrá iniciar compras
y administrar Billing; además, podrá delegar la capacidad de compra a miembros
según una política configurable del tenant. Las lecturas podrán mostrarse a los
miembros autorizados según sus capacidades.

Este documento sustituye únicamente las decisiones de autenticación, permisos estáticos y persistencia local de los planes anteriores. No sustituye la metodología EFI/EFE/DAFO/QSPM/CAME ni la UI aprobada.

**Decisiones de producto confirmadas para esta enmienda (2026-08-12):** NovaStore
es la plataforma de entrada, autenticación, catálogo comercial, Billing y
administración. Investigator es una aplicación/módulo comercial de NovaStore. Un
visitante siempre llega primero a Login, pero puede elegir explícitamente continuar
como guest para **solicitar un trial**. El trial determina qué aplicaciones
aparecen en el sidebar y qué acciones puede ejecutar. El guest puede consultar la
página pública de Pricing, sus planes, precios y productos, pero no puede crear un
Checkout real de Stripe, comprar, administrar la plataforma, acceder a Billing del
tenant ni a datos tenant-scoped. El registro con email confirmado será obligatorio
para crear el Checkout real, persistir datos, administrar roles o continuar con
acceso comercial registrado. Si el guest se registra y confirma su email mientras
su trial sigue vigente, conservará el tiempo restante y los entitlements del trial,
sin recibir un trial nuevo ni convertir automáticamente la sesión en una cuenta.

---

## 2. Relación con la documentación existente

### 2.1. Documentos que se conservan

- `doc/plans/PLAN_DEFINITIVO_MIGRACION_NEXT_TYPESCRIPT.md`
  - Mantiene NovaInvestigator como aplicación Next.js completa.
  - Mantiene el shell administrativo, las rutas de Investigator y los componentes del template.
  - Su decisión de `localStorage` queda reemplazada por la persistencia remota definida aquí.
- `doc/plans/PLAN_MAESTRO_MIGRACION_UI.md`
  - Se conserva la migración incremental.
  - Se reutilizan los componentes Tailwind, base-ui/shadcn, Dialog, Sonner y TanStack Table.
- `doc/plans/PLAN_MAESTRO_CRUD_MODALES.md`
  - Se conservan los modales para edición, confirmación y operaciones CRUD.
- `doc/plans/PLAN_MAESTRO_IMPLEMENTACION.md`
  - Se conservan los invariantes metodológicos, la trazabilidad de investigaciones y la distinción entre recomendación DAFO, QSPM y CAME.

### 2.2. Decisión de plataforma

La petición explícita de usar Supabase introduce una decisión distinta a la referencia inicial de Neon/Prisma. Si se aprueba este plan:

- Supabase será la fuente única de identidad y persistencia online.
- No se mantendrán dos capas de acceso a datos, por ejemplo Prisma para unas tablas y Supabase SDK para otras.
- No se implementarán sesiones propias.
- La migración debe documentar que Supabase reemplaza la combinación Neon/Prisma para esta plataforma.
- No se instalarán dependencias ni se crearán migraciones hasta cerrar la compatibilidad exacta con Next.js 16 y fijar versiones.

`doc/plans/PLAN_MAESTRO_ROUTING_SERVIDOR_UNICO.md` contiene una arquitectura histórica React/Vite/Flask. No se aplicará literalmente porque el proyecto actual es Next.js 16.

---

## 3. Estado actual que se debe transformar

La implementación parte del código actual, no de una plantilla nueva:

- `src/app/(pages)/layout.tsx` ya proporciona `Sidebar`, `Header`, `Footer`, `Toaster` y el contenedor principal.
- `src/components/Providers.tsx` ya proporciona tema, permisos, tooltips y sidebar.
- `src/components/layout/Sidebar.tsx` ya filtra aplicaciones mediante `usePermissions`.
- `src/app/(pages)/apps/investigator/layout.tsx` ya proporciona la navegación numerada por etapas.
- `src/hooks/use-investigator-analysis.tsx` mantiene estado, cálculo, historial y persistencia de investigaciones.
- `src/utils/investigator/workspace.ts` lee y escribe `localStorage`.
- `src/hooks/use-user-app.ts` utiliza `src/fake-db/apps/users.ts` y estado local.
- `src/configs/permissions.ts` contiene permisos estáticos por aplicación.
- `src/hooks/use-permissions.tsx` devuelve el conjunto estático completo y no el
  resultado efectivo de roles, overrides y entitlements.
- `src/configs/themeConfig.ts` dirige el shell a `/dashboard/orders`, cuya página
  contiene datos estáticos del template y no tiene un guard server-side propio.
- `src/proxy.ts` no cubre actualmente todas las familias internas, entre ellas
  `/dashboard`, `/datatable` y `/forms`.
- `src/components/shared/ProfileDropdown.tsx` presenta `Guest session` cuando no
  existe una sesión registrada, aunque el sistema no haya creado una sesión guest.
- Las entradas actuales de Roles y Permissions apuntan al template externo en vez
  de ofrecer pantallas funcionales internas.
- Persisten tipos y servicios legacy para modalidades anónimas que deben quedar
  separadas del nuevo `guest_trial`.
- Las páginas de login y registro todavía ejecutan `preventDefault()` y no autentican.
- `src/views/apps/users/view/tabs/billing-tab.tsx` muestra planes, períodos e invoices estáticos.
- `UserBillingPlan`, `UserInvoice`, `UserPlan` y `UserBilling` son modelos visuales de plantilla, no una fuente real de autorización.
- `Pricing` y algunos enlaces de Billing apuntan actualmente a páginas externas del template.
- `src/app/api/generar-pdf/route.ts` genera PDF ejecutando Chrome/Edge con `child_process`.

La implementación no eliminará estas superficies. Las convertirá progresivamente en consumidores de datos reales.

---

## 4. Objetivos

1. Permitir uso online con cuentas registradas.
2. Permitir a un usuario registrado con email confirmado utilizar una prueba sin guardar su investigación; la VID no será un requisito comercial.
3. Permitir a un usuario registrado con email confirmado comprar un acceso único con duración configurable desde backend; la VID no será un requisito comercial.
4. Permitir que un usuario en trial, ya autenticado y con email confirmado, contrate una suscripción sin esperar la aprobación de VID.
5. Permitir invitaciones administrativas con estado pendiente.
6. Gestionar roles y capacidades por acción.
7. Persistir investigaciones únicamente para usuarios con acceso persistente.
8. Mantener la UI, rutas y lenguaje visual actuales.
9. Implementar Billing & Plans con datos reales.
10. Garantizar tenant scope, RLS, auditoría e idempotencia.
11. Mantener una migración incremental con la aplicación ejecutable en cada fase.
12. Hacer que NovaStore abra en Login y que ninguna ruta operativa protegida
    dependa únicamente del proxy o de la navegación del cliente.
13. Permitir que un visitante solicite únicamente el trial guest, sin convertirlo
    en usuario permanente ni concederle Billing o datos tenant-scoped.
14. Hacer que la política de trial sea la fuente server-side de los módulos y
    acciones disponibles durante el trial, incluyendo sidebar, layouts, dominio,
    Route Handlers y APIs.
15. Implementar pantallas internas y funcionales de roles y permisos, separando
    capacidades funcionales de entitlements comerciales.
16. Permitir que `super_admin` configure los módulos y acciones incluidos en cada
    trial, plan, licencia u override, con auditoría y controles de plataforma.
17. Bloquear deep links y APIs de módulos no concedidos aunque el elemento esté
    oculto en la UI.
18. Exponer una única superficie de administración para todos los roles y
    capacidades de NovaStore, con contexto explícito de plataforma, tenant
    seleccionado o todos los tenants cuando el actor sea un `super_admin`.
19. Permitir que el `super_admin` gestione roles tenant y roles platform mediante
    capacidades platform explícitas, sin bypasses basados en el nombre del rol.
20. Proteger la autoescalada, la degradación propia y la eliminación o suspensión
    del último `super_admin` activo mediante reglas transaccionales y auditoría.

## 5. Fuera de alcance inicial

- Reemplazar el shell de NovaInvestigator.
- Crear un dashboard paralelo.
- Rediseñar globalmente `globals.css`.
- Implementar un proveedor de pagos propio.
- Guardar tarjetas o datos sensibles de pago en la aplicación.
- Convertir automáticamente investigaciones de trial o compra única en investigaciones persistentes sin consentimiento.
- Crear permisos basados únicamente en jerarquía de roles.
- Mantener `localStorage` como fuente de verdad de investigaciones.
- Conceder al guest acceso a Checkout, Billing administrativo, usuarios, roles,
  permisos, platform APIs o datos reales de un tenant.
- Convertir automáticamente un `guest_trial` en usuario registrado, licencia,
  tenant o suscripción.
- Permitir que la UI sea la única frontera para ocultar o bloquear módulos.

---

## 6. Modelo de acceso

### 6.1. Estados de identidad y sesión

La identidad registrada, la sesión guest, la confirmación de email, la VID y el
acceso comercial son conceptos separados. NovaStore siempre muestra Login como
entrada predeterminada; el modo guest se inicia únicamente después de una acción
explícita del visitante.

```text
pre_auth                    → visitante sin sesión; solo rutas públicas y Login
guest_trial_requested      → visitante que solicitó el trial y tiene sesión temporal
guest_trial_active         → sesión temporal con trial vigente, módulos y acciones limitados
registered_pending_email   → identidad creada pero email no confirmado
registered_pending_vid     → usuario confirmado, VID pendiente y acceso comercial permitido
invited                    → invitación pendiente de aceptación
registered                 → perfil permanente, membresía activa y VID opcional
suspended                  → perfil existente, acceso bloqueado
```

No se utilizará `signInAnonymously`. `guest_trial_requested` y
`guest_trial_active` serán una sesión de aplicación temporal, firmada y
`HttpOnly`, no una identidad de Supabase, no un usuario de `auth.users` y no una
membership. El estado podrá mantenerse de forma efímera en Redis/Upstash y no
contendrá investigaciones reales ni secretos.

El guest solo podrá solicitar el trial y utilizar los módulos y acciones
permitidos por la política vigente. La confirmación de email será requisito para
registrarse, comprar, activar una suscripción, persistir investigaciones,
administrar Billing, gestionar roles o utilizar rutas de tenant. La VID podrá
solicitarse y revisarse de forma independiente, pero no será una frontera
comercial.

El guest podrá consultar el catálogo comercial público de NovaStore mediante
Pricing (`/pages/pricing` y `GET /api/billing/plans`) y seleccionar un producto.
Ese catálogo no expone el Billing del tenant, invoices, Customer Portal ni el
estado comercial de una organización. La creación efectiva de una sesión de
Stripe Checkout requiere un usuario registrado con email confirmado, membresía,
tenant activo y las capacidades comerciales correspondientes.

### 6.2. Modalidades comerciales

```text
guest_trial
registered_trial
registered_one_time
registered_subscription
registered_manual
```

`guest_trial` es una modalidad temporal para visitantes. No es una licencia,
suscripción, factura ni grant tenant-scoped. Su política define explícitamente los
módulos y acciones permitidos durante la sesión.

En todas las modalidades, el acceso efectivo combina la modalidad comercial, el
entitlement de módulo/acción y la capacidad funcional. La política de trial fija
el techo comercial: una acción solo se habilita si está permitida por el trial y
además pasa el guard de dominio correspondiente. En sesiones guest, la política
de trial sustituye la membresía y el rol únicamente para la demo allowlisted; no
concede capacidades generales ni acceso a datos reales.

El plan y la suscripción son propiedades comerciales del `tenant`/organización
propietaria del workspace. Todos los miembros activos de ese tenant comparten
el mismo contexto de Billing y no se crearán planes o suscripciones
individuales por miembro. El propietario activo del workspace siempre podrá
comprar y administrar Billing; los demás miembros podrán iniciar compras solo
cuando la política de compra del tenant los autorice. El cambio de plan, la
cancelación y la reactivación seguirán siendo operaciones administrativas del
propietario salvo que se deleguen mediante una capacidad separada y explícita.
Los miembros no autorizados solo podrán consultar Billing cuando dispongan de
la capacidad de lectura correspondiente.

### 6.2.1. Delegación de compras para Billing del tenant

La autorización de compra será configurable por tenant mediante
`billing_purchase_policy`, con estos valores:

```text
owner_only          → solo propietarios activos del workspace
approved_members    → propietarios y miembros aprobados explícitamente
all_active_members  → propietarios y miembros activos del workspace
```

En la implementación, “propietario” significará una membresía activa del
workspace con el rol `owner`, junto con una membresía activa en el tenant. El
workspace deberá estar activo. Esta comprobación se hará en servidor y no se
inferirá desde el nombre, email, rol enviado por el cliente o estado visual de
la UI.

El valor predeterminado será `owner_only`. Solo un propietario activo podrá
cambiar la política o aprobar/revocar miembros. En `approved_members`, la
aprobación se almacenará como una delegación tenant-scoped/workspace-scoped,
concedida a un miembro activo concreto y registrada en auditoría. En
`all_active_members`, cualquier miembro activo del workspace podrá iniciar un
Checkout, pero no adquirirá propiedad de la suscripción ni permisos de
administración por ese solo hecho.

La política delega `billing.checkout.create` para las modalidades que crean o
modifican Billing tenant-scoped, especialmente Checkout de suscripción. No
concede automáticamente `billing.subscription.manage`: cambiar, cancelar o
reactivar una suscripción seguirá requiriendo al propietario, salvo una
delegación administrativa independiente y explícita que se defina
posteriormente. La modalidad `registered_one_time` conserva por ahora su
semántica histórica de grant ligado al usuario; convertir una compra única en
un entitlement compartido del tenant requerirá una decisión y migración
separadas. Toda compra tenant-scoped iniciada por un miembro autorizado
registrará el usuario que la inició, el tenant, el workspace, la política
vigente y, cuando aplique, el propietario que concedió la aprobación.

### 6.3. Matriz de acceso

| Modalidad | Identidad/sesión | Puede editar demo | Puede guardar investigación | Puede solicitar trial | Puede comprar | Módulos y acciones |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| Visitante pre-auth | Sin sesión | No | No | Sí, explícitamente | No | Solo rutas públicas |
| Guest trial | Sesión temporal firmada; sin `auth.users` ni tenant | Sí, solo memoria | No | No durante la sesión | No | Política guest trial |
| Trial registrado | Usuario Supabase + email confirmado + tenant | Sí, según política | No | No aplica | Sí, autenticado | Política de trial + rol/capacidad |
| Compra única registrada | Usuario Supabase + email confirmado + tenant | Sí | Sí, según producto | No | Ya realizada | Plan/producto + rol/capacidad |
| Invitado pendiente | Invitación + Supabase Auth después de aceptar | Según tenant | Según tenant | No | Según tenant | Rol y entitlements del tenant |
| Suscripción registrada | Usuario Supabase + email confirmado + tenant | Sí | Sí | No | Sí, autenticado | Plan + rol/capacidad |
| Suspendido | Usuario Supabase existente | No | No | No | No | Ninguno mientras esté suspendido |

### 6.4. Decisión aprobada para compra única

La compra única se implementará como una sesión autenticada de un usuario con email confirmado, con duración configurable y un único consumo máximo. La VID podrá estar pendiente, aprobada o rechazada sin impedir la compra.

La compra única otorgará:

- una sesión autenticada activa;
- una investigación remota persistida en la base de datos mientras exista el
  acceso contratado y las reglas de retención aplicables;
- una duración máxima configurable;
- un único consumo;
- exportación permitida únicamente si el plan/producto, el entitlement y la capacidad la incluyen; la VID no sustituye esas validaciones.

La persistencia de la compra única se activa únicamente después de que el webhook
firmado confirme el pago y cree el `access_grant`. El retorno de Stripe nunca
activa acceso por sí mismo. La interfaz informará del estado pendiente mientras
el webhook no haya confirmado el pago.

`guest_trial` nunca podrá iniciar este flujo. Si un guest pulsa Comprar, la UI
mostrará un diálogo de registro obligatorio y la API devolverá un error
estructurado de cuenta confirmada requerida si se intenta omitir el diálogo.

---

## 7. Flujos funcionales

### 7.1. Solicitud de trial como guest

1. El visitante abre NovaStore y llega a `/pages/auth/login`; no se inicia una
   sesión guest automáticamente.
2. El visitante elige explícitamente `Probar como invitado` o `Solicitar trial`.
3. El servidor aplica rate limiting, crea una sesión temporal firmada y resuelve
   la política guest trial vigente.
4. La política determina la duración, el módulo o módulos visibles y la lista
   máxima de acciones permitidas. Una configuración mínima puede conceder
   `modules.investigator` y únicamente las acciones de Investigator definidas
   para la demo.
5. El shell carga únicamente las entradas de navegación de esos módulos. El
   filtrado del sidebar es informativo y se repite en layouts, dominio,
   Route Handlers y APIs.
6. Las APIs guest están separadas y allowlisted, por ejemplo
   `/api/demo/investigator/*`. Solo devuelven datos sintéticos o ejecutan
   cálculos de demo; nunca consultan ni escriben `investigations`, Billing del
   tenant, usuarios, roles, permisos, platform APIs o tablas tenant-scoped.
7. El guest puede editar el estado de la demo en memoria o en almacenamiento
   efímero. No se crea tenant, membership, licencia, invoice, `access_grant`
   comercial ni registro persistente de investigación.
8. Los botones Comprar y suscribirse del catálogo público pueden iniciar el flujo
   comercial y conservar la selección en un `returnTo` interno seguro, pero no
   crean una sesión Checkout de Stripe. Comprar muestra un diálogo de registro
   obligatorio. Administrar Billing, consultar invoices, abrir Customer Portal,
   guardar o acceder a otra aplicación permanecen bloqueados.
9. Al expirar el trial, el servidor revoca la sesión temporal; la UI conserva
   únicamente Login, registro, solicitud de un nuevo trial si la política lo
   permite y la información pública de planes.
10. La sesión guest nunca se convierte automáticamente en una cuenta registrada.
    Si el visitante inicia el registro, el servidor conservará una referencia de
    continuación firmada. Después de confirmar el email y completar el bootstrap
    de la cuenta, una operación atómica podrá reclamar el trial guest aún vigente,
    conservar su `expiresAt`, sus módulos, acciones y límites, y asociarlo al
    usuario confirmado sin crear un trial nuevo. Si el trial ya fue consumido o
    expiró, el registro no concede otro trial automáticamente.

El guest no puede crear una compra única, suscripción ni licencia en Stripe. Puede
consultar Pricing, seleccionar un producto y comenzar el flujo de registro. El
trial es la única modalidad que puede solicitar desde esa sesión y es la fuente
de entitlements de módulos y acciones durante la experiencia temporal. Después de
confirmar el email, el usuario podrá crear el Checkout real y comprar un plan o
licencia, conservando mientras tanto el tiempo restante del trial reclamado.

### 7.2. Inicio como usuario registrado de prueba

1. El usuario envía el registro con el nombre de su empresa.
2. Supabase crea la identidad y el servidor guarda una intención de registro pendiente, sin crear perfil, tenant ni workspace.
3. El usuario confirma su email mediante el enlace enviado por Supabase.
4. El callback confirmado completa de forma transaccional el perfil, tenant principal, workspace `General`, membresías y política de trial.
5. El callback redirige al usuario a Pricing.
6. El usuario elige trial o una modalidad de pago.
7. Si elige trial, se crea un grant ligado al usuario y tenant, con `startsAt`,
   `expiresAt` y los módulos/acciones permitidos por la política de trial. Si el
   registro se originó desde una sesión guest activa, el servidor reclama esa
   sesión de forma idempotente y conserva su `expiresAt` y snapshot de
   entitlements en lugar de iniciar un trial nuevo.
8. La aplicación carga la demo o un estado vacío en memoria.
9. Todas las ediciones se mantienen en React; no se insertan filas en `investigations`.
10. El servidor verifica autenticación, email confirmado, tenant, entitlement y expiración en cada operación protegida.
11. Al expirar el trial o cualquier acceso contratado, se bloquea toda la aplicación operativa y se muestra un modal obligatorio para contratar o renovar un plan.

El contador visual es informativo. La decisión real siempre utiliza el reloj del servidor.

Existe un `guest_trial` limitado para visitantes sin sesión registrada, pero no
existe acceso guest fuera de sus rutas y APIs allowlisted. Los usuarios con email
sin confirmar no reciben `registered_trial`, compra única, suscripción ni acceso
tenant-scoped. La VID no condiciona el trial. La política se aplica desde la
creación de la sesión o grant y determina los módulos y acciones permitidos.

### 7.3. Compra única registrada

1. El usuario autenticado y con email confirmado selecciona el producto de acceso único.
2. `POST /api/billing/checkout/one-time` crea un registro interno de checkout.
3. El servidor crea una sesión de Stripe Checkout con `mode=payment`.
4. El `userId`, `tenantId` y el identificador interno se envían como metadata controlada por el servidor.
5. Stripe redirige al usuario al checkout hospedado.
6. Stripe llama al webhook firmado.
7. El webhook valida firma, idempotencia y estado del pago.
8. Se crea un `access_grant` ligado al usuario y tenant, con límite y expiración.
9. La aplicación consulta el estado real del entitlement.
10. Una vez confirmado el `access_grant`, el usuario puede crear y actualizar la
    investigación persistida en la base de datos con el tenant scope autorizado.

El retorno de Stripe nunca activa acceso por sí mismo.

### 7.4. Upgrade de trial a suscripción

1. El usuario autenticado, con email confirmado y trial activo pulsa “Elegir plan” o “Continuar con suscripción”.
2. Se crea un Checkout de Stripe en `mode=subscription`.
3. El webhook confirma la suscripción.
4. Se conserva la identidad autenticada y confirmada por email. No existe
   conversión automática desde `guest_trial`; el usuario debe registrarse y
   completar un `registered_trial` o el flujo comercial correspondiente.
5. Se enlaza el customer/subscription de Stripe con el tenant.
6. El usuario confirma si desea guardar la investigación actual.
7. Solo con confirmación se persiste el `InvestigationState`.
8. El grant de trial se cierra y no vuelve a conceder acceso duplicado.

### 7.5. Invitación administrativa

1. Un administrador con `users.invite` crea una invitación.
2. La invitación siempre apunta a un `tenant_id` y a un `workspace_id` activo del mismo tenant.
3. Se guarda tenant, workspace, email, rol inicial, capacidades permitidas y fecha de expiración.
4. Se envía enlace de aceptación.
5. El usuario crea o vincula su identidad de Supabase y confirma el email sin ejecutar el bootstrap de tenant personal.
6. El callback confirmado crea únicamente el perfil pendiente; no crea tenant ni workspace.
7. Se activa la membresía tenant y la membresía workspace únicamente después de validar server-side el token y el email.
8. El usuario conserva sus membresías principales y recibe acceso conforme a su rol y overrides.

El administrador no define ni conoce contraseñas.

### 7.6. Expiración

La expiración se evalúa server-side:

```text
now(server) >= expiresAt
```

No se acepta `expiresAt` enviado por el cliente. La misma regla se aplica al
`guest_trial`, al `registered_trial`, a la ventana de una compra única y al
período vigente de una suscripción. Cuando `now(server) >= expiresAt`, o cuando
no exista un entitlement comercial activo:

- en `guest_trial`, se bloquean todas las APIs demo y solo se conserva Login,
  registro y una nueva solicitud de trial si la política lo permite;
- en modalidades registradas, se bloquean todas las funciones operativas de la
  aplicación en API, dominio y UI;
- se conserva el acceso mínimo necesario a Pricing, Billing, Checkout,
  autenticación y cierre de sesión para usuarios registrados;
- se impide crear, actualizar, consultar o exportar datos operativos mientras no exista acceso comercial vigente;
- se muestra un modal bloqueante con una acción directa para contratar o renovar un plan;
- no se activa acceso por una redirección del navegador ni por un contador del cliente.

El bloqueo desaparece únicamente cuando el servidor confirma un trial vigente o una modalidad de pago activa.

Estado de implementación (2026-08-09): la capa UI aplica este contrato mediante
`CommercialAccessGate` en el shell de páginas protegidas. El componente consume
`commercialAccess.status` desde `/api/billing/me`, mantiene accesibles Pricing,
Billing/Checkout y autenticación, y ofrece contratación y cierre de sesión sin usar
el contador del cliente. La capa server-side compartida ya expone
`requireCommercialAccess(context)`, evalúa suscripción, trial y compra única con el
reloj del servidor y falla cerrado ante acceso expirado o ausente. El servicio de
Investigations la ejecuta antes de capacidades, entitlements y queries para listar,
consultar, crear, actualizar, archivar, restaurar o cerrar investigaciones. La ruta
`POST /api/generar-pdf` ya ejecuta el guard comercial y la capability
`investigations.export` antes de leer o procesar el payload, y devuelve errores
estructurados para sesión, membresía, acceso comercial, capability y entitlement.
El servicio tenant-scoped de Users también ejecuta `requireCommercialAccess({ tenantId })`
antes de resolver capacidades para miembros, invitaciones, roles y overrides; la
aceptación de invitaciones y las superficies de autenticación, Billing y Checkout
permanecen fuera de este guard.
Para suscripciones valida `investigations.export_pdf`; para trial valida la política
registrada del tenant (`enabled` y `allow_pdf`), y para compra única exige un grant
activo. En suscripciones, la reserva atómica de
`investigations.export_pdf_monthly` usa un contador tenant-scoped por mes calendario,
consulta el límite vigente del plan y registra la reserva en auditoría antes de
generar el documento. Además, la ruta consume el rate limit específico
`billing/pdf_export` por tenant antes de leer el payload. La validación de payload
usa el límite bruto de `900 KiB`, el límite específico de estado de `768 KiB` y
`investigationStateSchema` antes de ejecutar el análisis o renderizar HTML.
La carpeta temporal de Chrome se elimina mediante `try/finally`, incluso si falla
la escritura, la ejecución del navegador o la lectura del PDF.
La estrategia de renderer para producción quedó resuelta: `POST /api/generar-pdf`
prioriza Chrome/Edge local o la ruta definida por `CHROME_PATH`, y en Linux usa
`@sparticuz/chromium@149.0.0` mediante `executablePath()` con sus argumentos de
serverless. `next.config.ts` externaliza el paquete e incluye sus binarios
Brotli y runtime en el tracing específico de la ruta; el handler declara
`maxDuration = 70` para cubrir el timeout interno de 60 segundos y la limpieza.

### 7.7. Autenticación por Magic Link (Passwordless para usuarios registrados con email verificado)

1. **Requisito previo obligatorio**: El envío de un Magic Link está reservado estrictamente para usuarios previamente registrados en Supabase Auth (`auth.users`) con correo electrónico verificado (`email_confirmed_at IS NOT NULL`) y perfil activo (`status = 'active'`).
2. **Protección contra accesos no registrados o no confirmados**: Si se solicita un Magic Link con un correo no registrado o cuyo correo no haya sido confirmado aún, el servidor **no creará identidades anónimas ni enviará accesos mágicos**. Devuelve una respuesta de error estructurada (`auth.userNotFoundOrUnverified` / `auth.emailNotConfirmed`) indicando que el usuario debe registrarse formalmente o confirmar su correo previamente.
3. **Endpoint API `POST /api/auth/magic-link`**:
   - Recibe el payload `{ email }` y aplica validación de esquema Zod + rate limiting estricto por IP y Email (`auth/magic-link`).
   - Verifica en el servidor la existencia del usuario y su estado de confirmación.
   - Envia el OTP/enlace a través de `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo:`${NEXT_PUBLIC_APP_URL}/api/auth/callback`} })`.
   - Retorna una respuesta JSON `{ ok: true, messageKey: 'auth.magicLinkSent' }`.
4. **Flujo de Callback y Procesamiento de Sesión**:
   - El usuario hace clic en el enlace recibido en su correo, redirigiendo a `/api/auth/callback?code=...`.
   - El callback existente ejecuta `supabase.auth.exchangeCodeForSession(code)`, establece la cookie de sesión `HttpOnly`, valida estado de suspensión, MFA (si aplica) y redirige al flujo de destino correspondiente (`/apps/investigator` o `next`).
5. **Integración con la UI (Login)**:
   - La pantalla de Login (`src/views/pages/auth/login/`) conmuta a un estado de Magic Link al presionar la opción correspondiente.
   - Solicita únicamente el correo del usuario registrado, ofreciendo estados visuales de carga, éxito ("Enlace enviado a tu bandeja de entrada") o error ("Usuario no registrado o correo no verificado").

---

## 8. Arquitectura de Supabase

### 8.1. Clientes

Se crearán clientes separados:

```text
src/lib/supabase/browser.ts
src/lib/supabase/server.ts
src/lib/supabase/admin.ts
```

- `browser`: operaciones limitadas desde Client Components.
- `server`: lectura de sesión y operaciones con RLS desde Server Components/Route Handlers.
- `admin`: únicamente para webhooks y operaciones administrativas estrictamente controladas.

`admin.ts` no se importará desde componentes cliente.

### 8.2. Variables de entorno

Se documentarán placeholders en `.env.example`, nunca valores reales:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=
```

Si el proyecto Supabase utiliza la clave `anon` en lugar de `publishable`, se documentará el nombre exacto elegido. `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` serán exclusivamente server-side.

### 8.3. Sesiones

- Cookies seguras y `HttpOnly` cuando la integración lo permita.
- Renovación de sesión mediante el patrón SSR compatible con Next.js 16.
- No guardar investigaciones, tokens de acceso ni grants en `localStorage`.
- No confiar en datos de usuario suministrados por el cliente.

La sesión guest no utilizará Supabase Auth ni `signInAnonymously`. Se emitirá
únicamente después de la solicitud explícita de trial, con una cookie firmada,
`HttpOnly`, `Secure` en producción, `SameSite=Lax` y expiración corta. El estado
de la sesión se almacenará preferentemente en Upstash/Redis con:

```text
guestSessionId
policyId
policyVersion
moduleEntitlements
actionEntitlements
startedAt
expiresAt
rateLimitKey
eligibilityKeyHash
trialConsumedAt
claimNonce
claimedAt
```

No se almacenarán PII innecesarias, `tenant_id`, investigaciones reales ni
tokens de Supabase en la sesión. El servidor validará firma, expiración, versión
de política, modalidad y elegibilidad en cada API guest. La revocación o
expiración elimina el payload activo, pero puede conservar únicamente un
tombstone hash de elegibilidad y consumo durante el período antifraude definido
por la política; ese tombstone no es una identidad reutilizable ni contiene
fingerprints crudos o PII innecesaria. La reclamación posterior a la confirmación
del email se ejecuta una sola vez mediante `claimNonce` y una actualización
atómica.

La implementación debe consultar la documentación local de la versión instalada de Next.js antes de elegir entre los mecanismos de proxy, layouts y Route Handlers.

---

## 9. Modelo de datos

Las tablas se crearán mediante migraciones SQL de Supabase con nombres ISO:

```text
YYYY-MM-DDTHH-MM-SS_descripcion.sql
```

### 9.1. `profiles`

Perfil de aplicación asociado a `auth.users`.

```text
id uuid primary key references auth.users(id)
display_name text
avatar_url text
locale text
timezone text
status text check (status in ('active', 'suspended', 'deleted'))
vid_status text check (vid_status in ('pending', 'verified', 'rejected'))
vid_verified_at timestamptz
created_at timestamptz
updated_at timestamptz
```

El email y la verificación de email pertenecen a Supabase Auth. El estado VID de aplicación se conservará en `profiles` como señal de seguridad independiente del acceso comercial. No será requisito para activar trial, compra única, suscripción, investigaciones ni exportación PDF.

No se almacenarán documentos de identidad crudos en Supabase. El resultado y los metadatos mínimos de VID se conservarán durante el período mínimo definido por la política de seguridad y la legislación aplicable.

### 9.2. `tenants`

```text
id uuid primary key
name text not null
slug text unique not null
status text check (status in ('active', 'suspended', 'archived'))
created_by uuid references auth.users(id)
created_at timestamptz
updated_at timestamptz
```

### 9.3. `memberships`

```text
id uuid primary key
tenant_id uuid not null references tenants(id)
user_id uuid not null references auth.users(id)
role_id uuid not null references roles(id)
status text check (status in ('pending', 'active', 'suspended', 'revoked'))
invited_at timestamptz
accepted_at timestamptz
created_at timestamptz
updated_at timestamptz
unique (tenant_id, user_id)
```

### 9.4. `roles`

Los roles son presets de capacidades, no fronteras de seguridad.

```text
id uuid primary key
tenant_id uuid references tenants(id)
key text not null
name text not null
is_system boolean not null default false
created_at timestamptz
unique (tenant_id, key)
```

Los roles de sistema iniciales serán `owner`, `admin`, `analyst` y `viewer`. `registered_trial`, `registered_one_time` e `invited` no serán roles.

### 9.5. `capabilities`

El catálogo de base de datos debe coincidir con `src/features/access/capabilityManifest.ts`.

```text
key text primary key
description text not null
resource text not null
action text not null
is_active boolean not null default true
created_at timestamptz
```

### 9.6. `role_capabilities`

```text
role_id uuid references roles(id)
capability_key text references capabilities(key)
primary key (role_id, capability_key)
```

### 9.7. `member_capability_overrides`

```text
membership_id uuid references memberships(id)
capability_key text references capabilities(key)
effect text check (effect in ('allow', 'deny'))
reason text
created_by uuid references auth.users(id)
created_at timestamptz
primary key (membership_id, capability_key)
```

El resultado efectivo se calcula con precedencia explícita:

```text
deny override > allow override > role capability > deny
```

Los cambios de overrides son auditables.

### 9.8. `invitations`

```text
id uuid primary key
tenant_id uuid not null references tenants(id)
workspace_id uuid not null references workspaces(id)
email text not null
role_id uuid not null references roles(id)
token_hash text not null
expires_at timestamptz not null
accepted_at timestamptz
revoked_at timestamptz
created_by uuid references auth.users(id)
created_at timestamptz
updated_at timestamptz
delivery_status text check (delivery_status in ('pending', 'sent', 'failed'))
delivered_at timestamptz
```

Nunca se guarda el token plano.

### 9.9. `plans`

El plan es producto comercial; no es un rol.

```text
id uuid primary key
code text unique not null
name text not null
description text
provider_product_id text
provider_price_id text
currency text not null
interval text check (interval in ('one_time', 'month', 'year'))
duration_seconds integer check (duration_seconds is null or duration_seconds > 0)
amount_minor integer not null
is_active boolean not null default true
display_order integer not null default 0
created_at timestamptz
updated_at timestamptz
```

### 9.9.1. Modalidades de Pago Único (`interval = 'one_time'`): Lifetime vs Temporal

Los planes con `interval = 'one_time'` soportan dos modalidades comerciales diferenciadas mediante el campo `duration_seconds`:

1. **Plan de Pago Único Vitalicio (Lifetime)**:
   - `interval = 'one_time'`
   - `duration_seconds = null`
   - Al completarse el Checkout en Stripe, el webhook activa el grant con `access_grants.expires_at = null`.
   - El motor de acceso (`evaluateCommercialGrant`) evalúa `expires_at === null` como acceso activo permanente sin expiración ni renovaciones.

2. **Plan de Pago Único Temporal (One-Time / Pase 24 Horas Configurable)**:
   - `interval = 'one_time'`
   - `duration_seconds = 86400` (o el valor en segundos que el Super Admin configure desde la interfaz de administración en horas o días).
   - Al completarse el Checkout en Stripe, el webhook calcula dinámicamente `access_grants.expires_at = starts_at + plan.duration_seconds`.
   - Al transcurrir la ventana de tiempo configurada, el motor de acceso evalúa el grant como `expired` y restringe el acceso comercial a la plataforma.

### 9.10. `plan_entitlements`

```text
plan_id uuid references plans(id)
entitlement_key text not null
limit_value numeric
is_enabled boolean not null default true
primary key (plan_id, entitlement_key)
```

Ejemplos:

```text
investigations.create
investigations.max_active
investigations.export_pdf
investigations.export_pdf_monthly
users.max_members
modules.investigator
actions.investigator.context.read
actions.investigator.efi.execute
storage.max_bytes
```

Las claves `modules.*` controlan qué aplicación aparece y puede abrirse. Las
claves `actions.*` controlan acciones comerciales concretas dentro de la
aplicación. Ambas siguen necesitando la capacidad funcional correspondiente
cuando el actor es un usuario registrado. Para un `guest_trial`, la política es
la allowlist máxima de acciones de la demo.

Límites iniciales aprobados:

| Plan | Investigaciones activas | Miembros | Almacenamiento | PDFs mensuales |
| --- | ---: | ---: | ---: | ---: |
| Basic | 5 | 1 | 100 MiB | 10 |
| Team | 50 | 10 | 1 GiB | 100 |
| Enterprise | Configurable | Configurable | Configurable | Configurable |

Los límites se almacenarán como entitlements server-side y se validarán antes de cada operación. Enterprise no significa ilimitado por defecto: sus valores deberán configurarse explícitamente por tenant.

### 9.10.1. `platform_modules`

Catálogo global de aplicaciones/módulos que NovaStore puede ofrecer. No es una
tabla tenant-scoped y no concede acceso por sí misma; solo define el catálogo y
la metadata de navegación.

```text
key text primary key
name text not null
description text
route text not null
is_active boolean not null default true
display_order integer not null default 0
created_at timestamptz
updated_at timestamptz
updated_by uuid references auth.users(id)
```

El acceso efectivo se concede únicamente mediante entitlements de plan, trial,
licencia u override. La lectura administrativa y las mutaciones estarán
limitadas a capacidades de plataforma, especialmente `super_admin`, y quedarán
auditadas con `tenant_id = null` cuando correspondan al catálogo global.

### 9.11. `subscriptions`

La suscripción pertenece exclusivamente al `tenant`/organización propietaria
del workspace. No contiene `user_id` ni se duplica por cada miembro: el
workspace propietario y sus miembros activos consumen el mismo plan,
entitlements y período comercial. Las operaciones de compra deben verificar la
política `billing_purchase_policy` y la membresía activa en el workspace; las
operaciones de administración deben verificar además la autorización de
propietario o la delegación administrativa explícita correspondiente.

```text
id uuid primary key
tenant_id uuid not null references tenants(id)
plan_id uuid not null references plans(id)
provider_customer_id text not null
provider_subscription_id text unique not null
status text not null
current_period_start timestamptz
current_period_end timestamptz
cancel_at_period_end boolean not null default false
canceled_at timestamptz
created_at timestamptz
updated_at timestamptz
```

### 9.12. `billing_customers`

```text
id uuid primary key
tenant_id uuid references tenants(id)
provider_customer_id text unique not null
billing_email text
country text
tax_id text
created_at timestamptz
updated_at timestamptz
```

### 9.13. `billing_invoices`

```text
id uuid primary key
tenant_id uuid references tenants(id)
provider_invoice_id text unique not null
status text not null
number text
amount_minor integer not null
currency text not null
issued_at timestamptz
paid_at timestamptz
hosted_invoice_url text
created_at timestamptz
updated_at timestamptz
```

Las facturas no se eliminan físicamente.

Los pagos e invoices se conservarán durante un mínimo de 7 años, o durante el plazo superior que exija la legislación aplicable. Se aplicarán archivado y controles de acceso, no borrado físico durante una retención legal.

### 9.14. `billing_webhook_events`

```text
id uuid primary key
provider text not null
provider_event_id text not null
event_type text not null
payload_sanitized jsonb not null
status text check (status in ('received', 'processed', 'failed'))
processed_at timestamptz
error_code text
created_at timestamptz
unique (provider, provider_event_id)
```

Esta tabla garantiza idempotencia y trazabilidad de webhooks.

### 9.15. `trial_policies`

Configuración administrable desde backend.

```text
id uuid primary key
scope text check (scope in ('platform', 'tenant'))
tenant_id uuid references tenants(id)
enabled boolean not null default true
duration_seconds integer not null
starts_on text check (starts_on in ('first_access', 'first_action'))
max_sessions integer not null default 1
allow_guest boolean not null default false
allow_pdf boolean not null default false
allow_checkout boolean not null default true
updated_by uuid references auth.users(id)
updated_at timestamptz
```

La política global la podrá modificar únicamente un administrador de plataforma
con `billing.trial.manage`. Si `allow_guest = true`, esa política podrá ser
solicitada por visitantes como `guest_trial`; `allow_checkout` nunca habilita
Checkout para un guest y se fuerza a `false` en ese contexto.

La política `tenant` configurará el trial de cada workspace para usuarios
registrados. Una política `platform` podrá servir como configuración global del
guest trial y como valor inicial durante la creación del workspace. La política
no concede por sí sola acceso a datos tenant-scoped. Cuando `allow_guest = true`,
`max_sessions` contará sesiones por la clave de elegibilidad server-side definida
por la plataforma, no por cookies ni por el almacenamiento del navegador. El
valor predeterminado será absolutamente único (`max_sessions = 1`); un valor
superior solo podrá habilitarse mediante una política de plataforma explícita,
rate limiting y controles antifraude. La solicitud de una nueva sesión se
rechazará de forma atómica cuando se alcance el máximo.

### 9.15.1. `trial_policy_entitlements`

Define los módulos, acciones y límites que cada política de trial concede.

```text
policy_id uuid not null references trial_policies(id)
entitlement_key text not null
limit_value numeric
is_enabled boolean not null default true
primary key (policy_id, entitlement_key)
```

Las claves se validarán contra el catálogo de módulos y acciones permitido por la
plataforma. La configuración de un trial no podrá habilitar una acción que no
exista en `capabilityManifest` ni una ruta que no esté registrada en
`platform_modules`.

### 9.16. `access_grants`

```text
id uuid primary key
tenant_id uuid not null references tenants(id)
user_id uuid not null references auth.users(id)
mode text check (mode in ('trial', 'one_time'))
policy_id uuid references trial_policies(id)
source_plan_id uuid references plans(id)
provider_checkout_id text
provider_payment_id text
starts_at timestamptz not null
expires_at timestamptz
max_uses integer not null default 1
used_uses integer not null default 0
status text check (status in ('pending', 'active', 'consumed', 'expired', 'revoked'))
consumed_at timestamptz
created_at timestamptz
updated_at timestamptz
```

Esta tabla no contiene `InvestigationState`. Los grants `registered_trial` y
`registered_one_time` solo pueden activar acceso para usuarios autenticados con
email confirmado y membresía activa. Un `guest_trial` no crea filas aquí:
utiliza la sesión efímera definida en 8.3. El estado VID no se consulta como
guard comercial.

Para grants `one_time`, el valor de `expires_at` se calcula dinámicamente según
el plan de origen (`source_plan_id`):

- Si `plans.duration_seconds IS NULL` (Plan Lifetime), se establece `expires_at = null` (acceso vitalicio permanente).
- Si `plans.duration_seconds` tiene un valor entero positivo (Plan temporal de 24h u otra duración configurada por SA), se establece `expires_at = starts_at + make_interval(secs => plans.duration_seconds)`.

Los grants registrados copiarán los módulos, acciones y límites aplicables en una
tabla append-only asociada, para que una modificación posterior de la política
no cambie silenciosamente los términos de un trial ya iniciado o de una licencia
one-time.

### 9.16.1. `access_grant_entitlements`

Snapshot de entitlements concedidos por un grant registrado.

```text
grant_id uuid not null references access_grants(id)
entitlement_key text not null
limit_value numeric
is_enabled boolean not null default true
source text check (source in ('trial_policy', 'plan', 'manual'))
primary key (grant_id, entitlement_key)
```

Los cambios de grants y snapshots serán transaccionales, tenant-scoped y
auditados. Las suscripciones continuarán resolviendo los entitlements vigentes
del plan y sus overrides, salvo que una decisión posterior defina snapshots
específicos para renovaciones.

### 9.17. `investigations`

```text
id uuid primary key
tenant_id uuid not null references tenants(id)
owner_id uuid not null references auth.users(id)
title text not null
status text not null
archived_at timestamptz
state jsonb not null
schema_version integer not null
version integer not null default 1
created_at timestamptz
updated_at timestamptz
updated_by uuid references auth.users(id)
```

Índices mínimos:

```text
(tenant_id, updated_at desc)
(tenant_id, owner_id, updated_at desc)
(tenant_id, status)
```

### 9.18. `investigation_revisions`

```text
id uuid primary key
investigation_id uuid not null references investigations(id)
tenant_id uuid not null references tenants(id)
version integer not null
state jsonb not null
reason text not null
changed_by uuid references auth.users(id)
created_at timestamptz
unique (investigation_id, version)
```

Las revisiones son append-only.

### 9.19. `audit_logs`

```text
id uuid primary key
tenant_id uuid references tenants(id)
actor_user_id uuid references auth.users(id)
source text check (source in ('user', 'admin', 'system', 'migration'))
action text not null
entity_type text not null
entity_id uuid
before_data jsonb
after_data jsonb
metadata jsonb
created_at timestamptz
```

No se registrarán secretos, tokens ni payloads completos de pago.

Los registros de auditoría se conservarán durante un mínimo de 7 años, o durante el plazo superior que exija la legislación aplicable. Permanecerán append-only y no se eliminarán físicamente durante una retención legal.

### 9.20. `pending_registrations`

Tabla no tenant-scoped y no visible para clientes. Conserva únicamente los
datos mínimos necesarios para completar un registro después de la confirmación
del email:

```text
user_id uuid primary key references auth.users(id)
display_name text not null
company_name text nullable
created_at timestamptz
```

El registro se inserta con `service_role`; la finalización se ejecuta mediante
`complete_pending_registration(auth.uid())`, una función SQL `security
definer` idempotente que crea el perfil y, solo para registros directos, el
tenant principal, el workspace `General`, sus membresías y la política inicial
de trial.

La tabla se limpia únicamente mediante la capacidad de plataforma
`platform.auth.registrations.manage`, asignada al rol `super_admin`. La
retención global es configurable entre 1 y 3650 días (30 por defecto) y la
limpieza manual elimina solo intenciones no confirmadas, nunca filas de
`auth.users`. Cada cambio de retención y cada ejecución de limpieza se registra
en `audit_logs` con `tenant_id = null`, `source = 'admin'` y el actor de
plataforma.

### 9.21. Catálogo y administración de plataforma

`platform_roles` y `platform_memberships` son el ámbito de autorización para
NovaStore. `super_admin` no se modela como un rol tenant-scoped ni se obtiene
por pertenecer al tenant del cliente.

El administrador de plataforma podrá administrar:

- catálogo de módulos;
- entitlements `modules.*` y `actions.*` de planes;
- entitlements de `trial_policies`;
- productos, licencias y asociaciones con módulos;
- overrides excepcionales registrados;
- auditoría global de cambios.

Cada escritura requerirá una capacidad de plataforma, una validación server-side
y una entrada append-only en `audit_logs` con `tenant_id = null` cuando el
cambio sea global. El catálogo no podrá conceder a un guest una acción fuera de
la política guest trial activa.

### 9.22. Centro único de Roles y Permisos multiámbito

NovaStore tendrá una única superficie funcional para administrar roles y
capacidades: `/apps/roles` y `/apps/permissions`. No existirán pantallas
paralelas para roles de plataforma y roles de tenant. Las tablas internas
seguirán separadas (`platform_roles`/`platform_role_capabilities` y
`roles`/`role_capabilities`) para conservar RLS, referencias y tenant scope,
pero el servicio y el DTO de administración expondrán un modelo unificado con
un `scope` explícito:

```text
platform
tenant(tenant_id)
all_tenants   # solo lectura/selección disponible para un SA autorizado
```

El contexto de la UI no será un filtro confiado al cliente. Cada petición deberá
validar server-side:

- identidad registrada con email confirmado y membresía platform o tenant activa;
- capacidad de lectura o gestión correspondiente al ámbito solicitado;
- tenant objetivo perteneciente al actor, salvo una capacidad platform explícita
  de gestión tenant cross-tenant;
- que una capacidad `platform.*` nunca se asigne a un rol tenant;
- que un rol platform nunca se asigne a una membresía tenant.

El manifiesto único añadirá las capacidades meta-administrativas:

```text
platform.access.roles.read
platform.access.roles.manage
platform.access.capabilities.read
platform.access.capabilities.manage
platform.access.tenant_roles.manage
```

`super_admin` recibirá estas capacidades como asignaciones reales en
`platform_role_capabilities`. Las capacidades no serán un bypass: todas las
lecturas, escrituras, RPC y mutaciones de UI deberán comprobarlas. Las
capacidades existentes (`platform.memberships.manage`, `platform.billing.manage`
u otras) se reutilizarán para sus dominios y no se duplicarán.

Los roles system (`owner`, `admin`, `analyst`, `viewer` y `super_admin`) tendrán
clave, ámbito y existencia protegidos. Un actor platform autorizado podrá
modificar su nombre, estado y asignaciones de capacidades mediante la misma UI,
pero no podrá cambiar la clave ni mover el rol de ámbito. Los roles tenant
personalizados podrán crearse y editarse en el tenant objetivo. Los roles
globales tenant se mostrarán en el mismo listado y solo podrán modificarse por
un actor platform con `platform.access.roles.manage`.

Las operaciones de alto impacto deberán cumplir todas estas reglas:

- nunca se permite que un actor se conceda a sí mismo una capacidad que no
  poseía al inicio de la operación;
- una mutación del propio rol platform que pueda añadir capacidades, elevar el
  ámbito o retirar capacidades críticas exige segunda aprobación explícita o
  una transición equivalente definida por el backend;
- no se puede suspender, revocar, eliminar o degradar al último
  `super_admin` activo;
- siempre debe quedar al menos un `super_admin` activo con capacidades críticas
  de recuperación (`platform.access.roles.manage`,
  `platform.access.capabilities.manage` y `platform.memberships.manage`);
- toda operación cross-tenant se audita con `tenant_id = null`, `source = 'admin'`,
  actor, tenant objetivo, estado anterior y estado posterior;
- las escrituras usan transacción, bloqueo de la fila afectada y optimistic
  locking (`updated_at` o `version`) para devolver conflicto `409` sin
  sobrescribir cambios concurrentes.

La matriz de Permissions mostrará todas las capacidades del manifiesto agrupadas
por ámbito, recurso y acción. Las capacidades fuera del ámbito administrable
aparecerán bloqueadas con la razón correspondiente; el frontend nunca será la
frontera de seguridad. La pantalla Roles mostrará roles platform, roles globales
tenant y roles personalizados del tenant seleccionado, con indicadores de scope,
tenant, estado y miembros.

### 9.23. Gobernanza de Navegación del Shell: Apps vs Platform

Para preservar la coherencia del ecosistema NovaStore ERP y garantizar una separación estricta entre software de negocio para el usuario final y herramientas de administración, la estructura del Shell lateral (`Sidebar.tsx` y `navConfig.tsx`) se rige por las siguientes reglas:

1. **Grupo `Apps` (Software de Negocio / Usuario Final):**
   - Reservado exclusivamente para las aplicaciones comerciales del tenant (p. ej. `Investigator`).
   - Visible para los miembros del tenant que cuenten con el módulo o la licencia correspondiente (p. ej. `analyst`, `viewer`, `admin`, `owner`).

2. **Grupo `Platform` (Gobernanza, Administración y Configuración):**
   - Concentra todas las aplicaciones y centros de control administrativo y de gobernanza:
     - **`Users`** (`/apps/users/list`, `/apps/users/view`, `/apps/users/invitations`): Gestión de miembros e invitaciones del workspace/tenant.
     - **`Roles & Permissions`** (`/apps/roles`, `/apps/permissions`): Centro único de administración de roles y matriz de capacidades.
     - **`Platform Billing`** (`/apps/platform/billing`): Gestión comercial de planes, suscripciones, módulos y políticas.
     - **`Digital Verification Identity (VID)`** (`/apps/platform/vid`): Cola de revisión de identidades digitales.
     - **`Registration cleanup`** (`/apps/platform/registration-cleanup`): Depuración de registros pendientes.

3. **Control de Acceso Estricto (Exclusivo para SA y Admin):**
   - A las secciones de administración (`Users` y `Roles & Permissions`) **solo pueden acceder usuarios con rol Super Admin (`sa`) o Administrador de Tenant (`admin` / `owner`)**.
   - **Capa 1 (Filtrado en UI / Sidebar):** En `Sidebar.tsx`, los ítems de `Platform` se filtran mediante `filterPlatformMenuItems` y las capacidades de acceso funcional (`users.read`, `users.invite`, `access.read`, `access.manage`, `platform.access.*`). Si el usuario autenticado tiene rol estándar (`analyst`, `viewer`, etc.) o es una sesión guest, estos ítems no se renderizan en pantalla.
   - **Capa 2 (Protección de Rutas):** Las vistas asociadas (`/apps/users/*`, `/apps/roles`, `/apps/permissions`) implementan validación de capabilities y deniegan el acceso a usuarios sin privilegios administrativos.
   - **Capa 3 (Protección de API y Dominio):** Todos los endpoints de usuarios y accesos (`/api/users/*`, `/api/access/*`, `/api/admin/*`) validan rigurosamente el tenant scope y las capacidades requeridas.

### 9.24. Arquitectura Integral de User Profile (4 Tabs: Profile, Connections, Teams, Projects)

La sección **User Profile** (`/pages/user-profile`) abandona completamente el uso de datos sintéticos o plantillas (`fake-db`) y pasa a integrarse al 100% con los modelos relacionales de Supabase (`profiles`, `memberships`, `workspaces`, `investigations`, `kanban_tasks` y `audit_logs`).

#### 1. Header Unificado (Común a las 4 pestañas)

- **Avatar Dinámico:** Obtenido de `profiles.avatar_url` con fallback a iniciales de dos letras.
- **Nombre Completo:** Obtenido de `profiles.display_name`.
- **Rol Institucional (`institutional.role`):** Cargo funcional del usuario (ej. *Investigador Principal*, *Desarrollador*, *Diseñador*, *Líder Metodológico*, *Auditor*).
- **Tenant y Ubicación:** Nombre de la organización (`tenants.name`) y país (`profiles.country` o `profiles.locale`).
- **Fecha de Ingreso:** Mes y año de registro (`profiles.created_at`).
- **Botonera:** Botón de estado de conexión (`Connected`) o edición de perfil.

#### 2. Especificación de las 4 Pestañas

1. **Pestaña `Profile` (`/pages/user-profile?view=profile`):**
   - **About & Contacts:** Nombre, estado de cuenta (`active`), rol de tenant e institucional, país, idiomas, teléfono, skype/chat, correo institucional (`profiles.email`) y organización.
   - **Teams List:** Equipos/Workspaces del tenant en los que participa el usuario con su conteo de miembros.
   - **Overview Metrics:** Indicadores cuantitativos consolidados: *Task Compiled* (tareas completadas en Kanban), *Connections* (total de colegas en el tenant) y *Projects Compiled* (total de investigaciones/proyectos creados).
   - **Activity Timeline:** Historial cronológico real alimentado por `audit_logs` del usuario (validaciones de expedientes, matrices EFI calculadas, exportaciones PDF generadas, etc.).
   - **Widgets Laterales:** Top 5 conexiones y top 5 equipos con accesos rápidos.
   - **Projects List DataTable:** Tabla interactiva con buscador, autor, avatares apilados y barra de progreso (%) de proyectos.

2. **Pestaña `Connections` (`/pages/user-profile?view=connections`):**
   - Rejilla responsive de 3 columnas con tarjetas de colegas del tenant (`memberships` + `profiles`).
   - Avatar centrado, nombre, cargo/rol institucional, badges de habilidades/tecnologías.
   - Métricas separadas verticalmente: `Projects` (proyectos compartidos), `Tasks` (tareas activas asignadas en Kanban) y `Connections`.
   - Botón `Connected`/`Connect` y botón de contacto directo vía email (`MailIcon`).

3. **Pestaña `Teams` (`/pages/user-profile?view=teams`):**
   - Rejilla responsive de 3 columnas con tarjetas de Workspaces (`workspaces`).
   - Icono/Logo representativo, título del equipo (*General, Planificación Estratégica, etc.*), estrella de favoritos, menú de 3 puntos.
   - Párrafo descriptivo del propósito del área/equipo.
   - Avatares apilados de miembros con contador remanente (`+N`) y badges de área/tecnología.

4. **Pestaña `Projects` (`/pages/user-profile?view=projects`):**
   - Rejilla responsive de 3 columnas con tarjetas de Proyectos e Investigaciones (`investigations`).
   - Brand/Icono del proyecto, título, organización/cliente evaluado, menú de 3 puntos.
   - Fila de puntuaciones estratégicas (**EFI/EFE**) o presupuesto, fecha de inicio y fecha límite.
   - Descripción del proyecto/investigación.
   - Indicador de horas, badge de días restantes y barra de progreso calculada en tiempo real: `Tasks: X/Y • % Completed` vinculada a las tarjetas del tablero Kanban.
   - Avatares de participantes, contador de comentarios y botón de acceso directo al espacio de trabajo.

### 9.25. App Kanban y Gestión Operativa Transversal (Proyectos, Tareas y CAME)

La plataforma incorpora la aplicación **Kanban** (`/apps/kanban`) como el motor operativo central que conecta las investigaciones estratégicas, los proyectos de NovaStore, la ejecución de planes CAME y las métricas en tiempo real de **User Profile** (`/pages/user-profile`).

#### 1. Modelo de Datos en Supabase (Tenant & Workspace Scoped con RLS)

```sql
-- 1. Columnas configurables del tablero por tenant y workspace
create table if not exists public.kanban_columns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  name text not null,
  slug text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- 2. Tareas del Kanban vinculadas a proyectos, miembros y acciones CAME
create table if not exists public.kanban_tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  column_id uuid not null references public.kanban_columns(id) on delete cascade,
  project_id uuid references public.investigations(id) on delete set null,
  title text not null,
  description text,
  priority text check (priority in ('low', 'medium', 'high', 'urgent')) default 'medium',
  due_date timestamptz,
  cover_image text,
  tags text[] default '{}',
  assignee_ids uuid[] default '{}',
  came_action_id text,
  position integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

#### 2. Modal de Creación / Edición de Tarjetas (`Edit card dialog`)

La interfaz del modal (`CardFormDialog`) implementa los controles exactos de la especificación:

1. **Title:** Input de texto validado con Zod (`z.string().min(1)`).
2. **Description:** Textarea para la descripción operativa.
3. **Priority:** Selector estilizado (`High`, `Medium`, `Low`, `Urgent`) con badges de color semántico.
4. **Card image:** Subida y previsualización de imagen de portada (almacenada en Supabase Storage o asset URL).
5. **Assignees:** Selector multi-badge de miembros del tenant/workspace (`profiles`).
6. **Due date:** Selector de fecha con componente Popover + Calendar.
7. **Acciones:** `Cancel` y `Save changes` con sincronización optimista y persistencia en `/api/kanban/tasks`.

#### 3. Integración Transversal en Todo el Ecosistema

1. **User Profile (`/pages/user-profile`):**
   - **`Profile`:** La métrica *Task Compiled* refleja las tareas en estado `Done` del usuario.
   - **`Connections`:** La métrica *Tasks* de cada tarjeta de colega calcula en tiempo real sus asignaciones activas.
   - **`Teams`:** Muestra los workspaces y el volumen de tareas en curso.
   - **`Projects`:** Cada tarjeta de proyecto calcula dinámicamente la barra `Tasks: X/Y • % Completed` y los miembros participantes a partir de sus tarjetas Kanban vinculadas (`project_id`).

2. **Investigador CAME (`/apps/investigator/came`):**
   - Cada acción formulada (Corregir, Afrontar, Mantener, Explotar) puede sincronizarse como tarjeta en el tablero Kanban con su responsable, indicador y fecha límite.

3. **Navegación del Shell (`navConfig.tsx` y `permissions.ts`):**
   - Se reactiva el enlace **Kanban** (`/apps/kanban`) con el icono `SquareKanbanIcon` dentro del grupo **`Apps`**, habilitando el permiso funcional `'apps.kanban'`.

---

## 10. RLS y tenant scope

### 10.1. Principios

- Toda tabla de negocio tendrá `tenant_id` o estará vinculada a una tabla con `tenant_id`.
- Nunca se confiará en filtros enviados desde el navegador.
- Las políticas usarán `auth.uid()` y membresías activas.
- Los visitantes sin sesión no tendrán acceso a tablas tenant-scoped.
- Una sesión `guest_trial` no tendrá acceso a `investigations` ni a ninguna tabla
  tenant-scoped; sus APIs solo podrán usar datos sintéticos o estado efímero
  previamente allowlisted.
- Los usuarios con email sin confirmar no tendrán acceso operativo registrado.
- El cliente nunca usará `service_role`.
- Las operaciones administrativas cross-tenant requieren una capacidad explícita y auditoría con `source = 'admin'`.

### 10.2. Helper de membresía

Se implementará una función SQL segura para resolver la membresía activa del usuario actual sin provocar recursión en las políticas:

```text
is_active_tenant_member(auth.uid(), tenant_id)
```

La función deberá fijar un `search_path` seguro, limitar su resultado y evitar consultas recursivas contra políticas que vuelvan a invocarla.

### 10.3. Políticas de investigaciones

Reglas previstas:

- `SELECT`: membresía activa y permiso de lectura, además de ownership o acceso explícito.
- `INSERT`: usuario registrado, membresía activa, permiso de creación y `owner_id = auth.uid()`.
- `UPDATE`: membresía activa, permiso de edición y control de versión.
- `DELETE`: no se utilizará para el ciclo normal; se usará archivado.
- `ARCHIVE/CLOSE`: acciones de dominio con capacidades independientes.
- visitante sin sesión, `guest_trial` o usuario con email sin confirmar: cero
  filas en `investigations`.

### 10.4. Billing

Las lecturas de Billing del tenant se limitarán al tenant del usuario. El
catálogo comercial público de Pricing podrá consultarse sin autenticación a
través de la ruta y el endpoint allowlisted de planes, sin exponer estado de
suscripción, invoices ni datos de una organización. Los webhooks de Stripe se
procesarán server-side tras validar la firma y usarán un cliente administrativo
únicamente durante una transacción controlada.

La sesión guest no podrá consultar ni mutar Billing del tenant. La resolución de
su trial se hará desde la política de plataforma y el estado efímero firmado,
sin exponer tablas administrativas al cliente.

---

## 11. Capacidades

Se creará un único manifiesto en:

```text
src/features/access/capabilityManifest.ts
```

Capacidades iniciales:

```text
investigations.read
investigations.create
investigations.update
investigations.archive
investigations.restore
investigations.close
investigations.export
users.read
users.invite
users.update
users.disable
access.read
access.manage
billing.plans.read
billing.checkout.create
billing.subscription.read
billing.subscription.manage
billing.invoices.read
billing.invoices.download
billing.plans.manage
billing.trial.read
billing.trial.manage
billing.entitlements.read
platform.access.roles.read
platform.access.roles.manage
platform.access.capabilities.read
platform.access.capabilities.manage
platform.access.tenant_roles.manage
platform.tenants.read
platform.tenants.create
platform.tenants.manage
platform.memberships.manage
platform.users.read
platform.vid.read
platform.vid.review
platform.billing.manage
platform.audit.read
platform.auth.registrations.manage
```

La resolución efectiva se implementará en un servicio server-side:

```text
getCurrentPrincipal()
requireAuthenticatedUser()
requireTenantMembership(tenantId)
requireCapability(capability, context)
requireEntitlement(entitlement, context)
requireCommercialAccess(context)
requireModuleAccess(moduleKey, context)
requireActionEntitlement(actionKey, context)
resolveEffectiveNavigation(context)
getPlatformCapabilities()
requirePlatformCapability(capability, context)
resolveUnifiedAccessContext(context)
```

`requireModuleAccess` comprobará identidad o modalidad guest permitida, trial/plan
vigente, entitlement `modules.*`, expiración y contexto tenant cuando exista.
`requireActionEntitlement` comprobará el entitlement `actions.*` y, para
usuarios registrados, la capacidad funcional correspondiente. En guest no se
resolverán roles generales: la política guest trial será la allowlist máxima de
la demo.

La UI podrá usar un `PermProvider` alimentado por el resolver server-side para
navegación y botones, pero nunca será la única capa. Toda acción nueva deberá
declararse en `CAPABILITY_MANIFEST`; no se creará un manifiesto paralelo.
Las capacidades platform se expondrán separadas de las tenant en el snapshot
efectivo y no podrán derivarse del rol tenant ni de entitlements comerciales.

---

## 12. Billing & Plans

### 12.1. Fuente de verdad

La fuente de verdad será:

```text
Stripe → estado del pago y suscripción
Supabase → copia sincronizada, entitlements y autorización local
UI → representación del estado server-side
```

El contexto de Billing se resuelve por el tenant/organización propietaria del
workspace seleccionado. El usuario autenticado solo aporta identidad,
membresía, workspace y capacidades; no puede convertir su propia cuenta en
titular comercial ni enviar un tenant distinto en el body. La UI podrá mostrar
el plan del tenant a miembros autorizados, pero no etiquetarlo como un plan
individual.

El cliente nunca podrá cambiar:

- precio;
- currency;
- plan;
- estado de suscripción;
- fecha de expiración;
- límites;
- acceso concedido por pago.

### 12.2. Productos

Productos iniciales:

```text
guest_trial       trial temporal solicitado por un visitante sin cuenta
registered_trial  acceso temporal sin pago para usuario autenticado con email confirmado
one_time_access   pago único temporal para usuario autenticado con email confirmado (duración configurable por SA, ej. 24h)
lifetime          pago único vitalicio para usuario autenticado con email confirmado con acceso permanente sin expiración
basic             suscripción mensual/anual
team              suscripción mensual/anual
enterprise        suscripción administrada
```

`guest_trial` y `registered_trial` no son necesariamente productos de Stripe; son políticas de acceso. El primero usa una sesión temporal y el segundo un grant tenant-scoped. El contenido funcional de ambos se define mediante módulos y acciones de la política de trial.

#### 12.2.1. Clasificación Comercial: Flexible Access vs Workspace Plans

Los planes comerciales se distribuyen funcionalmente según la naturaleza y duración del acceso:

1. **Flexible Access (Pases Temporales y Puntuales):**
   - Corresponde a ofertas de acceso acotadas en el tiempo (`interval === 'one_time' && duration_seconds !== null`), por ejemplo pases de 24h, 72h o para 1 investigación específica (`one_time_access`).
   - Permiten evaluar o ejecutar flujos de trabajo aislados sin comprometer un workspace permanente ni generar cobros recurrentes.
2. **Workspace Plans (Planes de Espacio de Trabajo):**
   - Incluyen tanto las suscripciones recurrentes (`interval === 'month' | 'year'`, ej. `basic`, `team`, `enterprise`) como los planes de **acceso permanente vitalicio (`interval === 'one_time' && duration_seconds === null`, ej. `lifetime`)**.
   - Estos planes otorgan acceso indefinido o continuo al espacio de trabajo colaborativo.

#### 12.2.2. Progresión Natural de Precios y Descripciones Dinámicas

1. **Ordenación por Progresión de Precios:**
   - La presentación de los planes en todas las interfaces (Pricing, Upgrade Wizard, Panel de Ajustes) se rige por su **precio ascendente (`amount_minor ASC`)**, evitando esquemas de ordenación artificiales.
   - De este modo, la jerarquía comercial progresa naturalmente:
     `One-time ($4.99) → Individual ($9.99/mes) → Team ($29.99/mes) → Enterprise ($99.99/mes) → Lifetime ($149.99/pago único vitalicio)`.
2. **Gestión Dinámica de Descripciones desde la Plataforma Comercial:**
   - La tabla `public.plans` almacena la descripción en la columna `description TEXT`.
   - El panel de administración de facturación (`/apps/platform/billing`) provee el control de edición de descripciones en el modal de planes.
   - Todas las vistas del sistema consumen la descripción persistida desde la API, eliminando textos hardcodeados en el código.

#### 12.2.3. Matriz Comparativa de Planes y Metadatos Dinámicos de Módulos (Pricing Details)

Para optimizar la claridad, transparencia y conversión comercial bajo los estándares de diseño shadcn/ui:

1. **Estructura Visual de Pricing (`/pages/pricing`):**
   - **Header:** Título institucional *Pricing Details* y subtítulo descriptivo en una única pantalla integral continua (sin pestañas ni filtros artificiales de mes/año/flexible).
   - **Cabecera Plana 1:1 (`table-fixed`):** La sección superior de precios y llamadas a la acción se implementa con diseño plano directamente sobre la tabla (`TableHeader`), sin tarjetas encasilladas ni bordes pesados, logrando una estética moderna y limpia con alineación vertical perfecta.
   - **Primera Columna con Ajuste de Texto Seguro:** La columna de *Capacidades & Límites* (`w-[280px] min-w-[260px] max-w-[320px]`) implementa ajuste de texto (`break-words`, `overflow-hidden`, padding derecho generoso) para garantizar que los títulos y descripciones extensas queden estrictamente confinados en su celda sin invadir las columnas de los planes.
   - **Matriz Comparativa de Capacidades (`Comparison Matrix`):** Tabla de desglose estructurada por categorías que compara las prestaciones de todos los planes en orden natural de precio (`Try Demo → One-time → Individual → Team → Pro → Enterprise → Lifetime`):
     - **Módulos de Plataforma:** Categorías generadas dinámicamente según `public.platform_modules` (ej. *App Investigator*, *App Kanban*).
     - **Espacio de Trabajo & Colaboración:** Límites de usuarios/colaboradores (`users.max_members`), equipos (`teams.max_teams`) y almacenamiento (`storage.max_bytes`).
     - **Celdas de Comparativa:** Muestran icono semántico `✓` para funcionalidades incluidas/ilimitadas, `—` para no incluidas, o el valor de límite formateado (ej. `10 al mes`, `50 activas`, `1 GB`).
   - **Footer de Conversión:** Botones de acción replicados al pie de cada columna para permitir el inicio del checkout o contacto tras la revisión de la matriz.
2. **Gobernanza de Visibilidad y Modo de Adquisición en Plataforma (`public.plans`):**
   - `is_public` (BOOLEAN): Controla si el plan es visible en las pantallas públicas de `/pages/pricing` y `/pages/billing/upgrade`. Los planes con `is_public = false` se reservan para asignaciones directas o acuerdos privados.
   - `contact_sales` (BOOLEAN): Define si el plan se adquiere vía autoservicio con Stripe Checkout (`false`) o mediante solicitud de cotización / contacto comercial (`true`), abriendo un formulario directo de cotización personalizada.
   - **Catálogo Administrativo (`/apps/platform/billing`):** La consulta administrativa `listAdminPlans()` se ejecuta mediante el cliente administrativo (`createSupabaseAdminClient()`), evitando que las políticas RLS de PostgreSQL oculten los planes inactivos (`is_active = false`), permitiendo a los administradores su edición y reactivación.
#### 12.2.4. Unificación de Plan Gratuito (Free / Demo), Entitlements Únicos y Gobernanza de Acceso

Para eliminar dependencias de planes sintéticos en el cliente, centralizar la administración comercial y erradicar cualquier duplicidad de lógica entre planes y pruebas:

1. **Intervalo de Cobro `free` en `public.plans`:**
   - Se amplía el constraint `plans_interval_check` para admitir `interval in ('free', 'one_time', 'month', 'year')`.
   - Los planes gratuitos poseen `amount_minor = 0`, `interval = 'free'`, `currency = 'USD'`, `duration_seconds` configurable (ej. 86400s = 24h, o `null` para permanente) y `provider_price_id = null`.
2. **`public.plan_entitlements` como Única Fuente de la Verdad:**
   - Todos los planes (gratuitos, de pago único o de suscripción recurrente) definen sus módulos incluidos (`modules.*`) y límites de capacidad (`investigations.max_active`, `investigations.export_pdf_monthly`, `storage.max_bytes`, `users.max_members`, `teams.max_teams`) **exclusivamente en `public.plan_entitlements`** utilizando la misma nomenclatura canónica.
   - Se elimina la duplicidad histórica de claves (`actions.*`, `limits.*`) de `trial_policy_entitlements`.
   - La función RPC `start_trial` copia las cuotas y módulos directamente desde `public.plan_entitlements` del plan `trial` (o plan con `interval = 'free'`) hacia el snapshot de acceso `public.access_grant_entitlements` con `source = 'plan'`.
3. **Card Única de Gobernanza de Acceso y Pruebas en Plataforma (`/apps/platform/billing`):**
   - En el panel administrativo de facturación, la sección inferior consolida de forma exclusiva las 4 reglas globales de acceso a la plataforma:
     - `Habilitar Trial Registrado` (`enabled: boolean`): Controla si usuarios autenticados con cuenta verificada pueden activar una prueba temporal.
     - `Permitir Trial Guest` (`allow_guest: boolean`): Habilita que visitantes anónimos exploren la herramienta sin crear cuenta.
     - `Permitir Checkout en Trial Registrado` (`allow_checkout: boolean`): Habilita a usuarios en prueba iniciar compras/upgrade de planes directamente.
     - `Máximo de sesiones por Guest` (`max_sessions: integer`): Límite de sesiones concurrentes por visitante anónimo.
   - Se eliminan de esta sección los campos redundantes: la duración en días (gestionada en el modal del Plan `trial` en horas/días), el switch de exportación PDF (gestionado como el límite numérico estándar `investigations.export_pdf_monthly` en el Plan) y la tabla separada de entitlements del trial.
4. **Activación Zero-Friction sin Stripe:**
   - La activación del plan gratuito se ejecuta de forma inmediata y local en Supabase mediante `/api/billing/access/trial` o creación de `access_grant`, sin redirigir a Stripe Checkout ni exigir tarjeta de crédito.
   - Si el plan permite acceso anónimo (`allow_guest = true`), los visitantes pueden iniciar la prueba guiada como invitados. Si exige registro (`allow_guest = false`), el sistema solicita crear una cuenta previamente.
   - Al realizar un Upgrade a un plan de pago superior, se activa el flujo normal de Stripe Checkout.
5. **Preservación Integral de Validaciones de Seguridad:**
   - Se mantienen intactas todas las comprobaciones de seguridad existentes (`start_trial` RPC, validación KYC/VID, membresía de tenant, capability `billing.trial.start`, prevención de reintentos por usuario/tenant, snapshots inmutables de entitlements y retención legal de 7 años).

#### 12.2.5. Jerarquía Visual y Presentación de Títulos de Investigaciones vs Identificadores Técnicos

Para optimizar la experiencia de usuario (UX) en la gestión de expedientes y evitar la sobreexposición de identificadores UUID técnicos de base de datos en las interfaces principales:

1. **Vista de Contexto de la Investigación (`/apps/investigator/context`):**
   - El título principal de la tarjeta (`<CardTitle>`) renderiza dinámicamente el nombre real y legible asignado por el usuario (`state.metadata.title || 'Nueva investigación estratégica'`), reflejando de inmediato cualquier edición en el campo de entrada.
   - El UUID técnico del expediente (`state.metadata.id`) se relega a la línea descriptiva (`<CardDescription>`) como dato secundario y discreto de trazabilidad técnica (`Expediente: <span className="font-mono text-xs">{id}</span>`).
2. **Gestor de Investigaciones (`/apps/investigator/investigations`):**
   - Se elimina el badge secundario prominente de UUID que opacaba visualmente el nombre de las investigaciones.
   - Cada tarjeta de expediente prioriza en su encabezado el título formal de la investigación con tipografía semántica (`font-semibold text-base`), manteniendo los badges de estado funcional (`Activa`, `nueva`, `en análisis`, etc.).
   - El identificador UUID se ubica de forma limpia y condensada en la línea de metadatos inferior junto con el conteo de factores, relaciones y estrategias.
3. **Notificaciones y Toasts del Sistema:**
   - Todos los mensajes de estado y alertas de usuario (apertura, duplicación, cierre, archivado) referencian el título de la investigación entre comillas (`Investigación "${title}" abierta`) en lugar del UUID crudo de PostgreSQL.

### 12.3. Checkout

Todos los endpoints de Checkout:

- aceptarán `idempotencyKey`;
- exigirán sesión autenticada, email confirmado, membresía y tenant activos;
- validarán el plan en servidor;
- crearán el registro interno antes de llamar a Stripe;
- usarán metadata interna no sensible;
- devolverán únicamente la URL o identificador necesario;
- no expondrán claves secretas;
- no crearán una suscripción por un GET.

Una sesión `guest_trial` podrá consultar Pricing, seleccionar un producto y comenzar el flujo comercial, pero será rechazada antes de crear cualquier intento interno o sesión real de Checkout. La UI deberá mostrar un diálogo de registro obligatorio al pulsar Comprar y conservar únicamente un `returnTo` interno allowlisted. La API repetirá la validación y devolverá `AUTHENTICATED_ACCOUNT_REQUIRED` o el código estructurado equivalente.

`billing.checkout.create` se resolverá combinando la capacidad, la membresía
activa en el workspace y `billing_purchase_policy`: el propietario siempre
estará autorizado; los miembros restantes dependerán de `owner_only`,
`approved_members` o `all_active_members`. `billing.subscription.manage`
seguirá exigiendo al propietario o una delegación administrativa separada.
Los miembros no autorizados podrán consultar el resumen y las facturas si sus
capacidades lo permiten, pero no iniciar cobros ni modificar la suscripción.
La matriz de capacidades, la política y sus seeds deberán reflejar esta regla
mediante una migración forward; ocultar botones en la UI no será el mecanismo
de seguridad.

El primer Checkout de suscripción crea o reutiliza el Customer de Stripe mediante
la función SQL `security definer` `create_billing_customer(uuid, text, text)`.
La función repite la validación de sesión, tenant activo y `billing.checkout.create`;
no se conceden escrituras directas sobre `billing_customers` a usuarios autenticados.

#### 12.3.1. Wizard de compra (`/pages/billing/upgrade`)

El wizard de compra vive en `src/views/pages/billing/upgrade/index.tsx` (ruta
`/pages/billing/upgrade`), se hidrata con `GET /api/billing/checkout/context`
(`getCheckoutContext`) y replica el patrón visual del template
"Form Wizard — Icons (Basic Icons - Horizontal)" (AdminCN): stepper horizontal
con círculos de icono (Lucide) + título + descripción por paso, contenido en
Cards con grid de 2 columnas y footer de navegación con botones Previous/Next.

Estructura de pasos:

1. **Account Details (solo lectura):** email del comprador, workspace ID,
   plan actual y modo de acceso (owner / delegado + política de compra del
   tenant). No hay campos editables; la información proviene del contexto.
2. **Personal Information:** `firstName`, `lastName`, `mobile` y `country`
   (siempre visibles y pre-rellenados desde el perfil del usuario). La
   **dirección completa** (`line1`, `line2`, `city`, `state`, `postalCode`)
   solo se solicita cuando `authorizationSource !== 'owner'`: el propietario
   factura con la dirección que Stripe recoge en Checkout, mientras que un
   comprador delegado debe suministrar su propia dirección de facturación.
3. **Confirm Plan:** selector de todos los planes del catálogo (tarjetas
   RadioGroup), resumen de la compra (plan, comprador, total) y nota fiscal.
   El botón "Proceed to payment" guarda primero personal info + dirección
   (`POST /api/billing/checkout/address`) y después crea la sesión de Checkout
   (`POST /api/billing/checkout/one-time` o `/subscription` según el
   `interval` del plan), redirigiendo a la URL de Stripe devuelta.

Reglas de negocio garantizadas en servidor (nunca solo UI):

1. email confirmado (`access.ts` → `emailNotConfirmed`);
2. autorización de compra del workspace vía RPC `authorize_billing_checkout`
   (owner siempre; miembros según `billing_purchase_policy`);
3. no repetir trial free (`TRIAL_ALREADY_USED` / `billing.trialAlreadyUsed`);
4. no recomprar el mismo plan activo: si el tenant ya tiene una suscripción
   activa con el mismo `planCode`, la API rechaza la solicitud (`billing.alreadyOnThisPlan`);
5. la información de pago es suministrada por el comprador: en flujos
   delegados se crea un `customer_email` nuevo en Stripe (sin `customer`),
   nunca se reutiliza la tarjeta del propietario.

Persistencia de personal info: la tabla `billing_purchase_addresses` almacena
`first_name`, `last_name` y `mobile` además de la dirección; el upsert se hace
exclusivamente vía la RPC `security definer`
`upsert_billing_purchase_address`, que re-valida la autorización de compra y
registra auditoría sin PII (solo `country` y `hasStreet`). La migración
`2026-08-16T15-00-00_billing_purchase_personal_info.sql` añade las columnas y
extiende la RPC; se aplica de forma quirúrgica (Management API), nunca con
`supabase db push`, porque el historial `supabase_migrations.schema_migrations`
de la base no coincide con los nombres de archivo del repositorio.

#### 12.3.2. Ciclo de Vida: Upgrade, Downgrade y Asunción de Pago (Mismo Plan)

Para salvaguardar la integridad de la suscripción, permitir flexibilidad en compras
delegadas y evitar degradaciones o cobros duplicados:

1. **Gestión del Plan Actual y Asunción de Pago:**
   - La tarjeta del plan actualmente activo en el workspace se identifica
     visualmente (`plan.code === context.currentPlan?.code`) con el badge `Plan actual / Renovar`
     y **permanece seleccionable**.
   - Si un usuario delegado (o el owner) selecciona el **mismo plan**, la UI despliega un banner informativo:
     *"Estás asumiendo el pago del plan actual ([Plan]). Al continuar, la suscripción quedará a tu cargo y se desvinculará el cobro automático anterior para no duplicar cargos."*
   - En el cuadro de resumen, la operación se etiqueta como `Renovación / Asunción de pago`.
   - En el backend, la creación de checkout permite la transacción sin lanzar error de duplicidad cuando se inicia un nuevo ciclo de pago/pagador para el workspace.

2. **Indicadores de Transición en UI:**
   - Banner contextual en el Paso 3 indicando el plan actual del workspace.
   - En el cuadro de resumen de la orden se desglosa la transición:
     *Plan actual* (`context.currentPlan`) → *Nuevo plan* (`selectedPlan`), con
     etiquetas de estado `Upgrade ⬆️` (mejora), `Downgrade 🔻` (reducción) o `Mismo plan 🔄` (asunción/renovación).

3. **Detección de Downgrade y Modal de Confirmación (`DowngradeWarningDialog`):**
   - Se evalúa si el plan seleccionado ofrece menores límites (ej.
     `investigations.max_active`, `investigations.export_pdf_monthly`,
     `storage.max_bytes`) o excluye módulos (`modules.kanban`, `modules.investigator`)
     o reduce el importe respecto al plan activo.
   - Si se detecta un Downgrade, el clic en *"Proceed to payment"* abre un modal
     con:
     a) Advertencia explícita sobre la reducción de capacidades del workspace.
     b) Tabla comparativa detallada de cuotas y módulos (*Plan Actual* vs *Nuevo Plan*), resaltando pérdidas en rojo y reducciones en amarillo.
     c) Checkbox de confirmación obligatoria: *"Entiendo que las características del espacio de trabajo se reducirán y confirmo el cambio"*.
     d) Botón de confirmación que inicia la creación de la sesión de Checkout.

#### 12.3.3. Traspaso de Pagador, No Duplicación y Notificación al Propietario (Owner)

Cuando un miembro con permiso delegado (`authorizationSource !== 'owner'`, es decir,
`approved_member` o `all_active_member`) adquiere o modifica un plan para el workspace:

1. **Gobernanza RBAC y Separación de Roles:**
   - Que el usuario delegado (ej. Daniel) pague la suscripción no altera la
     propiedad del tenant. El usuario original (ej. Gustavo) **sigue siendo el Owner**
     en `tenant_memberships` y retiene todos sus privilegios administrativos.
2. **Garantía Contra Doble Cobro (Desvinculación en Stripe):**
   - Al procesarse el webhook de activación de la nueva suscripción (`checkout.session.completed` / `customer.subscription.created`),
     el backend verifica si existía una suscripción activa previa con un ID de Stripe diferente.
   - De existir, el backend cancela la suscripción anterior en Stripe (`stripe.subscriptions.cancel(oldSubId)`),
     garantizando que la tarjeta del owner anterior no vuelva a recibir cargos.
3. **Servicio de Notificación (`src/features/billing/purchase-notification-email.ts`):**
   - Dispara `sendPurchaseNotificationToOwnerEmail` utilizando Resend.
   - Resuelve los propietarios activos del tenant consultando `tenant_memberships`
     con rol `owner` y sus correspondientes perfiles (`findTenantOwners`).
4. **Contenido del Correo al Owner:**
   - Identificación del comprador delegado (nombre y email).
   - Espacio de trabajo y organización receptora.
   - Detalle de la transacción: Plan anterior → Nuevo plan, monto e intervalo.
   - Clasificación explícita: **Mejora (Upgrade)**, **Reducción (Downgrade)** o **Asunción de Pago (Mismo Plan)**.
   - Confirmación explícita de que su método de pago anterior ha sido desvinculado del cobro recurrente para evitar cobros dobles, conservando plenamente su rol de Owner.
   - Tabla de límites y capacidades resultantes vigentes para el workspace.
   - Enlace directo a la consola de administración de facturación de NovaStore.
5. **Auditoría e Idempotencia:**
   - Se registra auditoría `billing.delegated.purchase.owner_notified` y `billing.subscription.payer_transferred` sin PII.

#### 12.3.4. Sincronización de Información Personal y Dirección de Facturación

Para garantizar una experiencia de usuario fluida y sin fricciones durante el proceso de compra / upgrade:

1. **Gestión de Dirección en Ajustes de Usuario (`src/views/pages/user-settings/general/personal-info.tsx`):**
   - Incorpora campos de dirección residencial y fiscal:
     - `Address Line 1` (calle, número, piso/apartamento).
     - `Address Line 2` (opcional: referencias adicionales).
     - `City` (ciudad o localidad).
     - `State / Province` (estado, provincia o región).
     - `Postal Code` (código postal).
2. **Persistencia Unificada en `/api/user/profile` (GET y PATCH):**
   - El esquema Zod `updateProfileSchema` valida `line1`, `line2`, `city`, `state`, `postalCode`.
   - Se almacenan de forma segura en `auth.user_metadata` junto con `firstName`, `lastName`, `mobile`, `country`.
3. **Hidratación y Fallback Inteligente en Facturación (`getCheckoutContext` en `src/features/billing/service.ts`):**
   - Al cargar el asistente de compra (`UpgradeWizard`), si el usuario aún no posee un registro histórico en `billing_purchase_addresses` para ese workspace, el backend automáticamente utiliza la dirección guardada en `auth.user_metadata` como fallback.
4. **Autocompletado en el Asistente de Upgrade (Paso 2):**
   - El Paso 2 se precarga al 100% con los datos personales (`firstName`, `lastName`, `country`, `mobile`) y la dirección completa (`line1`, `line2`, `city`, `state`, `postalCode`).
   - El usuario solo debe revisar y confirmar los datos antes de avanzar a la selección del plan.

### 12.4. Webhooks

Eventos mínimos:

```text
checkout.session.completed
checkout.session.async_payment_succeeded
checkout.session.async_payment_failed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.paid
invoice.payment_failed
```

Cada webhook:

1. valida la firma;
2. comprueba `provider_event_id`;
3. registra el evento;
4. ejecuta una transacción idempotente;
5. actualiza subscription, invoice o entitlement;
6. registra auditoría;
7. marca el evento como procesado;
8. devuelve error explícito si falla.

### 12.5. Customer Portal

La gestión de tarjeta, cancelación y facturación se delegará al portal hospedado por Stripe. La aplicación solo creará la sesión de portal después de validar usuario, tenant y capacidad.

### 12.6. Moneda y localización

Los importes se almacenarán en unidades menores (`amount_minor`) y currency ISO 4217. La UI usará los formateadores existentes del proyecto:

- servidor/documentos: utilidades de `src/lib/currency` e i18n;
- cliente: `CurrencyProvider` y `useCurrency()` cuando corresponda.

No se utilizarán precios calculados con floats ni strings como fuente de verdad.

La primera versión aceptará `USD`, `EUR` y `CLP` para clientes internacionales. Los impuestos se calcularán mediante Stripe Tax según el país y la información fiscal del cliente; no se hardcodearán tasas fiscales en la aplicación. Solo se habilitarán países en los que la cuenta de Stripe y Stripe Tax estén configurados legalmente.

---

## 13. Integración con la UI actual

### 13.1. Shell

Se conservarán:

```text
src/app/(pages)/layout.tsx
src/components/layout/Sidebar.tsx
src/components/layout/Header.tsx
src/components/Providers.tsx
src/components/ui/*
src/app/globals.css
```

No se creará un shell alternativo para billing o autenticación.

### 13.2. Auth y VID

Las rutas existentes conservarán su estructura visual:

```text
/pages/auth/login
/pages/auth/register
/pages/auth/forgot-password
/pages/auth/reset-password
/pages/auth/verify-email
/pages/auth/two-steps
```

Se conectarán a Supabase Auth con estados de loading, error, email pendiente y
sesión iniciada. NovaStore mostrará Login como pantalla inicial. Desde Login se
ofrecerá una acción explícita para `Probar como invitado` o `Solicitar trial`;
esa acción no creará una identidad Supabase.

La confirmación de email será necesaria para registrarse plenamente, comprar,
activar una suscripción, persistir investigaciones, administrar Billing y usar
rutas tenant-scoped. El guest solo podrá utilizar el trial allowlisted y no
obtendrá una excepción general de autenticación. La VID no condicionará el trial
ni las modalidades registradas.

La pantalla de VID será un flujo independiente de seguridad: permitirá solicitar la verificación digital básica y consultar su estado, pero su aprobación no activará Billing ni modificará por sí sola los entitlements.

La confirmación de email se implementa como un segundo paso obligatorio del
registro: `signUp` envía el enlace a `/api/auth/callback`, la página
`/pages/auth/verify-email` permite reenviar el mensaje y el login rechaza
cuentas cuyo `email_confirmed_at` todavía no exista. En registros mediante
invitación, el token se conserva en el redirect de confirmación para que la
aceptación siga siendo exclusiva del tenant y workspace originales.
El proveedor debe mantener habilitado **Confirm email** en Supabase Auth; sin
esa configuración Supabase marca la dirección como confirmada inmediatamente y
no puede existir este segundo paso.

El registro no crea datos tenant-scoped antes de confirmar el email. La tabla
interna `pending_registrations` conserva únicamente el nombre y, para registros
directos, el nombre de empresa. `complete_pending_registration` se ejecuta
después del callback confirmado y también durante el login como recuperación
idempotente ante un fallo transitorio del callback. Los registros por invitación
solo crean el perfil y esperan la aceptación de la invitación para crear sus
membresías.

La configuración global de limpieza está disponible en una pantalla de
plataforma visible solo cuando la sesión posee
`platform.auth.registrations.manage`; la API y las funciones SQL vuelven a
validar la capacidad, por lo que ocultar el enlace no es el mecanismo de
seguridad.

### 13.3. Billing del tenant visible en la cuenta

`UserBillingTab` seguirá usando la estructura actual:

- Current Plan;
- progreso de período;
- features;
- Billing Details;
- Invoice History.

La fuente pasará a ser `GET /api/billing/me`. El modelo visual deberá distinguir:

```text
trial
one_time
subscription
manual
expired
past_due
```

Para compra única se mostrará uso restante y expiración, no una falsa mensualidad.

La pantalla se presentará como Billing del tenant/organización activa. El plan,
el estado de pago, el período, los límites y las invoices serán comunes para
los miembros del tenant; nunca se mostrará una suscripción ficticiamente
individual. El botón de contratar se mostrará según
`billing_purchase_policy`; los botones de cambiar, cancelar o reactivar
quedarán reservados al propietario salvo delegación administrativa separada.
Los miembros sin autorización de mutación verán un estado de consulta y,
cuando corresponda, el propietario responsable.

El guest no verá Billing del tenant. Sí podrá ver la página pública de Pricing,
los planes y productos comerciales disponibles, además del diálogo de registro
requerido para crear un Checkout real.

### 13.4. Billing administrativo

Se reutilizarán las superficies de Users y Settings para:

- catálogo de planes;
- configuración de prueba;
- límites;
- suscripciones;
- entitlements;
- catálogo de módulos;
- entitlements de módulos y acciones por plan;
- módulos y acciones concedidos por cada política de trial;
- asociaciones entre licencias y módulos;
- invoices;
- auditoría de billing.

Las operaciones de modificación de Billing de un tenant seguirán restringidas al
propietario activo del workspace salvo delegación administrativa separada. Las
superficies administrativas de plataforma distinguirán entre:

- catálogo global de NovaStore y configuración de trials;
- asignación de módulos a planes, trials y licencias;
- administración de la suscripción de un tenant concreto.

La administración global quedará reservada a `super_admin` mediante capacidades
de plataforma y auditoría append-only. Los formularios nunca permitirán asignar
Billing o módulos a un usuario individual sin pasar por el tenant, la política
comercial y el resolver de acceso.

Los formularios de edición seguirán el plan de modales existente.

**Estado de implementación (2026-08-14):** la vista
`/apps/platform/billing` ya permite administrar el catálogo global de
`platform_modules`, activar/desactivar módulos, configurar la política global de
trial (`enabled`, duración, `allow_guest`, `max_sessions`, PDF y checkout para
usuarios registrados), editar sus entitlements y editar los entitlements
`modules.*`, `actions.*` y `limits.*` de los planes. Las APIs server-side
repiten la autorización de plataforma, validan contra módulos/capacidades
activas, rechazan namespaces no allowlisted y registran las mutaciones en
auditoría global append-only. Las migraciones correspondientes están aplicadas en
Supabase y la verificación remota confirmó el catálogo, la función de asignación
de capacidades, sus grants y la identidad platform de Daniel. La comprobación
visual y end-to-end de los flujos Billing/Checkout sigue pendiente.

### 13.5. Navegación

El elemento actual `Pricing` dejará de apuntar a una URL externa y pasará a una
ruta interna de Billing & Plans. `UpgradeProButton` conservará su función visual,
pero abrirá el flujo real de Checkout para usuarios registrados o el diálogo de
registro para un guest.

La navegación efectiva se resolverá mediante identidad, modalidad, entitlements
de módulos/acciones, capacidades y estado comercial; no mediante un campo
`plan` del usuario ni mediante `USER_PERMISSIONS`.

La matriz de rutas será:

```text
Públicas:
  /                         → redirige a Login
  /pages/auth/*
  /pages/pricing
  /api/auth/*
  /api/billing/plans

Guest trial:
  /demo/investigator/*
  /api/demo/investigator/*
  solo durante guest_trial vigente y según la política allowlisted

Usuario registrado confirmado:
  /apps/*
  /dashboard/*
  /datatable/*
  /forms/*
  /pages/user-profile/*
  /pages/user-settings/*
  /api/investigations/*
  /api/admin/*
  según membership, capacidad y entitlement

Plataforma:
  /apps/platform/*
  /api/platform/*
  únicamente con capacidades platform y, cuando corresponda, super_admin
```

El proxy podrá redirigir, pero cada familia protegida tendrá además un guard
server-side. El acceso a una ruta o API de un módulo no concedido devolverá
`MODULE_ACCESS_REQUIRED` aunque el sidebar lo oculte.

### 13.5.1. Roles y permisos

`/apps/roles` y `/apps/permissions` serán rutas internas, no enlaces al template
externo. Ambas pantallas consumirán el Centro Único multiámbito de la sección
9.22. Roles mostrará roles platform, roles globales tenant y roles personalizados
del tenant seleccionado, además de usuarios asociados, estado, scope y conteo de
capacidades. Permissions mostrará todas las capacidades reales del manifiesto,
agrupadas por ámbito, recurso y acción, con asignaciones, overrides y bloqueos
explicados.

Estas pantallas no administrarán entitlements comerciales. El acceso a las
pantallas requerirá `access.read` en el tenant o
`platform.access.roles.read`/`platform.access.capabilities.read` en plataforma.
Las mutaciones requerirán `access.manage`,
`platform.access.roles.manage`, `platform.access.capabilities.manage` o
`platform.access.tenant_roles.manage` según el scope. El resolver comprobará
identidad, email confirmado, membership, tenant objetivo, capacidad y acceso
comercial cuando corresponda. La UI no podrá conceder una capacidad superior a
la que el actor puede administrar.

**Estado de implementación (2026-08-14):** las rutas internas consumen el Centro
Único multiámbito; la matriz devuelve roles platform, globales tenant y tenant,
capacidades reales, asignaciones, overrides y flags de gestión. Las mutaciones
usan capacidades explícitas, RPC con optimistic locking, auditoría before/after,
protección contra autoescalada y protección del último `super_admin`. La migración
principal y la migración forward de `replace_role_capabilities` están aplicadas en
Supabase. Sigue pendiente la validación visual con una sesión real de Daniel.

### 13.5.2. Módulos y acciones visibles

El sidebar, los grupos de navegación, las páginas de entrada y los botones
internos consumirán `resolveEffectiveNavigation(context)`. El resolver solo
mostrará un módulo cuando el entitlement `modules.<key>` esté activo y solo
mostrará acciones cuando exista el entitlement `actions.<key>`.

La ocultación es una optimización de UX. Layouts, Route Handlers, servicios de
dominio y APIs repetirán `requireModuleAccess` y `requireActionEntitlement`.

**Estado de implementación (2026-08-13):** el resolver server-side filtra
entitlements `modules.*` cuyos módulos globales estén inactivos y los guards
`requireModuleAccess`, `requireActionEntitlement` y `requireEntitlement`
mantienen el cierre por defecto. La migración
`2026-08-13T03-00-00_harden_trial_entitlement_validation.sql` endurece la
validación SQL de módulos/acciones, rechaza acciones `platform.*` en trials,
omite módulos inactivos al construir el snapshot visible y permite a usuarios
autenticados leer únicamente módulos activos.

### 13.6. Diseño

La interfaz seguirá el lenguaje visual existente:

- superficies y bordes de `globals.css`;
- componentes shadcn/base-ui;
- estados semánticos existentes;
- sin gradientes decorativos ni rediseño global;
- animaciones solo para loading, modal y confirmación;
- estados de loading, vacío, error, prohibido y expirado;
- labels y mensajes traducibles.

La firma visual seguirá siendo el expediente estratégico con navegación numerada, estado de validación y estado de sincronización.

---

## 14. Persistencia de investigaciones

### 14.1. Repositorio remoto

Se creará una capa de acceso independiente del hook:

```text
src/lib/investigations/repository.ts
src/lib/investigations/service.ts
```

El hook mantendrá su contrato de dominio actual y cambiará el adaptador de almacenamiento.

**Estado de implementación:** `src/lib/investigations/client.ts` centraliza las llamadas
HTTP, la conversión DTO remoto ↔ `InvestigationState` y los errores estructurados. El hook
ya no lee ni escribe `localStorage` durante la operación normal.

### 14.2. Usuarios registrados

- `GET /api/investigations` devuelve solo metadatos paginados.
- `GET /api/investigations/:id` devuelve el estado autorizado.
- `POST /api/investigations` crea una investigación y acepta `idempotencyKey`; las
  importaciones explícitas envían `source = 'migration'`.
- `PATCH /api/investigations/:id` exige `version`.
- `POST /api/investigations/:id/archive` archiva.
- `POST /api/investigations/:id/restore` restaura.
- `POST /api/investigations/:id/close` cierra.
- `POST /api/investigations/:id/export` prepara la exportación.

El autosave agrupado/debounced ya está conectado para suscripciones y compras únicas
autenticadas, conserva la versión remota y muestra el estado de sincronización en el gestor.
Un conflicto de versión devuelve `409` y no sobrescribe silenciosamente el trabajo de otro
usuario.

### 14.3. Trial y compra única autenticados

- Solo se habilitan para usuarios autenticados con email confirmado y acceso comercial temporal válido.
- `registered_one_time` crea y actualiza filas en `investigations` con el mismo tenant scope que una suscripción.
- `registered_trial` no crea filas en `investigations`; el estado vive en memoria.
- El PDF se genera desde un payload validado si el entitlement, la política y el rate limit lo permiten.
- El payload tendrá límites de tamaño y será validado antes de procesarse.
- La interfaz advierte que una recarga o cierre pierde el trabajo solo durante `registered_trial`.

### 14.4. Migración desde `localStorage`

Para usuarios que ya tengan investigaciones locales:

1. detectar datos existentes una sola vez;
2. mostrar cantidad y tamaño;
3. solicitar autenticación;
4. mostrar confirmación de importación;
5. enviar cada investigación con clave idempotente;
6. verificar respuestas;
7. eliminar la copia local solo después de confirmación explícita;
8. registrar la migración con `source = 'migration'`.

Los datos fake de la plantilla no se convertirán en usuarios reales. Las demos se mantendrán como fixtures.

**Estado de implementación:** `inspectWorkspaceMigration()` detecta una sola vez el envelope
legacy, excluye demos, calcula el tamaño UTF-8 y no modifica el almacenamiento. El gestor
ofrece una confirmación explícita, muestra progreso y conserva la copia local ante cualquier
fallo. Cada creación usa una clave estable `migration-<id>` y `source = 'migration'`;
`investigations` aplica una restricción única por tenant y la API devuelve el expediente
existente en los reintentos. Tras verificar todas las respuestas se eliminan el envelope y
sus backups; la auditoría append-only registra `investigations.migrated`.

---

## 15. API prevista

### 15.1. Sesión

```text
GET  /api/auth/me
GET  /api/auth/tenants
PATCH /api/auth/tenants
POST /api/auth/logout
POST /api/guest-trial/start
GET  /api/guest-trial/me
POST /api/guest-trial/end
POST /api/guest-trial/claim
```

`/api/auth/tenants` expone únicamente las organizaciones con membresía activa
del usuario autenticado. `PATCH` permite seleccionar la organización principal
persistida en `profiles.primary_tenant_id`; la validación se repite en una
función SQL `security definer` y la mutación queda registrada en `audit_logs`.
Esta preferencia no crea ni modifica organizaciones, workspaces, propietarios ni
membresías.

Las operaciones de login, registro y recuperación utilizarán Supabase Auth. Los
endpoints de `guest-trial` utilizarán la sesión temporal firmada y solo
resolverán la política allowlisted. `POST /api/guest-trial/claim` solo aceptará
una sesión de usuario con email confirmado y ejecutará una reclamación idempotente
de la sesión guest activa; no aceptará `expiresAt`, módulos, acciones ni límites
desde el cliente y no concederá un trial nuevo. Los endpoints de trial registrado,
Checkout, investigaciones y PDF exigirán usuario confirmado, membresía activa,
acceso comercial y entitlements correspondientes; nunca rechazarán por VID
pendiente.

### 15.2. Billing público y usuario

```text
GET  /api/billing/plans
GET  /api/billing/access
GET  /api/billing/me
POST /api/billing/checkout/one-time
POST /api/billing/checkout/subscription
POST /api/billing/customer-portal
GET  /api/billing/invoices/:id
```

`GET /api/billing/me` devolverá el resumen del tenant/organización activa,
incluyendo plan, suscripción, entitlements, uso e invoices cuando proceda.
No devolverá una suscripción individual por usuario. Los endpoints de Checkout
y Customer Portal resolverán el tenant desde la membresía y el workspace,
aplicarán `billing_purchase_policy` para compras y exigirán autorización de
propietario o delegación administrativa para cualquier otra mutación comercial.

Los clientes guest no podrán llamar a `GET /api/billing/me`, crear Checkout,
Customer Portal ni invoices. `GET /api/billing/plans` y la página pública de
Pricing sí estarán disponibles, pero ningún precio o plan enviado por el
navegador concederá acceso.

### 15.3. Webhooks

```text
POST /api/webhooks/stripe
```

El endpoint validará la firma antes de interpretar el cuerpo.

### 15.4. Administración de billing

```text
GET   /api/admin/billing/plans
POST  /api/admin/billing/plans
PATCH /api/admin/billing/plans/:id
GET   /api/admin/billing/trial-policy
PATCH /api/admin/billing/trial-policy
GET   /api/admin/billing/trial-policy/entitlements
PUT   /api/admin/billing/trial-policy/entitlements
GET   /api/admin/billing/modules
POST  /api/admin/billing/modules
PATCH /api/admin/billing/modules/:key
GET   /api/admin/billing/entitlements/:planId
PUT   /api/admin/billing/entitlements/:planId
GET   /api/admin/billing/licenses/:id/entitlements
GET   /api/admin/billing/subscriptions
GET   /api/admin/billing/audit
```

### 15.5. VID

```text
GET  /api/vid
POST /api/vid
GET  /api/platform/vid
POST /api/platform/vid/:id/review
```

Las rutas de VID solo gestionan el flujo de verificación digital básica y sus
metadatos mínimos. No conceden entitlements ni habilitan Billing por sí mismas.

### 15.6. Usuarios

```text
GET   /api/admin/users
POST  /api/admin/users/invitations
GET   /api/admin/users/invitations
GET   /api/admin/users/invitations/:id
PATCH /api/admin/users/invitations/:id
DELETE /api/admin/users/invitations/:id
POST  /api/admin/users/invitations/:id/resend
GET   /api/admin/users/roles
GET   /api/admin/workspaces
GET   /api/auth/invitations
POST  /api/auth/invitations/accept
GET   /api/admin/users/:id
PATCH /api/admin/users/:id
POST  /api/admin/users/:id/disable
POST  /api/admin/users/:id/enable
GET   /api/admin/users/:id/capabilities
PATCH /api/admin/users/:id/capabilities
GET   /api/admin/roles
POST  /api/admin/roles
PATCH /api/admin/roles/:id
POST  /api/admin/roles/:id/disable
GET   /api/admin/permissions
GET   /api/admin/permissions/matrix
PUT   /api/admin/roles/:id/permissions
```

No se expondrá un CRUD genérico que permita modificar `auth.users` o contraseñas desde el cliente.

Las rutas de roles y permisos usarán un contexto multiámbito validado por el
servidor. Las rutas de módulos, trial, entitlements y catálogo global serán
platform-scoped y requerirán capacidades de plataforma. Las rutas guest no
reutilizarán endpoints administrativos ni endpoints tenant-scoped.

El API unificado previsto será:

```text
GET   /api/admin/access/roles?scope=platform|tenant|all_tenants&tenantId=<uuid>
POST  /api/admin/access/roles
PATCH /api/admin/access/roles/:id
POST  /api/admin/access/roles/:id/status
GET   /api/admin/access/capabilities?scope=platform|tenant|all_tenants&tenantId=<uuid>
PUT   /api/admin/access/roles/:id/capabilities
GET   /api/admin/access/tenants
```

El cuerpo de cada mutación incluirá `scope`, `tenantId` cuando aplique,
`updatedAt` y la versión esperada. Las rutas legacy `/api/admin/roles`,
`/api/admin/permissions` y sus subrutas podrán mantenerse como fachadas
compatibles, pero delegarán en el mismo servicio unificado y no conservarán
reglas divergentes.

### 15.7. Contratos de error

Las APIs devolverán errores estructurados:

```json
{
  "error": {
    "code": "BILLING_SUBSCRIPTION_REQUIRED",
    "messageKey": "billing.subscriptionRequired",
    "details": {}
  }
}
```

No se devolverán mensajes crudos de Stripe, Supabase ni excepciones SQL.

---

## 16. Arquitectura de código prevista

```text
src/
├── app/
│   ├── (blank)/pages/auth/
│   ├── (blank)/demo/investigator/
│   ├── (pages)/apps/investigator/
│   ├── (pages)/apps/roles/
│   ├── (pages)/apps/permissions/
│   ├── (pages)/apps/users/
│   ├── (pages)/apps/platform/modules/
│   ├── (pages)/apps/platform/trials/
│   ├── (pages)/pages/pricing/
│   └── api/
│       ├── auth/
│       ├── guest-trial/
│       ├── admin/
│       ├── billing/
│       ├── investigations/
│       └── webhooks/stripe/
├── features/
│   ├── access/
│   │   ├── capabilityManifest.ts
│   │   ├── access-service.ts
│   │   └── types.ts
│   ├── billing/
│   │   ├── components/
│   │   ├── billing-service.ts
│   │   ├── entitlement-service.ts
│   │   └── types.ts
│   ├── guest-trial/
│   │   ├── guest-trial-service.ts
│   │   ├── guest-trial-policy.ts
│   │   └── types.ts
│   ├── investigations/
│   └── users/
├── lib/
│   ├── supabase/
│   ├── stripe/
│   ├── auth/
│   ├── navigation/
│   └── audit/
└── hooks/
    ├── use-permissions.tsx
    ├── use-billing.ts
    ├── use-access.ts
    └── use-investigator-analysis.tsx
```

La ubicación final se ajustará a los patrones existentes antes de crear carpetas nuevas. No se crearán manifiestos de permisos paralelos.

El contexto de acceso tendrá un discriminador explícito (`pre_auth`,
`guest_trial`, `registered`, `suspended`) y no se representará guest como un
usuario Supabase. `resolveEffectiveNavigation(context)` será compartido por
sidebar, páginas de entrada y acciones; los guards de servidor invocarán la
misma lógica en modo no visual.

---

## 17. Seguridad y cumplimiento

### 17.1. Auth y acceso

- RLS en todas las tablas tenant-scoped.
- Validación de sesión en cada Route Handler.
- Validación de capacidad en API, dominio y UI.
- Tenant derivado de membresía, nunca del body.
- Separación entre acceso de plataforma y acceso de tenant.
- Protección para no eliminar o suspender al último administrador.

### 17.2. Billing

- Stripe Checkout y Customer Portal hospedados.
- Plan, Customer, suscripción, invoices y entitlements tenant-scoped; nunca
  user-scoped.
- El propietario siempre puede iniciar y modificar cobros; las compras de
  miembros se gobiernan por `billing_purchase_policy`.
- Los miembros heredan el acceso comercial del tenant y solo pueden mutarlo
  según sus delegaciones explícitas; las lecturas dependen de sus capacidades.
- Nunca almacenar números de tarjeta.
- Webhook firmado, idempotente y reintentable.
- Idempotency key para creación de Checkout.
- Estados de suscripción explícitos.
- No activar acceso por redirección del navegador.
- Facturas append-only.
- Auditoría de cambios de plan, cancelación, reactivación y overrides.

### 17.3. VID y usuarios pre-autenticados

- La entrada por defecto es Login; el acceso guest solo comienza mediante la
  acción explícita `Probar como invitado` o `Solicitar trial`.
- El guest no es una identidad de `auth.users`, no tiene `tenant_id`,
  membresía, rol ni acceso RLS a tablas tenant-scoped.
- La sesión guest es efímera, firmada, `HttpOnly`, `Secure`, `SameSite=Lax`,
  ligada a una política concreta y expira server-side; su estado se almacenará
  preferentemente en Redis/Upstash, no en datos persistentes de negocio.
- El guest solo recibe módulos, rutas, acciones y límites de la política de
  `guest_trial`; puede consultar el catálogo público de Pricing, pero no puede
  abrir Billing del tenant, crear Checkout, usar Customer Portal, roles,
  permisos, administración, investigaciones persistentes ni datos de otros
  clientes.
- La UI debe ocultar módulos no concedidos, pero un acceso directo o una llamada
  manipulada debe fallar en el guard server-side/API con un código estructurado.
- La compra iniciada por guest se rechaza en UI y API con
  `AUTHENTICATED_ACCOUNT_REQUIRED`; el diálogo de registro conservará solo un
  `returnTo` interno allowlisted.
- Los usuarios sin email confirmado no reciben trial registrado, compra única,
  suscripción ni acceso tenant-scoped. Tampoco se convertirán automáticamente
  sesiones guest en cuentas registradas; la reclamación del tiempo restante solo
  ocurre después de confirmar el email.
- El grant se consume mediante actualización atómica y exige autenticación, membresía activa, tenant activo y entitlement válido.
- La VID se aplica como capa de seguridad independiente y no como frontera comercial.
- Se aplican rate limits a autenticación, VID, Checkout, PDF y endpoints de prueba.
- Los metadatos mínimos de VID se conservarán durante el período mínimo definido por seguridad y legislación; los pagos, la auditoría y las invoices al menos 7 años, ampliando los plazos cuando la legislación aplicable lo exija.

### 17.4. RLS y tenant scope

- Todas las tablas expuestas de Supabase tendrán RLS habilitado; las políticas
  combinarán `TO authenticated` con ownership/membership real y no confiarán
  únicamente en el rol PostgreSQL.
- El tenant se derivará de la membresía activa y del contexto server-side, nunca
  de `organizationId` o `tenantId` recibido desde el cliente.
- Los datos globales de plataforma (`platform_modules`, políticas de trial y
  catálogo) vivirán en un ámbito separado; solo funciones y APIs platform-scoped
  podrán mutarlos.
- Los snapshots de entitlements se leerán en la resolución de acceso, pero no
  permitirán que un cambio de UI o de `app_metadata` eleve capacidades.
- Las funciones `SECURITY DEFINER`, cuando sean imprescindibles, vivirán fuera
  de esquemas expuestos, fijarán `search_path`, validarán actor y tenant, y
  tendrán `EXECUTE` revocado para roles públicos por defecto.

### 17.5. Logging

- Logger central del proyecto.
- Sin `console.log` en producción.
- No registrar payloads completos de investigaciones, tarjetas, tokens ni PII innecesaria.
- Correlation ID en VID, checkout, webhook y upgrade de trial.
- Auditoría separada de logs operacionales.

---

## 18. Dependencias previstas

La implementación probablemente requerirá:

```text
@supabase/supabase-js
@supabase/ssr
stripe
```

`zod`, `date-fns`, TanStack Table, Sonner y los componentes UI existentes se reutilizarán.

Antes de instalar:

1. revisar compatibilidad con Next.js 16;
2. fijar versiones exactas;
3. revisar mantenimiento y licencia;
4. instalar únicamente lo necesario;
5. ejecutar análisis de dependencias y `npm audit --production` o el equivalente del package manager del proyecto;
6. ejecutar análisis de seguridad de Codacy si el MCP está disponible.

No se ejecutará ningún package manager durante la creación de este documento.

---

## 19. Pruebas previstas

### 19.1. Unitarias

- resolución de capacidades;
- precedencia de overrides;
- separación rol/entitlement;
- resolución de módulos y acciones para cada modalidad de acceso;
- rechazo de entitlements no allowlisted para guest;
- expiración con reloj inyectable;
- firma, expiración y revocación de la sesión guest;
- consumo atómico de grants;
- transición de estados de suscripción;
- normalización de `InvestigationState`;
- migración de `schemaVersion`.

### 19.2. Integración

- RLS entre tenants;
- entrada predeterminada a Login;
- sesión guest con política allowlisted, expiración, rate limit y unicidad
  predeterminada por clave de elegibilidad;
- guest con acceso únicamente al catálogo público de Pricing, sin acceso a
  Billing del tenant, Checkout real, tenants, roles, permisos ni datos persistentes;
- reclamación idempotente del tiempo restante de un guest trial después de
  confirmar el email, sin conceder un trial nuevo;
- intento de compra guest rechazado sin crear Customer, Checkout ni entitlement;
- visitante sin sesión o usuario con email sin confirmar rechazado sin filas en `investigations`;
- usuario registrado con ownership correcto;
- invitación pendiente y aceptación;
- upgrade de trial a suscripción sin cambiar de identidad;
- compra única activada solo por webhook;
- webhook duplicado sin doble entitlement;
- factura duplicada sin doble registro;
- conflicto de versión `409`;
- admin sin acceso a otro tenant sin capacidad cross-tenant.
- SA que puede leer y modificar roles tenant desde el Centro Único;
- rechazo de asignación de capacidades `platform.*` a roles tenant;
- rechazo de autoescalada, degradación propia o retirada de capacidades críticas
  sin segunda aprobación;
- rechazo de suspensión, revocación o eliminación del último `super_admin` activo;
- RLS y RPC de escritura platform para actor autorizado y rechazo para actor
  tenant o guest;
- auditoría cross-tenant con `tenant_id = null`, `source = 'admin'`, tenant
  objetivo y before/after.

### 19.3. UI y navegador

- login, registro y recuperación;
- registro, confirmación de email, entrada explícita como guest y solicitud de trial;
- visibilidad de módulos y acciones distinta según trial, plan, licencia y rol;
- diálogo de registro al intentar comprar como guest;
- expiración de trial, compra única y período contratado;
- compra única;
- selección de plan;
- upgrade de trial a suscripción;
- Billing & Plans;
- invoice history;
- lista de usuarios y permisos;
- Centro Único de Roles y Permisos con selector Plataforma/Tenant/Todos;
- CRUD de roles platform y tenant según capacidades del actor;
- edición de capacidades platform y tenant con bloqueos explicados;
- confirmación reforzada para cambios del propio SA y del último SA;
- administración platform-scoped de módulos, planes y políticas de trial;
- guardado de investigación;
- migración de datos locales;
- estados loading/empty/error/forbidden.

### 19.4. Puertas de calidad

```text
pnpm test
pnpm check-types
pnpm lint
pnpm build
pnpx react-doctor@latest
```

La aplicación se probará en navegador con `pnpm dev`. Las pruebas de permisos y tenant scope son bloqueantes.

**Estado de implementación (2026-08-14):** los tests contractuales del Centro
Único (5/5), Prettier y el lint enfocado de los archivos modificados pasan en
local. Las migraciones del Centro Único están aplicadas y verificadas contra
Supabase; la función `replace_role_capabilities` reconoce
`platform.access.capabilities.manage`, mantiene `SECURITY DEFINER` con
`search_path` fijo y no es ejecutable por `anon`. La policy directa de INSERT
sobre `role_capabilities` también rechaza `platform.*` y
`billing.plans.manage`; la verificación remota confirmó cero asignaciones
inválidas. Los advisors remotos se ejecutaron y devuelven avisos informativos
preexistentes de índices y tablas con RLS sin políticas. El typecheck completo
sigue bloqueado únicamente por el error
preexistente de `AppInitializerGate.tsx:107`, y aún falta la validación navegador
con una sesión real y la comprobación end-to-end de Billing/Checkout.

---

## 20. Fases de implementación

### Fase 0 — Contratos y preparación

- Confirmar Supabase + Stripe.
- Confirmar moneda, país, impuestos y productos.
- Confirmar semántica exacta de compra única.
- Confirmar catálogo de aplicaciones/módulos de NovaStore.
- Confirmar política de `guest_trial`, duración, límites, rutas y acciones.
- Confirmar qué módulos y acciones concede cada plan, licencia y trial.
- Confirmar alcance de roles y permisos tenant-scoped.
- Crear variables placeholder y documentación.
- Revisar documentación local de Next.js 16.

**Puerta:** contratos de acceso, guest trial, entitlements y Billing aprobados;
ningún código de negocio aún.

### Fase 1 — Supabase y esquema

- Crear proyecto Supabase.
- Crear migraciones.
- Crear funciones RLS.
- Crear seeds de capacidades, roles y planes.
- Crear catálogo `platform_modules`, políticas de trial y snapshots de
  entitlements.
- Crear el contrato efímero de sesión guest sin usar `auth.users`.
- Crear cliente browser/server/admin.
- Crear contexto de sesión.

**Puerta:** queries aisladas por tenant, datos globales aislados por plataforma,
RLS verificado y sesión guest sin acceso a tablas persistentes.

**Estado (2026-08-13):** las migraciones base y de endurecimiento están
versionadas y aplicadas/verificadas contra el proyecto Supabase remoto,
incluyendo `2026-08-12T00-00-00_guest_trial_boundary.sql`,
`2026-08-13T02-00-00_tenant_role_management.sql` y
`2026-08-13T03-00-00_harden_trial_entitlement_validation.sql`. La siguiente
migración será forward-only para el Centro Único; después se ejecutarán advisors,
grants/Data API y pruebas RLS reales.

### Fase 2 — Auth, VID y acceso temporal

- Conectar páginas auth existentes.
- Cambiar el destino inicial de `/` a Login.
- Proteger `/dashboard`, `/datatable`, `/forms`, `/apps` y APIs mediante proxy
  más guards server-side.
- Añadir estados de VID como flujo de seguridad independiente.
- Añadir entrada explícita `Probar como invitado`/`Solicitar trial`.
- Implementar endpoints y sesión temporal `guest_trial`.
- Resolver módulos, rutas, acciones y límites del guest desde la política
  allowlisted.
- Mantener el bloqueo comercial para guest, usuarios sin email confirmado o
  usuarios sin acceso comercial vigente.
- Implementar trial registrado, compra única y suscripción según snapshots de
  entitlements ligados a usuario/tenant.
- Añadir estados de acceso en el shell.

**Puerta:** la aplicación inicia en Login; el guest solo entra por acción
explícita y queda limitado al trial allowlisted; la compra guest se rechaza
también en API; los usuarios registrados requieren email confirmado,
tenant/membresía y acceso comercial, sin exigir VID.

### Fase 3 — Stripe Billing

- Crear catálogo interno y mapeo de Stripe Price IDs.
- Crear Checkout one-time y subscription.
- Crear webhook firmado e idempotente.
- Crear Customer Portal.
- Sincronizar suscripciones e invoices.

**Puerta:** pagos de prueba, renovaciones, fallos y cancelaciones reflejados correctamente.

### Fase 4 — Capacidades y usuarios

- Crear `CAPABILITY_MANIFEST`.
- Reemplazar permisos estáticos.
- Implementar roles, overrides e invitaciones.
- Implementar `/apps/roles` y `/apps/permissions` con datos reales y guards.
- Implementar la resolución compartida de módulos y acciones en sidebar,
  layouts, dominio y APIs.
- Conectar Users App con API.
- Añadir auditoría.

**Puerta:** roles y permissions funcionan en tenant scope, los módulos sin
entitlement quedan ocultos y ningún endpoint depende solo de la UI.

**Estado (2026-08-14):** completada en código y aplicada en Supabase. Daniel
dispone de un `super_admin` platform activo con capacidades explícitas reales,
la UI única permite consultar los tres ámbitos y el endpoint legacy de
desactivación delega ahora en el servicio unificado. La validación de navegador
con sesión real queda como comprobación final.

**Estado (2026-08-14):** completada en código y en Supabase para roles,
permissions, entitlements comerciales, guards server-side, auditoría,
navegación efectiva, RPC/policies platform y protección del último
`super_admin`. La validación visual con una sesión real continúa pendiente.

### Fase 4.1 — Centro Único de Roles y Permisos

- Añadir las capacidades meta-administrativas al manifiesto y a Supabase.
- Crear el DTO unificado de roles, capacidades, asignaciones y contexto.
- Implementar lectura multiámbito para plataforma, tenant seleccionado y
  selección agregada de tenants.
- Implementar mutaciones unificadas con autorización por capacidad explícita,
  tenant objetivo validado y transacciones con optimistic locking.
- Permitir al SA editar roles system de forma controlada sin cambiar claves,
  scopes ni existencia.
- Añadir políticas/RPC de escritura platform y protección transaccional del
  último `super_admin`.
- Reutilizar las rutas legacy como fachadas compatibles y conectar la UI única.
- Exponer `platformCapabilities` separado de las capacidades tenant en
  `/api/access/effective`, `usePermissions` y `Sidebar`.
- Añadir auditoría before/after para operaciones platform y cross-tenant.

**Puerta:** Daniel y cualquier SA autorizado pueden gestionar desde las mismas
pantallas los roles y capacidades permitidos; un admin tenant no puede leer ni
mutar plataforma o tenants ajenos; no existe bypass por nombre de rol; el
último SA y la autoescalada quedan protegidos por API, dominio, RPC y UI.

### Fase 5 — Investigaciones remotas

- Crear repository/service.
- Añadir endpoints CRUD.
- Añadir versionado y revisiones.
- Sustituir persistencia automática en `localStorage`.
- Implementar migración confirmada, idempotente y auditable de investigaciones existentes.

**Puerta:** usuarios registrados guardan; suscripción y compra única autenticada persisten sus investigaciones,
mientras el trial permanece únicamente en memoria.

### Fase 6 — Billing & Plans en la plantilla

- Convertir `BillingTab` en componente conectado a API.
- Crear página interna de Pricing.
- Conectar `UpgradeProButton`.
- Añadir Billing a User Settings.
- Añadir configuración administrativa platform-scoped de módulos, planes y
  políticas de trial.
- Añadir edición de entitlements de módulos y acciones por plan, licencia y
  trial.
- Ocultar y bloquear módulos no concedidos en sidebar, páginas y APIs.
- Aplicar localización y currency utilities.

**Puerta:** plan, uso, facturas, cancelación y upgrade funcionan desde la UI actual.

**Estado (2026-08-13):** completada en código para catálogo de módulos,
política de trial y entitlements de trial/planes dentro de
`/apps/platform/billing`, además de la validación server-side y auditoría. La
verificación visual de los flujos de Pricing/Checkout y la comprobación remota
de Billing quedan pendientes.

### Fase 7 — Producción

- Rate limiting.
- Observabilidad.
- Jobs de retención y archivado para VID, pagos, auditoría e invoices.
- Revisión de secretos.
- Vercel + Supabase + Stripe.
- **Resuelto (2026-08-09):** generación de PDF en producción mediante
  `@sparticuz/chromium` en Linux/serverless, conservando Chrome/Edge local para
  desarrollo y `CHROME_PATH` como override.

La ruta de PDF ejecuta el renderer mediante `child_process`; la resolución
serverless y el tracing de binarios ya están validados en el build de producción.

---

## 21. Criterios de aceptación

La solución se considerará completa cuando:

- la UI actual y sus rutas sigan disponibles;
- la raíz de NovaStore muestre Login y no inicie una sesión guest silenciosa;
- el login y registro funcionen con Supabase Auth y email confirmado;
- exista una acción explícita para entrar como guest y solicitar únicamente un
  `guest_trial`;
- la sesión guest sea temporal, firmada, rate-limited y no cree una identidad,
  tenant, membresía ni datos persistentes;
- el guest vea únicamente las apps/módulos, rutas, acciones y límites definidos
  por la política de trial;
- el guest pueda consultar Pricing y el catálogo comercial público, pero no pueda
  acceder a Billing del tenant, crear Checkout, usar Customer Portal, tenants,
  roles, permissions, administración ni datos de otros clientes;
- un guest que pulse Comprar reciba el diálogo de registro y la API rechace el
  Checkout;
- la política guest tenga `max_sessions = 1` por defecto, permita configurar otro
  máximo explícitamente y rechace de forma atómica las solicitudes que excedan
  dicho máximo;
- exista trial configurable para usuarios autenticados y con email confirmado;
- exista compra única para usuarios autenticados y con email confirmado con persistencia remota de la investigación;
- exista suscripción real con Stripe;
- un usuario en trial pueda hacer upgrade a suscripción conservando su identidad;
- Billing & Plans muestre datos reales;
- el admin pueda configurar la duración del trial;
- `super_admin` pueda administrar el catálogo de módulos, las políticas de trial
  y los entitlements de módulos/acciones por plan, licencia y trial;
- exista una única UI de Roles y Permisos para plataforma y tenants;
- `super_admin` pueda leer y gestionar roles platform, roles globales tenant y
  roles tenant del tenant objetivo mediante capacidades explícitas;
- las capacidades platform se gestionen como asignaciones reales, separadas de
  las tenant, y nunca puedan asignarse a roles tenant;
- Daniel, como `super_admin`, vea las capacidades platform reales y no dependa de
  un bypass o de su rol tenant `admin`;
- la autoescalada, la degradación propia y la suspensión, revocación o
  eliminación del último `super_admin` sean rechazadas server-side y por la base
  de datos;
- cada mutación platform o cross-tenant registre actor, scope, tenant objetivo,
  before/after, `source = 'admin'` y `tenant_id = null`;
- los cambios de entitlements se auditen y los grants activos conserven el
  snapshot definido por el contrato;
- existan pantallas internas funcionales de Roles y Permissions, separadas del
  catálogo comercial;
- los roles y capacidades se apliquen en API, dominio y UI;
- módulos y acciones no concedidos no aparezcan en navegación y devuelvan error
  estructurado ante acceso directo;
- los límites de investigaciones, miembros, almacenamiento y PDF se apliquen en API, dominio y UI;
- las investigaciones registradas estén aisladas por tenant;
- visitantes sin acción guest explícita y usuarios con email sin confirmar no
  tengan acceso operativo ni filas de investigaciones;
- trial, compra única y suscripción puedan exportar PDF solo cuando exista entitlement, capacidad y rate limit válidos, sin exigir VID;
- cualquier trial, compra única o período de suscripción expirado bloquee toda la aplicación operativa y muestre un modal obligatorio de contratación o renovación;
- los webhooks sean idempotentes;
- las operaciones billing queden auditadas;
- no haya secretos ni PII innecesaria en logs;
- la migración de `localStorage` sea explícita, confirmada, idempotente y auditable;
- `check-types`, lint, tests, build y React Doctor estén atendidos;
- la generación de PDF tenga una solución válida para producción.
- la política de retención y archivado de VID, pagos, auditoría e invoices esté aplicada.

**Estado actual (2026-08-14):** los criterios de acceso, entitlements, módulos,
roles/permisos tenant y platform, guards, APIs administrativas, UI única de
Roles/Permissions y UI de catálogo/trial se encuentran implementados en código.
El Centro Único y sus migraciones están aplicados y verificados remotamente,
incluyendo capacidades reales de Daniel, grants, RPC, auditoría y protecciones
de autoescalada/último SA. La solución todavía no se declara cerrada hasta
resolver el error de typecheck preexistente, ejecutar la validación visual con
sesión real y completar la comprobación end-to-end de Billing/Checkout y Stripe.

---

## 22. Decisiones resueltas y trazabilidad

No quedan decisiones de producto bloqueantes en este documento. Las siguientes
decisiones resueltas gobiernan las migraciones, los contratos API y las
validaciones futuras:

1. **Resuelta (2026-08-09 y confirmada el 2026-08-12):** la compra única
   permite una sesión autenticada de un usuario con email confirmado durante un
   período configurable, con persistencia remota de sus investigaciones y un
   único consumo máximo; la VID no es requisito.
2. **Resuelta (2026-08-12):** existirán dos modalidades separadas: `guest_trial`,
   temporal y limitado a una política allowlisted sin identidad Supabase, y
   `registered_trial`, ligado a usuario confirmado y tenant. El guest podrá
   consultar Pricing y seleccionar un producto, pero no crear un Checkout real ni
   acceder al Billing del tenant. La política guest tendrá `max_sessions = 1`
   por defecto y podrá configurarse explícitamente. Si el guest confirma su email
   durante un trial activo, conservará el tiempo restante y el snapshot de
   entitlements sin recibir un trial nuevo.
3. **Resuelta (2026-08-07):** el lanzamiento será internacional, con `USD`, `EUR` y `CLP`; Stripe Tax calculará los impuestos según el país y la configuración fiscal del cliente.
4. **Resuelta (2026-08-12):** trial, compra única y suscripción registradas podrán descargar PDF únicamente con usuario autenticado, email confirmado, entitlement, capacidad y rate limit válidos. El guest no tendrá PDF salvo que la política allowlisted lo defina explícitamente para datos sintéticos; nunca accederá a datos persistentes ni al Billing del tenant.
5. **Resuelta (2026-08-12):** no habrá conversión automática de la sesión guest
   en una cuenta. Si el guest desea comprar, deberá registrarse y confirmar el
   email; si el trial continúa activo, la cuenta confirmada podrá reclamar de
   forma idempotente el tiempo restante y sus entitlements sin crear otro trial.
   Después podrá crear el Checkout real. El upgrade de `registered_trial` a
   suscripción conservará la identidad autenticada.
6. **Resuelta (2026-08-07):** Basic tendrá 5 investigaciones activas, 1 miembro, 100 MiB y 10 PDFs mensuales; Team tendrá 50 investigaciones, 10 miembros, 1 GiB y 100 PDFs mensuales; Enterprise tendrá límites configurables explícitamente por tenant.
7. **Resuelta (2026-08-09):** la VID conservará únicamente el resultado y los metadatos mínimos necesarios durante el período definido por seguridad y legislación; no se almacenarán documentos de identidad crudos. Pagos, auditoría e invoices se conservarán durante 7 años como mínimo.
8. **Resuelta (2026-08-09):** la VID será un proceso de seguridad independiente; su aprobación no activa Billing, no concede entitlements y no bloquea trial, compras, suscripciones, investigaciones ni PDF.
9. **Resuelta (2026-08-09):** cuando expire el trial, una compra única o el período vigente de una suscripción, se bloqueará toda la aplicación operativa hasta contratar o renovar una modalidad válida. Para usuarios registrados permanecerán accesibles Pricing, Billing, Checkout, autenticación y cierre de sesión para recuperar el acceso; para guest se conservarán únicamente Pricing público, registro y autenticación.
10. **Resuelta (2026-08-09):** la migración de nomenclatura heredada a VID se realizará mediante una migración forward compatible, preservando datos, solicitudes, relaciones, versiones y auditoría histórica; las nuevas acciones y contratos usarán exclusivamente VID.
11. **Resuelta (2026-08-09):** el plan, la suscripción, el Customer de Stripe, las facturas y los entitlements pertenecen al tenant/organización propietaria del workspace. Los miembros activos comparten ese contexto de Billing; el propietario siempre puede comprar y administrar, y las compras de otros miembros se gobiernan mediante la política configurable `billing_purchase_policy`: solo propietario, miembros aprobados o todos los miembros activos. Cambiar, cancelar o reactivar requiere al propietario salvo delegación administrativa separada.
12. **Resuelta (2026-08-12 y ampliada el 2026-08-13):** NovaStore es la
    plataforma y Investigator es una aplicación/módulo. `platform_modules`
    define el catálogo; planes, licencias, trials y overrides conceden snapshots
    de `modules.*` y `actions.*`. El `super_admin` administra el catálogo global
    y las políticas. Roles y capacidades se gestionan desde una única UI con
    contexto multiámbito: las tablas platform y tenant permanecen separadas,
    pero el servicio, el DTO y las APIs son unificados. Las capacidades platform
    son explícitas y nunca sustituyen entitlements comerciales ni se asignan a
    roles tenant.
13. **Resuelta (2026-08-12):** `/`, `/dashboard`, `/datatable`, `/forms`, `/apps`
    y sus APIs requieren guard server-side. La excepción guest se limita a las
    rutas `/demo/investigator/*` y APIs allowlisted del guest trial.
14. **Resuelta (2026-08-13):** `super_admin` es un rol platform con capacidades
    reales, no un bypass. Puede gestionar roles y capacidades de plataforma y
    tenants solo mediante `platform.access.*` y
    `platform.access.tenant_roles.manage`. Las operaciones sobre el propio rol
    y el último SA requieren las protecciones reforzadas descritas en la sección
    9.22.
15. **Resuelta (2026-08-14):** `platform.access.capabilities.manage` también
    autoriza la asignación de capacidades tenant/global desde el Centro Único.
    `replace_role_capabilities` valida esa capacidad explícita, conserva
    `SECURITY DEFINER` con `search_path` fijo, revoca ejecución a `public` y
    `anon`, y concede ejecución únicamente a `authenticated` y `service_role`.
16. **Resuelta (2026-08-14):** la policy RLS de inserción directa en
    `role_capabilities` aplica la misma frontera que el RPC y rechaza
    `platform.*` y `billing.plans.manage` incluso cuando el actor posee
    `platform.access.capabilities.manage`. La corrección forward quedó aplicada
    como `unified_access_tenant_capability_boundary`.
17. **Resuelta (2026-08-14):** la gestión de avatares de usuarios, logos de espacios
    de trabajo y avatares de equipos reside en el bucket público `avatars` de
    Supabase Storage con límite estricto de 500 KB por archivo. Las tablas de base
    de datos (`profiles`, `workspaces`, `teams`, `tenants`) almacenan únicamente la
    URL pública (~80 bytes). Queda estrictamente prohibido guardar Base64 en
    `auth.users.raw_user_meta_data` para evitar inflación de tokens JWT y errores
    HTTP 431/500. Se crea la migración de base de datos para `workspaces`, `tenants`,
    `teams` y `team_members`.
18. **Resuelta (2026-08-14):** la tabla `public.profiles` implementa la política RLS
    `profiles_update_own` (`FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid())`),
    y los endpoints de backend aplican operaciones idempotentes con `upsert()` y
    trigger de aprovisionamiento de perfil en `auth.users`, garantizando que todo
    usuario autenticado actual o nuevo mantenga su fila de perfil y avatar. La sección
    de Email & Password se unifica en la pestaña Seguridad (`/pages/user-settings?setting=security`).
19. **Resuelta (2026-08-14):** la gobernanza de equipos funcionales (`teams` y `team_members`)
    reside en `user-settings/workspace`. Solo los roles `owner` y `admin` del espacio de trabajo
    pueden crear equipos (`teams.create`) o eliminarlos (`teams.delete`). La administración de
    miembros dentro de cada equipo (`teams.members.manage`) corresponde al `owner`, `admin`
    y al `lead` asignado al equipo. Las capacidades funcionales del módulo se declaran en
    `src/features/access/capabilityManifest.ts`: `teams.read`, `teams.create`, `teams.update`,
    `teams.members.manage`, `teams.delete`. Se implementa el endpoint `/api/teams/[id]/members`
    y el componente modal `ManageTeamMembersDialog`.
20. **Resuelta (2026-08-14):** la arquitectura de navegación de NovaStore ERP adopta URLs
    jerárquicas contextuales multi-tenant:
    `http://localhost:4101/apps/[tenantSlug]/[workspaceSlug]/[teamSlug]/[modulo]/[recurso]/[id]`.
    Los Breadcrumbs en `Header.tsx` se sincronizan automáticamente con la jerarquía organizativa
    (Organización > Espacio de Trabajo > Equipo > Módulo > Expediente) para deep linking y
    visibilidad inmediata sin ambigüedad.
21. **Resuelta (2026-08-15):** se establece la política de seguridad RLS `profiles_select_tenant_members`
    en `public.profiles` permitiendo que los miembros activos de un mismo espacio de trabajo / organización
    puedan consultar el `display_name` y `avatar_url` de sus compañeros para asignaciones colaborativas
    en equipos de trabajo (`teams`), investigaciones y tableros Kanban, manteniendo el aislamiento
    estricto entre diferentes organizaciones.
22. **Resuelta (2026-08-15):** los equipos de trabajo (`teams`) incorporan soporte completo de etiquetas
    (`tags text[] NOT NULL DEFAULT '{}'`), permitiendo categorización multidimensional (ej. *Consultoría, Estrategia, TI*)
    desde los modales de creación (`CreateTeamDialog`) y edición (`EditTeamDialog`). El endpoint `/api/user/profile-overview`
    hidrata de forma relacional los miembros asignados (`team_members` + `profiles`) y las etiquetas reales de cada equipo,
    y se estandariza el selector de colaboradores en `ManageTeamMembersDialog` con alineación canónica del chevron a la derecha.
23. **Resuelta (2026-08-15):** la política de delegación de compras de suscripciones (*Purchase Delegation*)
    en `/pages/user-settings?setting=billing` integra el panel interactivo condicional para la opción
    `Owner & Specifically Delegated Members` (`approved_members`). El propietario (*Owner*) puede autorizar
    a colaboradores específicos del espacio de trabajo mediante `POST /api/billing/purchase-delegations`,
    visualizar sus perfiles enriquecidos (avatar, nombre, estado, fecha) y revocar delegaciones en tiempo real
    vía `DELETE /api/billing/purchase-delegations/[id]`.
24. **Resuelta (2026-08-15):** la página de planes y suscripciones `/pages/pricing` estructura las características
    comerciales de los planes agrupadas modularmente por aplicaciones del ecosistema (App Investigator, App Kanban,
    Espacio de Trabajo & Equipos) con límites formateados en lenguaje natural de negocio (ej. número de investigaciones activas,
    exportaciones PDF al mes, capacidad de almacenamiento en MB/GB y usuarios por espacio de trabajo), sustituyendo
    los nombres técnicos de clave de base de datos. Asimismo, el servicio de delegación de compras resuelve colaboradores
    cruzando `workspace_memberships` y `memberships` con perfiles enriquecidos.
25. **Resuelta (2026-08-15):** la actualización de roles y estados de miembros en `/apps/users/list` y modales de configuración
    incorpora un mecanismo resiliente de bloqueo optimista (*optimistic locking*) en `src/features/users/repository.ts` que tolera
    variaciones de precisión en milisegundos/microsegundos de `TIMESTAMPTZ` de PostgreSQL, evitando falsos positivos de conflicto de versión
    ("El miembro fue modificado por otra sesión"). Además, la resolución de candidatos para delegación de compras (`Purchase Delegation`)
    incluye todos los perfiles de colaboradores visibles en la organización y sincroniza de forma concurrente el `workspaceId` vía `Promise.all`.
26. **Resuelta (2026-08-15):** el motor de presentación de tarjetas de planes en `/pages/pricing` es 100% dinámico y desacoplado de códigos o nombres de planes estáticos (`basic`, `team`, etc.). Renderiza exclusivamente las capacidades y límites cuantitativos asignados a cada plan en la tabla `public.plan_entitlements` configurados a través del módulo administrativo (`/apps/platform/billing`), clasificando dinámicamente las características según su dominio (`investigations.*`, `kanban.*`, `storage.*`, `users.*`, `teams.*`) y formateando en tiempo real las unidades y cuotas configuradas en la base de datos sin requerir cambios en el código de la interfaz de usuario.
27. **Resuelta (2026-08-15):** la resolución de miembros para delegación de compras en `src/features/billing/service.ts` consulta exclusivamente las columnas reales de `public.profiles` (`id, display_name, avatar_url, status`) e hidrata los correos electrónicos mediante la API administrativa de autenticación de Supabase (`auth.admin.getUserById`), solventando el fallo SQL `42703 (column profiles.email does not exist)`. Asimismo, al otorgar una delegación (`POST /api/billing/purchase-delegations`), se despacha automáticamente una notificación por correo electrónico transaccional vía Resend (`sendPurchaseDelegationEmail`) al colaborador autorizado (con nombre de quien autoriza, nombre del espacio de trabajo, facultades concedidas y enlace directo a `/pages/pricing`).
28. **Resuelta (2026-08-15):** las funciones almacenadas `public.grant_billing_purchase_delegation` y `public.revoke_billing_purchase_delegation` incorporan la directiva `#variable_conflict use_column` y alias explícitos en las tablas consultadas y actualizadas (`supabase/migrations/2026-08-15T18-00-00_fix_purchase_delegation_rpc_ambiguity.sql`), solventando el fallo de ambigüedad de columnas PostgreSQL `42702 (column reference "workspace_id" is ambiguous)` originado por los parámetros de salida de la cláusula `RETURNS TABLE`. Con esto, la delegación y revocación de facultades de compra se ejecuta atómicamente y sin errores de ambigüedad en PL/pgSQL.
29. **Resuelta (2026-08-15):** en la administración de módulos de la plataforma (`/apps/platform/billing` y `src/features/billing/admin-service.ts`), la auditoría de creación y actualización de módulos (`public.platform_modules`) registra `entity_id = null` y almacena la clave del módulo en `metadata: { module_key }` y en los diffs `before_data`/`after_data`. Esto solventa el error PostgreSQL `22P02 (invalid input syntax for type uuid: "investigator")`, ya que `module_key` es una clave alfanumérica de catálogo global mientras que `audit_logs.entity_id` es de tipo `UUID`, garantizando que la edición de nombres, descripciones, rutas y estados de módulos se ejecute y confirme exitosamente con código HTTP 200 sin falsos positivos de fallo.
30. **Resuelta (2026-08-15):** se establece la arquitectura unificada y dinámica de Módulos de la Plataforma (`public.platform_modules`), Catálogo de Planes (`public.plans` y `public.plan_entitlements`) y Pricing (`/pages/pricing`). La tabla `public.platform_modules` actúa como el catálogo maestro de aplicaciones y soluciones del ecosistema NovaStore (ej. `investigator`, `kanban`, `calendar`, `mail`, `vid`, `billing`). En el módulo de administración (`/apps/platform/billing`), la pestaña **Módulos** presenta la matriz de inclusión en planes para cada aplicación, y el formulario de edición/creación de planes en la pestaña **Catálogo de Planes** ofrece selectores estructurados basados en los módulos activos registrados en la base de datos (con configuración de cuotas de límites específicas por módulo) en lugar de requerir digitación manual de claves técnicas. El endpoint público `/api/billing/plans` y la página `/pages/pricing` agrupan y presentan las características de los planes asociándolas directamente con los módulos activos de `platform_modules`, renderizando nombres, descripciones y límites en tiempo real sin requerir cambios de código ante la incorporación de nuevas aplicaciones al ecosistema.
31. **Resuelta (2026-08-15):** se flexibiliza y endurece la validación de entitlements de planes comerciales en `src/features/billing/admin-service.ts` (`validatePlanEntitlements`) y `src/lib/billing/entitlements.ts`. Se permite que los límites de capacidad en planes comerciales acepten `limitValue: null` para representar cuotas ilimitadas (ej. planes Lifetime o Enterprise con investigaciones, colaboradores y proyectos ilimitados). Asimismo, se amplía el reconocedor canónico de límites para admitir tanto `.max_` como `_max` (`kanban.max_projects`, `kanban.projects_max`) y se unifica la clave canónica del módulo Kanban en `public.platform_modules` como `module_key: 'kanban'`.
32. **Resuelta (2026-08-16):** se blinda el acceso al módulo App Kanban (`/apps/kanban`) bajo el modelo de seguridad en 3 capas de NovaStore ERP (Route Guards, Domain Services y Route Handlers). Se implementa `src/app/(pages)/apps/kanban/layout.tsx` con `requireModuleAccess('kanban')`, redirigiendo automáticamente a `/pages/pricing` si el plan activo del tenant no incluye el entitlement `modules.kanban`. Asimismo, todos los Route Handlers de Kanban (`/api/kanban`, `/api/kanban/tasks`, `/api/kanban/tasks/[id]`) aplican `requireModuleAccess('kanban')` antes de ejecutar cualquier consulta o mutación sobre `kanban_columns` y `kanban_tasks`, garantizando que solo los tenants con planes habilitados (ej. Team, Lifetime, Enterprise) puedan interactuar con los tableros ágiles e iniciativas CAME.
33. **Resuelta (2026-08-17): Desacoplamiento de Semilla Demo vs Dominio Puro Metodológico en NovaInvestigator:**
    Todo el contenido específico del caso demostrativo ETECSA (factores prefijados `F-01..F-05`, `D-06..D-10`, `O-01..O-05`, `A-06..A-10`, mapeos específicos de estrategias por factor, textos de evidencia de tesis simulada y matrices de atractivo QSPM y CAME demostrativas) queda estrictamente encapsulado en `src/utils/investigator/demo.ts` para alimentar exclusivamente `createDemoState()` y las pruebas del baseline áureo (`tests/apps/investigator/domain.test.ts`). La lógica de cálculo en `src/utils/investigator/domain.ts` queda completamente desacoplada de IDs fijos y referencias fijas de texto, operando como un motor puro de cálculo cuantitativo para cualquier dimensión de factores $N \ge 0$.
34. **Resuelta (2026-08-17): Inicialización en Cero Absoluto (Zero-State) y Adopción de TanStack Table:**
    Al crear una nueva investigación mediante `createBlankState()`, el expediente arranca con 0 factores (`internal: []`, `external: []`), 0 relaciones (`relationships: []`), 0 estrategias (`strategies: []`), 0 acciones CAME (`cameActions: []`), `qspmScores: {}` y `selectedStrategyId: null`. El investigador puede registrar libremente cualquier cantidad de factores por cuadrante ($N_F, N_D, N_O, N_A \ge 0$). La sincronización reactiva de relaciones genera y purga dinámicamente los cruces pendientes ($|Internal| \times |External|$) preservando los cruces evaluados. Todas las tablas de las etapas del flujo (`FactorEditor` EFI/EFE, `InvestigatorDafoView`, `InvestigatorQspmView`, `InvestigatorCameView`) se estructuran mediante `@tanstack/react-table` utilizando los tokens de diseño y componentes de shadcn/ui.
35. **Resuelta (2026-08-17): Sincronización en Tiempo Real, Reconciliación 409, Trazabilidad de Auditoría y Protección de Autoría:**
    - **Sincronización y Reconciliación Realtime:** Se implementa un canal de WebSocket mediante Supabase Realtime (`investigation:[id]`) para propagar cambios de estado en vivo entre múltiples usuarios conectados de un mismo espacio de trabajo. Ante colisiones de guardado concurrente (`PATCH 409 Conflict - VERSION_CONFLICT`), el hook `useInvestigatorAnalysis` ejecuta una reconciliación automática obteniendo el registro actualizado más reciente del servidor (`GET /api/investigations/:id`), actualizando la referencia `remoteVersionsRef` y aplicando los cambios locales sin pérdida de datos ni bloqueo de la interfaz.
    - **Trazabilidad y Auditoría Completa:** La entidad `investigations` se amplía con `last_opened_at` (timestamptz), `last_opened_by` (uuid) y metadatos de autoría enriquecidos (`created_by_name`, `created_by_email`, `updated_by_name`, `updated_by_email`). El Gestor de Investigaciones (`/apps/investigator/investigations`) expone de forma explícita en cada fila: Autor y fecha de creación, Última edición con usuario y número de versión (`v.N`), y Último acceso registrado.
    - **Protección de Autoría y Gobernanza de Acceso:** La tabla `investigations` incorpora `is_locked` (boolean) y `access_level` (`private` | `team_read` | `team_write`). El autor/propietario (`owner_id`) puede bloquear la investigación o restringirla a modo solo lectura para el equipo. El backend (`PATCH /api/investigations/:id` y trigger de PostgreSQL) rechaza con `403 Forbidden` (`INVESTIGATION_LOCKED`) toda mutación originada por usuarios sin privilegios de edición sobre investigaciones protegidas, mientras que la UI conmuta dinámicamente a **Modo Consulta**, deshabilitando controles de mutación y presentando una insignia informativa clara.
36. **Resuelta (2026-08-19): Resiliencia del Gestor de Investigaciones, Skeletons de Sincronización y Corrección de Trigger de Bloqueo:**
    - **Skeletons de Carga y Supresión del Parpadeo de Estado Vacío:** La vista del Gestor de Investigaciones (`/apps/investigator/investigations`) adopta la condición unificada de carga `isLoading = !hydrated || syncStatus === 'loading'`. Durante el proceso de hidratación y consulta asíncrona a la base de datos remota, se renderizan skeletons completos con siluetas de títulos, badges de estado, botones de acción y metadatos de auditoría, impidiendo que la pantalla muestre erróneamente el mensaje transitorio "No hay datos disponibles".
    - **Métricas y Encabezado Semántico Enriquecido:** Se reestructura la cabecera del gestor para mostrar métricas cuantitativas claras y comprensibles: `{totalCount} expedientes en total · {activeCount} activos · {closedCount} cerrados · {archivedCount} archivados`, junto con etiquetas de auditoría internacionalizadas en los 5 idiomas soportados (`investigator.author`, `investigator.modifiedBy`, `investigator.totalFiles`, `investigator.activeFiles`).
    - **Corrección de Trigger de Transición y Control de Versiones Optimista en Bloqueo:** Se publica la migración forward `supabase/migrations/2026-08-19T13-45-00_fix_investigations_lock_transition_trigger.sql` actualizando la función trigger `public.validate_investigation_transition()` en PostgreSQL. Se reconoce a `is_locked` y `access_level` como modificaciones válidas de negocio en operaciones de mutación con incremento de versión (`new.version = old.version + 1`), eliminando el fallo PostgreSQL `22023 (investigation update must change a business field)` y asegurando que las peticiones `PATCH /api/investigations/:id` para proteger/desproteger expedientes se procesen de inmediato con código HTTP 200.
37. **Resuelta (2026-08-19): Gobernanza Granular de Expedientes, Modal de Compartición y Asignación de Co-autores/Colaboradores Específicos:**
    - **Compartición Granular con Miembros Específicos:** El autor/propietario (`owner_id`) de un expediente puede compartir la investigación con miembros individuales del espacio de trabajo (`workspace_memberships` y `public.profiles`) mediante el modal `ShareInvestigationDialog`, asignando roles granulares de acceso (`editor` o `viewer`).
    - **Estructura de Colaboradores (`collaborators`):** La entidad `InvestigationState.metadata` y la carga útil del servicio `patchInvestigation` incorporan `collaborators: Array<{ userId: string, displayName: string, avatarUrl?: string | null, email?: string | null, role: 'editor' | 'viewer', addedAt: string }>`.
    - **Gobernanza de Acceso y Edición en Investigaciones Protegidas:**
      - Cuando un expediente está protegido (`is_locked = true`) o en modo de solo lectura general (`access_level = 'team_read'`), el autor (`owner_id`) y los colaboradores asignados con rol `editor` (co-autores autorizados) conservan plenas facultades de mutación sobre las matrices y el flujo estratégico (EFI/EFE, DAFO, QSPM, CAME).
      - Los colaboradores asignados con rol `viewer` y el resto de los miembros del espacio de trabajo acceden en **Modo Consulta (Solo Lectura)**.
      - Cuando el nivel de acceso general se establece en `private`, la visibilidad del expediente se restringe exclusivamente al autor y a los colaboradores explícitamente autorizados.
    - **Experiencia de Usuario e Interfaz en el Gestor de Investigaciones:**
      - En `ResearchCard`, se incorpora el botón interactivo **Compartir** (`Share2`/`UserPlus`), accesible para el autor y miembros autorizados.
      - `ShareInvestigationDialog` proporciona un selector de visibilidad general del espacio de trabajo (`Colaborativa`, `Solo lectura para equipo`, `Privada`), un selector de miembros del workspace para invitaciones instantáneas con asignación de rol (`Editor` / `Lector`), listado de colaboradores vigentes con insignias de rol (`Propietario`, `Editor`, `Lector`), alternancia de roles y revocación de acceso.
    - **Contratos de Servicio y API (`PATCH /api/investigations/:id` y `GET /api/workspace/members`):**
      - El esquema `patchInvestigationRequestSchema` y el servicio `src/lib/investigations/service.ts` validan y persisten `collaborators` y `accessLevel`. La capa de servicio autoriza mutaciones si `isOwner || isApprovedCollaboratorEditor`.
      - Se implementa el endpoint `GET /api/workspace/members` para suministrar la lista de colaboradores del workspace al diálogo de compartición de forma reactiva y tipada.
38. **Resuelta (2026-08-19): Optimización de UX/UI en Gestor de Investigaciones, Menú Contextual de 3 Puntos, Ordenación Persistente, Carga Inteligente de Último Acceso y Diseño Monocromático shadcn:**
    - **Menú Contextual de 3 Puntos (`DropdownMenu`):** Se reemplaza la barra horizontal de botones dispersos por un menú desplegable accesible (`DropdownMenu`) con icono `MoreVertical` en la esquina superior derecha de `ResearchCard`. Se mantiene visible el botón de acción principal **Abrir expediente** y se agrupan limpiamente las acciones secundarias (`Renombrar`, `Duplicar`, `Bloquear / Desbloquear`, `Compartir`, `Archivar / Restaurar`, `Cerrar`).
    - **Visibilidad Condicional de la Acción Compartir:** La opción de compartir solo es visible y accesible en el menú si la investigación está protegida (`is_locked = true` o `access_level !== 'team_write'`) y el usuario es el propietario (`isOwner`). Si el expediente es colaborativo abierto, todos en el workspace ya tienen acceso de lectura y escritura por defecto.
    - **Aislamiento y Autorización Estricta de Apertura en Expedientes Privados:**
      - En backend (`getInvestigation` en `src/lib/investigations/service.ts`), si `access_level === 'private'`, se valida que el usuario sea el autor (`owner_id`) o esté registrado como colaborador autorizado (`collaborators.some(...)`). De lo contrario, se lanza `InvestigationError.forbidden()`.
      - En frontend, la interfaz restringe la apertura para usuarios no autorizados.
    - **Alineación Inmóvil de Badges y Tags a la Derecha:** La cabecera de la tarjeta se estructura con separación estricta: a la izquierda, el título del expediente con ancho flexible y truncado (`truncate`); a la derecha, un bloque inmóvil y de posición fija que contiene todos los badges de estado (`[Activo]`, `[Borrador/En análisis/etc.]`, `[Protegida/Colaborativa]`, `[Colaboradores]`), el botón "Abrir" y el disparador del menú de 3 puntos, evitando desplazamientos irregulares al variar la longitud del título.
    - **Carga Automática de la Última Investigación Abierta:** Al sincronizar el workspace (`useInvestigatorAnalysis`), la plataforma resuelve y activa automáticamente la última investigación abierta consultando `localStorage.getItem('novastore:last_opened_investigation_id')`, respaldado por el campo `last_opened_at` más reciente en la base de datos, garantizando que el investigador retome de inmediato su trabajo previo.
    - **Ordenación Dinámica con Persistencia en Preferencias de Usuario:** Se integra un selector de ordenación en la cabecera del gestor (`DropdownMenu` / `Select` con `ArrowUpDown`) soportando criterios: Última edición (más reciente/antigua), Alfabético (A-Z/Z-A), Fecha de creación y Última vez abierta. El criterio seleccionado se persiste en `localStorage` (`novastore:investigations_sort_order`) y se aplica reactivamente.
    - **Mutación Optimista Instantánea y Sincronización en Renombrar:** `renameResearch` actualiza de inmediato el estado en memoria y la lista `investigations` sin esperar el ciclo asíncrono del servidor. En `ResearchCard`, presionar `Escape` o "Cancelar" restaura inmediatamente el valor original en `draft`, y la tarjeta refleja el nuevo título de inmediato.
39. **Resuelta (2026-08-19): Arquitectura de Historial Diferencial Ligero (Deltas / Registro de Cambios) y Prevención de Desbordamiento de Payload (HTTP 413):**
    - **Eliminación de Clones de Estado Completo en Historial:** Se suprime el almacenamiento redundante de instantáneas completas del estado (`snapshot: cloneState(...)`) dentro del array embebido `state.history`, el cual multiplicaba el tamaño del documento por el número de versiones y ocasionaba el error `HTTP 413 (Payload Too Large)` en peticiones `PATCH /api/investigations/:id`.
    - **Modelo de Historial Diferencial (`HistoryEntry` con `changes: HistoryChangeDetail[]`):** El estado activo (`state`) mantiene en todo momento el 100% de la información completa en su última versión, mientras que cada entrada de `state.history` pasa a registrar exclusivamente los metadatos y deltas de la modificación (`id`, `version`, `timestamp`, `reason`, `authorName`, `changes: Array<{ area, action, summary, entityId? }>`).
    - **Reducción de Payload en >99%:** El costo por versión en el historial se reduce de ~45 KB a ~300 bytes, manteniendo un historial de hasta 50 revisiones en apenas ~15 KB en lugar de ~900 KB.
    - **Saneamiento Automático de Datos Legacy:** Al normalizar y leer investigaciones (`normalizeStoredState` en `src/utils/investigator/workspace.ts`), cualquier propiedad `snapshot` heredada se purga automáticamente preservando la información cronológica, reduciendo instantáneamente el tamaño de los expedientes existentes.
    - **Ampliación de Límites Preventivos en Backend:** Se actualiza `MAX_STATE_PAYLOAD_BYTES` a 2 MB (`2 * 1024 * 1024`) en `src/lib/investigations/schema.ts` y `MAX_REQUEST_BODY_BYTES` a 4 MB (`4 * 1024 * 1024`) en `src/lib/investigations/http.ts`, garantizando un margen amplio y seguro para investigaciones extensas con cientos de factores y relaciones estratégicas.
40. **Resuelta (2026-08-19): Skeletons de Carga en Vistas de Análisis, Estado Vacío en Informe Resumen y Reordenación del Gestor de Investigaciones al Inicio de Navegación y Pestañas:**
    - **Skeletons de Carga en Pantallas de Análisis (`Summary`, `Context`, `EFI`, `EFE`, `DAFO`, `QSPM`, `CAME`):** Las vistas de la suite de Investigador adoptan la condición unificada de carga `isLoading = !hydrated || syncStatus === 'loading'`. Durante el proceso de hidratación y consulta asíncrona a la base de datos remota, se renderizan skeletons completos con siluetas de cabeceras, tarjetas métricas, matrices y formularios, impidiendo parpadeos, pantallas en blanco o cálculos erróneos con valores temporales en cero.
    - **Estado Vacío (*Empty State*) en Informe Resumen:** La vista de Resumen (`/apps/investigator/summary`) evalúa si la investigación activa contiene datos introducidos (`state.internal.length > 0 || state.external.length > 0`). Si el expediente no contiene factores o está vacío, se oculta la generación de prosa narrativa ficticia y se muestra un estado vacío elegante con explicación metodológica y accesos directos (*Call-To-Action*) para registrar factores en EFI/EFE o abrir un expediente existente desde el Gestor.
    - **Reordenación de Navegación y Pestañas al Inicio para el Gestor de Investigaciones:**
      - En el menú lateral de navegación (`src/configs/navConfig.tsx`), el submenú de *Investigator* ubica al **Gestor de Investigaciones** (`/apps/investigator/investigations`) como su **primer elemento**.
      - En la barra de pestañas de la aplicación (`NAV_ITEMS` en `src/utils/investigator/constants.ts` y `src/app/(pages)/apps/investigator/layout-client.tsx`), la pestaña **Gestor** (`investigator.manager`) pasa a ser la primera pestaña visible.
      - La ruta raíz `/apps/investigator` (`src/app/(pages)/apps/investigator/page.tsx`) redirige por defecto al Gestor de Investigaciones (`/apps/investigator/investigations`).
41. **Resuelta (2026-08-19): Copiloto de IA y Redacción Inteligente de Dictámenes Metodológicos con Gobernanza de Entitlements y Cuotas:**
    - **Proveedor y Motor de Inteligencia Artificial:** Se integra Google Gemini API (`gemini-2.5-flash` / `gemini-2.0-flash` vía Google AI Studio) como motor primario (cuota gratuita de 1,500 solicitudes/día y ventana de contexto de 1M de tokens para lectura íntegra de expedientes y matrices) con fallback automático de alta velocidad a Groq Cloud (`llama-3.3-70b-versatile`).
    - **Gobernanza Comercial de Entitlements por Plan de Suscripción:**
      - `modules.ai_copilot`: Habilitación general del copiloto para el tenant.
      - `actions.ai_free_text_chat`: Control booleano de escritura libre en el chat. En el Plan Free / Prueba, este entitlement está desactivado por defecto (el usuario interactúa exclusivamente mediante botones/chips de prompts predefinidos organizados por etapas metodológicas). En los Planes Pro / Business / Enterprise, el chat libre multi-turno está plenamente desbloqueado.
      - `actions.ai_academic_report`: Permite generar la redacción ejecutiva y de defensa de tesis asistida por IA.
      - `limits.ai_queries_monthly`: Cuota cuantitativa mensual de consultas asignadas al tenant (ej. Free: 10, Starter: 100, Pro: 500, Enterprise: 2500 / ilimitado), registrada y acumulada en la tabla `public.tenant_ai_usage`.
    - **Redacción de Informe con IA y Advertencia Preventiva de Cuota:**
      - En la tarjeta del informe resumen (`/apps/investigator/summary`), se incorpora el botón **"✨ Redactar dictamen con IA"**.
      - Antes de invocar la API de IA, se despliega un diálogo de confirmación que informa al usuario: *«Esta acción generará un dictamen enriquecido con IA y consumirá 1 consulta de tu plan. Te quedan X de Y consultas este mes. ¿Deseas continuar?»*, impidiendo consumos accidentales y ofreciendo enlace de actualización a Pro en caso de cuota agotada.
      - La vista permite alternar entre el **Dictamen Estándar (Algorítmico)** y el **Dictamen Enriquecido con IA**.
    - **Copiloto Lateral Deslizante (`<InvestigatorAiCopilot />`):** Panel interactivo con streaming SSE en tiempo real, catálogo de prompts rápidos (*diagnóstico de debilidades, implicaciones DAFO, consistencia de ponderaciones, acciones CAME*), barra de cuota restante e inyección automática del expediente activo en el prompt de sistema.
42. **Resuelta (2026-08-22): Rediseño de UX/UI en Matriz Cuantitativa de Planificación Estratégica (QSPM) — Vista Continua a Ancho Completo, Tarjetas de Alternativas y CRUD Exclusivo en Modal:**
    - **Visualización Continua Sin Pestañas (Full-Width Dashboard):** Se suprime la disposición asimétrica 1/3 + 2/3 que apretaba la tabla matricial y las tarjetas de alternativas. La matriz QSPM pasa a ocupar el 100% del ancho del viewport en la sección superior, permitiendo visualizar cómodamente todas las alternativas estratégicas evaluadas como columnas y los factores críticos como filas sin forzar scroll horizontal con 4 a 6 alternativas.
    - **Separadores Visuales de Grupo y Subtotales Dinámicos:** La tabla incorpora filas divisorias de grupo para 'Factores Internos (EFI)' y 'Factores Externos (EFE)' con sus respectivos subtotales de pesos y puntuaciones de atractivo ponderado, mejorando la legibilidad metodológica.
    - **Tarjetas de Alternativas Siempre Abiertas y Limpias:** En el grid inferior izquierdo, las alternativas estratégicas se presentan en tarjetas de lectura estilizadas con badges de cuadrante (`FO`, `DO`, `FA`, `DA`), nombre destacado, descripción concisa, puntaje TAS acumulado y botón para seleccionar como ganadora del expediente. Se eliminan los inputs de texto editables directos dentro de las tarjetas.
    - **CRUD Exclusivo en Diálogo Modal (`StrategyModalDialog`):** La creación (`+ Añadir alternativa`) y edición de alternativas estratégicas se traslada a un diálogo modal espacioso y accesible con validación de campos (código, cuadrante, nombre, descripción).
    - **Ranking de Atractivo Visual con Barras Proporcionales:** El panel de ranking incorpora barras de progreso (`Progress`) relativas al puntaje TAS líder, ofreciendo una comparación instantánea del atractivo cuantitativo entre opciones.
    - **Barra de Métricas y KPIs de Cabecera:** Indicadores clave en la parte superior (total de alternativas, alternativa líder TAS, alternativa seleccionada y progreso de evaluación de factores).

43. **Resuelta (2026-08-25): Arquitectura de Responsividad Móvil, Cierre Automático de Sidebar y Desacoplamiento de Botones Flotantes:**
    - **Cierre Automático del Sidebar en Móvil al Navegar:** En `src/components/layout/Sidebar.tsx`, los enlaces de navegación consumen el setter `setOpenMobile(false)` del contexto `useSidebar()`. Al hacer clic en cualquier ítem del menú en dispositivos móviles o pantallas táctiles, el Drawer del sidebar se oculta automáticamente, permitiendo visualizar la pantalla de destino sin bloqueos.
    - **Desacoplamiento del Botón Flotante "Upgrade your plan":** El componente global `src/components/layout/UpgradePro.tsx` se elimina de la posición fija flotante inferior (`fixed right-15 bottom-8 z-50`) en vistas móviles y en aplicaciones de pantalla completa como NovAi (`/apps/novai`), evitando que cubra los elementos interactivos o el composer de texto. La llamada a la acción de Upgrade se traslada a la barra superior (`Header`) y al menú de usuario.
    - **Ajuste Responsive en Gestor de Investigaciones (`StageHeader` y `ResearchCard`):** En `src/views/apps/investigator/investigations/index.tsx`, se reestructuran los contenedores flexibles con `flex-wrap`, `min-w-0` y saltos de línea automáticos. Los botones de acción (`Cargar Demo`, `+ Nueva investigación`, `Abrir expediente`) y los badges de estado/colaboración se adaptan fluidamente a pantallas pequeñas sin desbordamiento horizontal ni truncamiento forzado de textos.

44. **Resuelta (2026-08-25): Tooltips Flotantes Detallados en Estado de Validación y Sincronización de Cruces DAFO Pendientes:**
    - **Tooltips Flotantes de Diagnóstico en la Tarjeta Estado de Validación:** En `src/views/apps/investigator/summary/index.tsx`, la tarjeta de validación se moderniza incorporando componentes flotantes de shadcn/ui (`@/components/ui/tooltip`). Al posicionar el cursor sobre cualquiera de las 6 etapas estratégicas (`Contexto`, `EFI`, `EFE`, `DAFO`, `QSPM`, `CAME`):
      - Si la etapa está completa (`ready`), se muestra una confirmación afirmativa en verde: *«Todos los criterios metodológicos completados correctamente.»*
      - Si la etapa presenta errores o advertencias (`error` / `warning`), el tooltip despliega un desglose detallado con viñetas de cada issue detectado por el motor de validación (ej. *«Quedan 4 cruces por calificar»*, *«La alternativa QSPM no tiene justificación»*, *«Los pesos CAME suman 0.90; deben sumar 1.00»*).
    - **Sincronización del Validador con Cruces DAFO Pendientes:** Se actualiza `validateInvestigationState` en `src/utils/investigator/domain.ts` para que reconozca con precisión los cruces en estado `pending` o sin calificar según los nuevos 5 niveles de fuerza (`pending`, `0`, `1`, `2`, `3`), indicando exactamente al usuario qué parejas de factores requieren calificación.

45. **Resuelta (2026-08-25): Arquitectura de NovAi Móvil (Estándar ChatGPT), Drawer Overlay y Persistencia Centralizada en PostgreSQL:**
    - **Diseño Móvil Estilo ChatGPT en NovAi:** En `src/views/apps/novai/index.tsx` y `src/views/apps/novai/components/novai-sidebar.tsx`:
      - En pantallas móviles (`< 768px`), el sub-sidebar de hilos de chat se oculta al 100% al estar colapsado (ancho 0), entregando todo el viewport al hilo de mensajes y al composer.
      - Al pulsar el botón de historial en la cabecera superior, el sub-sidebar se despliega como un Sheet/Drawer flotante con fondo translúcido (`backdrop-blur`) y animación lateral suave.
      - El botón de Upgrade / Estado del Plan se ubica en la cabecera superior o al pie del drawer, manteniendo el área inferior despejada exclusivamente para el composer.
    - **Persistencia Centralizada Multi-Dispositivo con Supabase PostgreSQL:** La gestión de hilos y mensajes de NovAi se sincroniza de forma transparente con las tablas `public.novai_conversations` y `public.novai_messages` mediante `conversations-repository.ts` y Route Handlers server-side. Se mantiene `localStorage` exclusivamente como caché local optimista y soporte offline, permitiendo al usuario acceder a su historial completo de conversaciones desde cualquier navegador o dispositivo.
    - **Integración Completa con Primitives `@ai-elements`:** Composición de estados visuales de razonamiento (`<Reasoning>` / `<ChainOfThought>`) y ejecución de herramientas en vivo (`<Tool>` / `<ToolCall>`) durante las auditorías matriciales y análisis estratégicos de NovAi.

Estas decisiones sustituyen las reglas comerciales anteriores y deben gobernar las
migraciones, contratos API y validaciones futuras. Las migraciones ya aplicadas
no se editarán destructivamente; cualquier cambio de nomenclatura o contrato se
realizará mediante una nueva migración forward.

