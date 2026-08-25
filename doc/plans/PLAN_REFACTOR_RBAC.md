Sí. Y después de revisar cómo están resolviendo esto AWS, OWASP, NIST, Auth0 y OpenFGA, te diría algo importante:

**NovaStore no debería intentar resolver todo con RBAC.**

Por lo que describes, tienes **tres dimensiones distintas de autorización**:

1. **Quién es el usuario dentro del tenant** → roles.
2. **A qué recursos concretos tiene acceso** → workspace/team/objetos.
3. **Qué puede hacer el tenant según lo que compró** → entitlements/commercial policies.

Si mezclas las tres en `roles`, vas a terminar con una explosión de roles y reglas imposibles de mantener. OWASP incluso recomienda considerar ABAC/ReBAC cuando RBAC empieza a quedarse corto, especialmente en sistemas multi-tenant y colaborativos. ([OWASP Cheat Sheet Series][1])

---

# Mi recomendación para NovaStore

Yo diseñaría una arquitectura de autorización **híbrida RBAC + ReBAC + ABAC/Entitlements**.

Conceptualmente:

```text
                         ┌──────────────────────┐
                         │      USER / IDENTITY │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │    TENANT MEMBERSHIP │
                         │                      │
                         │ Owner / Admin / ...  │
                         └──────────┬───────────┘
                                    │
                    ┌───────────────┼────────────────┐
                    │               │                │
                    ▼               ▼                ▼
              Workspace          Team          App/Module
              membership        membership       access
                    │               │                │
                    └───────────────┼────────────────┘
                                    ▼
                         ┌──────────────────────┐
                         │   AUTHORIZATION      │
                         │      ENGINE          │
                         └──────────┬───────────┘
                                    │
                   ┌────────────────┼────────────────┐
                   │                │                │
                   ▼                ▼                ▼
                 RBAC             ReBAC            ABAC
              "qué rol"       "qué relación"   "qué condición"
                   │                │                │
                   └────────────────┼────────────────┘
                                    ▼
                         ┌──────────────────────┐
                         │    ENTITLEMENTS      │
                         │      DEL PLAN        │
                         └──────────┬───────────┘
                                    │
                                    ▼
                              ALLOW / DENY
```

Esto además encaja muy bien con la naturaleza de NovaStore.

---

# 1. Primero: separar Authentication, Authorization y Entitlements

Este es probablemente el cambio conceptual más importante.

### Authentication

Responde:

> **¿Quién eres?**

Ejemplo:

```text
user_id = usr_123
```

---

### Authorization

Responde:

> **¿Puedes hacer X sobre Y?**

Ejemplo:

```text
¿Puede usr_123 editar workspace_456?
```

---

### Entitlement

Responde:

> **¿Tu tenant tiene contratada esta capacidad?**

Ejemplo:

```text
¿El tenant_789 tiene habilitado advanced_reports?
```

Son cosas diferentes.

AWS recomienda precisamente tratar el contexto del tenant como una pieza fundamental de la arquitectura de identidad y autorización, pudiendo incluir atributos como tier, región y entitlements. ([Amazon Web Services, Inc.][2])

---

# 2. El Tenant debe ser la frontera de seguridad

Esto para mí debería ser **sagrado en NovaStore**.

Todo recurso perteneciente a un cliente debe tener una relación inequívoca con:

```text
tenant_id
```

Por ejemplo:

```text
Tenant
 ├── Users
 ├── Workspaces
 │    ├── Teams
 │    ├── Projects
 │    └── Resources
 ├── Subscriptions
 ├── Entitlements
 └── Billing
```

Nunca deberíamos tener una autorización del estilo:

```text
user → workspace → allow
```

sin comprobar:

```text
user → tenant → workspace
```

AWS insiste en que **autenticación/autorización no equivalen por sí solas a aislamiento multi-tenant**. El aislamiento debe ser una propiedad estructural del sistema. ([Amazon Web Services, Inc.][3])

---

# 3. Los roles Owner/Admin/Analyst/Viewer sí son RBAC

Aquí sí usaría RBAC puro.

Por ejemplo:

### Tenant roles

```text
OWNER
ADMIN
MEMBER
```

Pero ojo: **yo no metería necesariamente `analyst` y `viewer` aquí** si esos roles representan capacidades específicas dentro de una aplicación o workspace.

Porque ahí empiezan los problemas.

---

# 4. Workspace roles deberían ser independientes

Tu workspace podría tener:

```text
OWNER
ADMIN
ANALYST
VIEWER
```

Pero esos roles pertenecen al **workspace**, no al usuario globalmente.

La relación debería ser:

```text
user
   │
   └── membership
          │
          ├── tenant_id
          ├── workspace_id
          └── role
```

Por ejemplo:

```text
user_1
 ├── Tenant A
 │    ├── Workspace X → OWNER
 │    └── Workspace Y → VIEWER
 │
 └── Tenant B
      └── Workspace Z → ADMIN
```

Esto es importantísimo.

El mismo usuario puede tener **roles diferentes dependiendo del contexto**.

Auth0, por ejemplo, diferencia explícitamente los roles asignados dentro de una organización de los roles globales. ([Auth0 Support][4])

---

# 5. Y aquí entra ReBAC

Tu concepto de:

> Workspace → Team → usuario

ya no es solamente RBAC.

Es una **relación**.

Por ejemplo:

```text
User
  │
  │ member_of
  ▼
Team
  │
  │ belongs_to
  ▼
Workspace
  │
  │ belongs_to
  ▼
Tenant
```

Entonces puedes expresar:

```text
user CAN_VIEW workspace
IF
user is member of workspace
```

o:

```text
user CAN_EDIT document
IF
user belongs to team
AND
team has editor relationship with document
```

Este tipo de modelo es precisamente lo que popularizó Zanzibar de Google y lo que hoy se denomina ReBAC/FGA. Zanzibar fue diseñado para expresar relaciones complejas de autorización a escala masiva. ([Google Research][5])

Y OpenFGA tiene actualmente documentación específica para **SaaS multi-tenant**, modelando `organization → workspace → resource` mediante relaciones. ([OpenFGA][6])

---

# 6. Por eso tus Teams NO deberían convertirse en roles

Este sería un error que evitaría.

No hagas:

```text
Team Leader
Team Analyst
Team Viewer
```

como si fueran roles globales.

Haz:

```text
Team
 ├── user_1 → LEADER
 ├── user_2 → ANALYST
 └── user_3 → VIEWER
```

La diferencia parece pequeña, pero arquitectónicamente es enorme.

El rol tiene significado **dentro de la relación con el Team**.

Así:

```text
user_1 ──leader──> Team A
user_1 ──viewer──> Team B
```

Perfectamente válido.

---

# 7. Y tus 3 aplicaciones deberían tener su propio espacio de permisos

Aquí es donde creo que probablemente tu diseño actual puede estar complicándose.

Supongamos:

```text
NovaStore
│
├── App A
├── App B
└── App C
```

No crearía:

```text
OWNER_APP_A
ADMIN_APP_A
ANALYST_APP_A
VIEWER_APP_A

OWNER_APP_B
ADMIN_APP_B
...
```

Eso escala fatal.

En lugar de eso:

```text
Permission
```

es una entidad independiente.

Por ejemplo:

```text
workspace.read
workspace.update
workspace.delete

team.read
team.create
team.update
team.delete

reports.read
reports.export

billing.read
billing.manage

users.invite
users.remove
```

Y los roles simplemente agrupan permisos.

---

# 8. Los permisos deben ser acciones sobre recursos

Yo utilizaría una nomenclatura:

```text
<resource>.<action>
```

Ejemplo:

```text
workspace.read
workspace.update
workspace.delete

team.read
team.create
team.update
team.delete

member.read
member.invite
member.update
member.remove

report.read
report.create
report.update
report.delete
report.export
```

Y si las apps tienen recursos específicos:

```text
analytics.dashboard.read
analytics.report.read
analytics.report.export

inventory.product.read
inventory.product.create
inventory.product.update

billing.subscription.read
billing.subscription.manage
```

Esto te permite crecer sin crear roles absurdos.

---

# 9. Los roles deberían ser bundles de permisos

Por ejemplo:

```text
workspace_viewer
```

podría tener:

```text
workspace.read
team.read
report.read
```

Mientras:

```text
workspace_analyst
```

tendría:

```text
workspace.read
team.read
report.read
report.create
report.export
```

Y:

```text
workspace_admin
```

tendría:

```text
workspace.read
workspace.update
workspace.delete

team.read
team.create
team.update
team.delete

member.read
member.invite
member.remove
```

Esto sigue el modelo RBAC clásico: **usuarios → roles → permisos**, en lugar de asignar permisos directamente a usuarios. NIST lo considera la estructura fundamental de RBAC. ([NIST CSRC][7])

---

# 10. Ahora viene la parte que probablemente está causando tu problema: los planes comerciales

Aquí **NO usaría roles**.

Supongamos:

```text
FREE
PRO
BUSINESS
ENTERPRISE
```

No hagas:

```text
PRO_ADMIN
PRO_ANALYST
BUSINESS_ADMIN
BUSINESS_ANALYST
ENTERPRISE_ADMIN
...
```

💀 Eso es role explosion.

En cambio:

```text
Subscription
      │
      ▼
Entitlements
```

Por ejemplo:

```text
PRO
 ├── reports.advanced
 ├── exports.csv
 ├── teams
 ├── max_workspaces = 10
 └── max_members = 50
```

Mientras:

```text
FREE
 ├── reports.basic
 ├── teams
 ├── max_workspaces = 1
 └── max_members = 5
```

El **plan no dice quién puede utilizar algo**.

Dice:

> **qué capacidades compró el tenant.**

---

# 11. La decisión final sería una intersección

Esta es la fórmula que te recomiendo para NovaStore:

```text
ACCESS =
    Tenant Membership
    AND Role Permission
    AND Resource Relationship
    AND Commercial Entitlement
    AND Contextual Policies
```

O conceptualmente:

```text
                    ┌───────────────┐
                    │ Tenant Access │
                    └───────┬───────┘
                            │
                            AND
                            ▼
                    ┌───────────────┐
                    │ Role Permission│
                    └───────┬───────┘
                            │
                            AND
                            ▼
                    ┌───────────────┐
                    │ Relationship  │
                    └───────┬───────┘
                            │
                            AND
                            ▼
                    ┌───────────────┐
                    │ Entitlement   │
                    └───────┬───────┘
                            │
                            AND
                            ▼
                    ┌───────────────┐
                    │ Policy/Context│
                    └───────┬───────┘
                            │
                            ▼
                         ALLOW
```

---

# 12. Ejemplo real de NovaStore

Supongamos:

```text
Tenant: Acme

Plan: Business

User: Carlos

Workspace: Finance

Team: Accounting
```

Carlos tiene:

```text
Tenant membership:
ADMIN

Workspace membership:
ANALYST

Team membership:
LEADER
```

Y Business tiene:

```text
advanced_reports = true
report_export = true
teams = true
```

Entonces:

### ¿Puede Carlos ver un reporte?

```text
Tenant membership       ✓
Workspace role           ✓
Permission report.read   ✓
Entitlement              ✓

→ ALLOW
```

### ¿Puede eliminar el workspace?

```text
Tenant membership       ✓
Workspace role           ANALYST
workspace.delete        ✗

→ DENY
```

### ¿Puede exportar un reporte avanzado?

```text
Workspace role           ✓
report.export            ✓
Business entitlement     ✓

→ ALLOW
```

Ahora imagina que cambia a:

```text
FREE
```

aunque Carlos continúe siendo `ANALYST`:

```text
report.export            ✓
Business entitlement     ✗

→ DENY
```

Eso es exactamente lo que quieres.

---

# 13. Pero cuidado: "DENY" no siempre significa lo mismo

Esto es muy importante para UX.

Hay una diferencia entre:

```text
403 Forbidden
```

porque:

> Carlos no tiene permiso.

y:

```text
403 / feature unavailable
```

porque:

> El tenant no tiene contratado ese feature.

Yo distinguiría internamente:

```text
AUTHORIZATION_DENIED
```

vs.

```text
ENTITLEMENT_DENIED
```

Así el frontend puede decir:

> No tienes permisos para realizar esta acción.

versus:

> Esta función está disponible en el plan Business.

Mucho más limpio.

---

# 14. La arquitectura que yo usaría

Para NovaStore:

```text
                    ┌──────────────────┐
                    │    Identity      │
                    │      User        │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Tenant Membership│
                    │                  │
                    │ owner/admin/...   │
                    └────────┬─────────┘
                             │
             ┌───────────────┼─────────────────┐
             ▼               ▼                 ▼
        Workspace          Team              Apps
        Membership       Membership        Permissions
             │               │                 │
             └───────────────┼─────────────────┘
                             ▼
                   ┌───────────────────┐
                   │ Authorization     │
                   │ Engine            │
                   └─────────┬─────────┘
                             │
                  ┌──────────┼───────────┐
                  ▼          ▼           ▼
                RBAC       ReBAC       ABAC
                  │          │           │
                  └──────────┼───────────┘
                             ▼
                   ┌───────────────────┐
                   │   Entitlements    │
                   │   / Plan         │
                   └─────────┬─────────┘
                             ▼
                         DECISION
```

---

# 15. A nivel de base de datos

Yo evitaría una tabla gigante tipo:

```text
user_permissions
```

y separaría claramente los conceptos.

Algo aproximadamente así:

```text
users
tenants
tenant_memberships

roles
permissions
role_permissions

workspace
workspace_memberships

teams
team_memberships

resources
resource_relationships

plans
plan_entitlements

subscriptions
tenant_entitlements

authorization_policies
```

Y las relaciones serían algo como:

```text
users
   │
   ▼
tenant_memberships
   │
   ├── tenant_id
   └── role_id
```

```text
users
   │
   ▼
workspace_memberships
   │
   ├── workspace_id
   └── role_id
```

```text
users
   │
   ▼
team_memberships
   │
   ├── team_id
   └── role_id
```

---

# 16. Y hay algo todavía más importante: roles con scope

Yo introduciría explícitamente el concepto:

```text
role_scope
```

Por ejemplo:

```text
OWNER
scope = TENANT
```

```text
ADMIN
scope = TENANT
```

```text
ANALYST
scope = WORKSPACE
```

```text
LEADER
scope = TEAM
```

Esto evita mezclar:

```text
tenant role
workspace role
team role
```

aunque todos técnicamente sean "roles".

Quedaría:

```text
Role
 ├── name
 ├── scope
 └── permissions
```

---

# 17. Incluso puedes permitir herencia

Por ejemplo:

```text
TENANT_OWNER
      │
      ▼
TENANT_ADMIN
      │
      ▼
WORKSPACE_ADMIN
      │
      ▼
WORKSPACE_ANALYST
      │
      ▼
WORKSPACE_VIEWER
```

Pero **no abusaría de la jerarquía**.

NIST contempla jerarquías de roles y separación de funciones como parte del RBAC formal, pero en SaaS modernos la combinación de jerarquías, scopes y excepciones puede convertirse rápidamente en una pesadilla. ([NIST CSRC][7])

Mi preferencia para NovaStore sería:

```text
roles independientes
+
permisos explícitos
+
scope
+
relaciones
```

antes que una mega-jerarquía.

---

# 18. ¿Necesitas implementar OpenFGA/Cedar/OPA?

**No necesariamente ahora.**

Y aquí quiero ser pragmático.

No metería un motor externo solamente porque "Zanzibar está cool". 😄

OpenFGA es extremadamente interesante para este caso: específicamente documenta SaaS multi-tenant, workspaces, roles definidos por tenants y relaciones jerárquicas. ([OpenFGA][6])

Pero NovaStore podría comenzar con un **Authorization Domain propio**, con una interfaz:

```ts
authorize({
  subject,
  action,
  resource,
  context
})
```

Por ejemplo:

```ts
authorize({
  subject: user,
  action: "report.export",
  resource: report,
  context: {
    tenant,
    workspace
  }
})
```

Y devolver:

```ts
{
  allowed: true,
  reason: "ROLE_PERMISSION"
}
```

o:

```ts
{
  allowed: false,
  reason: "ENTITLEMENT_REQUIRED",
  entitlement: "reports.export"
}
```

Esto te permite evolucionar posteriormente hacia OpenFGA, Cedar, OPA o un servicio propio **sin tener que reescribir toda NovaStore**.

AWS actualmente contempla precisamente arquitecturas con un **PDP (Policy Decision Point)** y PEPs distribuidos por la aplicación para este tipo de autorización. ([AWS Documentation][8])

---

# 19. Mi recomendación concreta para NovaStore

Yo establecería estas cinco capas:

| Capa       | Modelo              | Ejemplo                   |
| ---------- | ------------------- | ------------------------- |
| Identity   | Authentication      | `user_123`                |
| Tenant     | RBAC                | `OWNER`, `ADMIN`          |
| Workspace  | RBAC + ReBAC        | `ANALYST`, `VIEWER`       |
| Team       | ReBAC + scoped RBAC | `LEADER`, `ANALYST`       |
| Commercial | Entitlements/ABAC   | `advanced_reports = true` |

Y una sexta capa transversal:

```text
Resource-level authorization
```

para cuando NovaStore crezca.

---

# 20. La regla de oro

Yo documentaría esta regla como principio arquitectónico de NovaStore:

> **Roles determine responsibility. Relationships determine reach. Entitlements determine availability. Policies determine conditions.**

En español:

> **Los roles determinan qué responsabilidad tiene el usuario; las relaciones determinan a qué recursos puede llegar; los entitlements determinan qué capacidades tiene contratadas el tenant; y las políticas determinan bajo qué condiciones puede utilizarlas.**

Eso es muchísimo más sólido que:

```text
role → permissions
```

a secas.

---

## Y hay una última cosa que considero crítica

**No confíes solamente en el RBAC para aislar tenants.**

Aunque tengas:

```text
user → tenant membership → permission
```

la base de datos también debe impedir accidentalmente algo como:

```sql
SELECT *
FROM workspaces
WHERE id = :workspace_id;
```

sin comprobar el tenant.

AWS recomienda explícitamente que el aislamiento no quede únicamente en manos de los desarrolladores que implementan cada endpoint. ([Amazon Web Services, Inc.][3])

Para NovaStore, si están usando PostgreSQL/Supabase, esto abre una posibilidad especialmente buena: **Authorization Layer + PostgreSQL RLS como segunda barrera de aislamiento**. Ahí sí podemos construir algo bastante blindado.

---

### Mi conclusión

**No reemplazaría tu RBAC. Lo rediseñaría.**

La arquitectura objetivo sería:

```text
                  NOVASTORE AUTHORIZATION
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
        RBAC             ReBAC            ABAC
     "quién eres"    "con qué estás    "bajo qué
                       relacionado"     condiciones"
          │                │                │
          └────────────────┼────────────────┘
                           │
                           ▼
                    ENTITLEMENTS
                    "qué compraste"
                           │
                           ▼
                     AUTHZ ENGINE
                           │
                           ▼
                    PostgreSQL RLS
                           │
                           ▼
                     DATA ACCESS
```

Y **Stripe debería ser la fuente comercial de verdad para subscription/billing**, mientras NovaStore mantiene una proyección local de los **entitlements efectivos** que necesita el authorization engine. No convertiría Stripe en el motor de autorización de usuarios.

Esto te da algo que puede crecer desde tus actuales **3 apps** hasta decenas de aplicaciones, workspaces, teams, recursos y planes sin acabar con 200 roles diferentes.

Si quieres llevar esto al siguiente nivel, el paso que yo haría ahora es **diseñar el modelo completo de datos de NovaStore**: tablas `roles`, `permissions`, `tenant_memberships`, `workspace_memberships`, `team_memberships`, `entitlements`, `subscriptions`, etc., incluyendo las relaciones, constraints, índices, RLS de Supabase/PostgreSQL y el algoritmo exacto de `authorize()` para que podamos compararlo contra tu RBAC actual y reemplazarlo sin romper las 3 apps.

[1]: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html?utm_source=chatgpt.com "Authorization - OWASP Cheat Sheet Series"
[2]: https://aws.amazon.com/isv/resources/building-blocks-of-multi-tenant/?utm_source=chatgpt.com "Multi-tenant SaaS architecture: 4 building blocks that help ISVs close enterprise deals - AWS"
[3]: https://aws.amazon.com/blogs/apn/explore-saas-tenant-isolation-strategies-in-new-saas-whitepaper/?utm_source=chatgpt.com "Explore SaaS Tenant Isolation Strategies in New SaaS Whitepaper | AWS Partner Network (APN) Blog"
[4]: https://support.auth0.com/center/s/article/How-to-enable-RBAC-for-use-roles-in-organizations?utm_source=chatgpt.com "Auth0 Support Center - Enable Role-Based Access Control for User Roles in Organizations"
[5]: https://research.google/pubs/zanzibar-googles-consistent-global-authorization-system/?utm_source=chatgpt.com "Zanzibar: Google’s Consistent, Global Authorization System"
[6]: https://openfga.dev/docs/use-cases/multi-tenant-saas?utm_source=chatgpt.com "Multi-Tenant SaaS Authorization with OpenFGA | OpenFGA"
[7]: https://csrc.nist.gov/Projects/role-based-access-control/faqs?utm_source=chatgpt.com "Role Based Access Control | CSRC"
[8]: https://docs.aws.amazon.com/prescriptive-guidance/latest/saas-multitenant-api-access-authorization/design-models.html?utm_source=chatgpt.com "Design models for multi-tenant SaaS architectures - AWS Prescriptive Guidance"
