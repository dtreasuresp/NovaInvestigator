\# NOVAI — CONVERSATION STATE ARCHITECTURE V2

\## Migración a Supabase como Single Source of Truth para conversaciones y mensajes



ACTÚA COMO:



Staff / Principal Software Engineer especializado en:



\- SaaS B2B multi-tenant

\- ERP / Business Applications

\- AI Agent Harnesses

\- Vercel AI SDK

\- TypeScript

\- Next.js App Router

\- Supabase / PostgreSQL

\- RLS / RBAC / ReBAC

\- Streaming

\- AI UX

\- Agent State Management

\- Distributed Systems

\- Event-driven architecture

\- Observability

\- Data consistency

\- Frontend state management



TRABAJAS SOBRE EL REPOSITORIO EXISTENTE:



NovaInvestigator



RAMA OBJETIVO:



dev



IMPORTANTE:



NO hagas una reescritura.



NO sustituyas arquitectura existente porque prefieras otra.



NO inventes tablas, endpoints, hooks, APIs o servicios antes de inspeccionar el código.



NO elimines funcionalidades existentes sin justificarlo.



NO rompas el Agent Harness existente.



NO rompas las tools existentes.



NO rompas el streaming.



NO rompas la UI actual.



NO introduzcas una segunda arquitectura paralela.



El objetivo de esta tarea es corregir específicamente la arquitectura de estado y persistencia de conversaciones de NovAi y del chat de IA.



============================================================

1\. OBJETIVO PRINCIPAL

============================================================



Actualmente NovaInvestigator ya posee infraestructura real para persistir conversaciones:



\- novai\_conversations

\- novai\_messages

\- NovaiConversationsRepository

\- appendMessage()

\- getConversationWithMessages()

\- APIs de conversaciones

\- API de chat

\- RLS / tenant scoping

\- persistencia de mensajes de usuario

\- persistencia de mensajes del asistente



También existe UI que consume:



GET /api/novai/conversations



y:



GET /api/novai/conversations/\[id]



Sin embargo, la arquitectura actual mantiene simultáneamente:



1\. Supabase como persistencia

2\. React state

3\. localStorage

4\. historial enviado por el cliente al Agent



Esto genera múltiples fuentes de verdad.



OBJETIVO:



Convertir Supabase/PostgreSQL en la FUENTE CANÓNICA DE VERDAD para:



\- conversaciones

\- mensajes

\- orden de mensajes

\- identidad de conversación

\- historial persistido



React state debe ser solamente estado de presentación/cache.



localStorage NO debe ser la fuente de verdad.



El Agent Runtime tampoco debe depender del historial proporcionado arbitrariamente por el navegador.



============================================================

2\. PRINCIPIO ARQUITECTÓNICO

============================================================



La arquitectura final debe ser:



SUPABASE

&#x20;   ↓

Conversation Repository

&#x20;   ↓

Conversation Service / API

&#x20;   ↓

UI state cache

&#x20;   ↓

NovAi Agent Runtime



Y para inferencia:



User Message

&#x20;   ↓

conversationId

&#x20;   ↓

authenticate principal

&#x20;   ↓

authorize conversation

&#x20;   ↓

load canonical conversation

&#x20;   ↓

load canonical messages

&#x20;   ↓

append current user message

&#x20;   ↓

build Agent Context

&#x20;   ↓

Agent Runtime

&#x20;   ↓

stream events

&#x20;   ↓

persist assistant response

&#x20;   ↓

return normalized stream

&#x20;   ↓

UI reconciliation



NO hacer:



UI state

&#x20;   ↓

messages\[]

&#x20;   ↓

Agent



como fuente primaria del historial.



La UI puede enviar el mensaje actual.



La UI NO debe ser la autoridad sobre el historial anterior.



============================================================

3\. PRIMERA REGLA: INSPECCIÓN OBLIGATORIA

============================================================



Antes de modificar código inspecciona completamente la implementación actual en la rama dev.



Debes revisar como mínimo:



src/features/novai/



y específicamente:



\- conversations repository

\- conversation APIs

\- /api/novai/chat

\- NovAiView

\- componentes de chat

\- hooks de chat

\- useChat si existe

\- estados de messages

\- estados de threads

\- conversationId

\- localStorage

\- sessionStorage

\- BroadcastChannel

\- streaming

\- Agent Runtime

\- context builder

\- memory engine

\- persistence

\- tool events



Buscar explícitamente:



\- novai\_conversations

\- novai\_messages

\- NovaiConversationsRepository

\- appendMessage

\- getConversationWithMessages

\- /api/novai/conversations

\- /api/novai/chat

\- conversationId

\- messages

\- localStorage

\- STORAGE\_KEY

\- generateId

\- useChat

\- setMessages

\- saveThreads

\- fetchMessagesForThread



También inspecciona cualquier implementación equivalente para el "chat de IA" que no sea NovAi.



IMPORTANTE:



Determina si NovAi y el AI Chat:



A. comparten infraestructura



B. tienen infraestructura separada



C. tienen dos sistemas de persistencia distintos



D. usan diferentes tablas



E. usan diferentes endpoints



NO asumas que son el mismo sistema.



============================================================

4\. GENERAR MATRIZ ANTES DE MODIFICAR

============================================================



Antes de modificar archivos genera internamente esta matriz:



| Componente | Existe | Correcto | Parcial | Duplicado | Problema |

|------------|--------|----------|---------|-----------|----------|



Evaluar:



\- DB schema

\- repository

\- API

\- UI

\- conversation creation

\- message loading

\- message persistence

\- message ordering

\- Agent context

\- streaming

\- localStorage

\- optimistic UI

\- reconciliation

\- multi-tab

\- error handling

\- tenant isolation

\- authorization



NO implementes nada hasta comprender este flujo.



============================================================

5\. SINGLE SOURCE OF TRUTH

============================================================



Implementar la siguiente regla:



Supabase = canonical source of truth.



React state = presentation state / cache.



localStorage = NO canonical persistence.



El navegador no debe poder definir:



\- tenant

\- user

\- conversation ownership

\- historical messages



El backend debe determinar:



\- principal

\- userId

\- tenantId

\- workspaceId

\- conversation ownership

\- permissions



============================================================

6\. CONVERSATION ID

============================================================



Toda conversación persistente debe tener un conversationId real generado por backend/DB.



NO utilizar IDs generados por el cliente como identidad definitiva.



Actualmente existe un flujo equivalente a:



tempId = generateId()



crear thread local



POST /api/novai/conversations



reemplazar tempId por realId



Esto debe revisarse.



Preferir:



POST /api/novai/conversations

&#x20;       ↓

backend crea conversación

&#x20;       ↓

return canonical conversation

&#x20;       ↓

UI adopta canonical ID



Si la creación falla:



NO crear una conversación falsa persistente en UI.



Mostrar estado de error/retry.



No permitir enviar mensajes a una conversación inexistente.



============================================================

7\. LOCAL STORAGE

============================================================



Existe actualmente una clave equivalente a:



novastore:novai\_threads\_v2



y lógica de:



saveThreads()



que mantiene threads en localStorage.



NO eliminar esto inmediatamente si puede contener conversaciones antiguas todavía no migradas.



Primero inspecciona:



\- qué datos guarda

\- si existen usuarios reales con threads locales

\- si contienen messages

\- si contienen conversation IDs reales

\- si existen conversaciones que nunca llegaron a Supabase



Diseña una estrategia segura.



Objetivo final:



localStorage NO debe ser utilizado como almacenamiento principal de conversaciones.



Si se conserva temporalmente:



debe utilizarse solamente como:



\- cache

\- recovery metadata

\- UI preferences



Nunca como autoridad.



Si existen conversaciones locales legacy:



crear una estrategia de migración o recuperación explícita.



NO borrar silenciosamente datos del usuario.



============================================================

8\. CARGA DEL HISTORIAL

============================================================



Al abrir NovAi:



GET /api/novai/conversations



debe recuperar las conversaciones accesibles al usuario.



Al seleccionar:



GET /api/novai/conversations/:conversationId



debe devolver:



\- conversation metadata

\- messages

\- ordering

\- relevant state



La UI debe reemplazar el estado local con el estado canónico recibido.



No mezclar silenciosamente:



local messages



con



DB messages



sin reconciliación.



============================================================

9\. STALE STATE

============================================================



Actualmente existe lógica equivalente a:



si selected.messages.length === 0



entonces cargar desde API.



Esto es insuficiente.



Una conversación puede tener:



messages.length > 0



pero estar desactualizada.



Implementar una estrategia de freshness/reconciliation.



Opciones válidas según arquitectura existente:



\- refetch al seleccionar conversación

\- updatedAt/version

\- revision number

\- message sequence

\- ETag

\- cache invalidation

\- explicit refresh

\- event synchronization



No implementar polling permanente si no es necesario.



Preferir mecanismos deterministas.



============================================================

10\. MESSAGE ORDERING

============================================================



La conversación debe mantener orden determinista.



Cada mensaje debe tener una forma estable de ordenamiento.



Preferir:



created\_at



y si existe una secuencia:



message sequence / ordinal



Utilizar el mecanismo ya existente en DB si está disponible.



NO confiar únicamente en el orden del array enviado por el navegador.



Debe evitarse:



duplicate messages



messages out of order



assistant before user



duplicated assistant messages



============================================================

11\. ENVÍO DE MENSAJE

============================================================



El flujo correcto debe ser:



User

&#x20;↓

UI

&#x20;↓

conversationId

&#x20;↓

POST /api/novai/chat

&#x20;↓

backend authenticates

&#x20;↓

backend authorizes conversation

&#x20;↓

backend loads canonical history

&#x20;↓

backend appends user message

&#x20;↓

Agent Runtime

&#x20;↓

stream

&#x20;↓

persist assistant message

&#x20;↓

complete

&#x20;↓

UI reconciliation



La UI NO debe enviar toda la conversación como autoridad.



Preferir conceptualmente:



{

&#x20; conversationId,

&#x20; message,

&#x20; context

}



en lugar de:



{

&#x20; conversationId,

&#x20; messages: entireClientHistory

}



Sin embargo:



NO cambies el contrato automáticamente.



Primero inspecciona:



\- consumidores

\- types

\- API route

\- Agent Runtime

\- tests

\- streaming protocol



Si el contrato actual debe mantenerse temporalmente por compatibilidad:



acepta messages como input legacy,



pero el backend debe ignorar el historial no confiable y reconstruir el historial canónico desde DB.



============================================================

12\. CURRENT MESSAGE

============================================================



El cliente puede proporcionar:



current user message



pero el backend debe validar:



\- role

\- content

\- size

\- conversation ownership

\- permissions



NO confiar en:



\- tenantId

\- userId

\- message history

\- conversation owner



proporcionados por cliente.



============================================================

13\. AGENT RUNTIME

============================================================



El Agent Runtime debe recibir:



Canonical Conversation

\+

Canonical Message History

\+

Current Message

\+

Principal

\+

Tenant Context

\+

Workspace Context

\+

Investigation Context

\+

Memory

\+

Methodology Knowledge

\+

Relevant Evidence



Conceptualmente:



NovaiContext

├── principal

├── tenant

├── workspace

├── conversation

│   ├── id

│   └── messages

├── investigation

├── evidence

├── methodology

├── memory

└── currentMessage



NO hacer que Agent Runtime dependa directamente de React state.



============================================================

14\. CONTEXT BUILDER

============================================================



Inspecciona context-builder.ts y context-engine.ts.



Determina cómo se incorpora actualmente:



\- conversation history

\- investigation

\- memory

\- methodology

\- evidence



Si existe una abstracción reutilizable:



REUTILIZARLA.



NO crear otro ConversationContext paralelo.



El historial persistido debe entrar al Context Engine desde backend.



============================================================

15\. MEMORY VS CONVERSATION

============================================================



NO mezclar:



Conversation History



con:



Long-Term Memory.



Conversation History:



\- mensajes

\- conversación

\- secuencia

\- contexto inmediato



Memory:



\- preferencias

\- hechos persistentes

\- conocimiento relevante

\- memoria semántica



No convertir automáticamente todos los mensajes en memoria.



============================================================

16\. STREAMING

============================================================



NO romper el streaming actual.



El flujo debe continuar siendo incremental.



Idealmente:



user message persisted

&#x20;       ↓

agent starts

&#x20;       ↓

tool-call

&#x20;       ↓

tool-result

&#x20;       ↓

evidence

&#x20;       ↓

audit

&#x20;       ↓

text-delta

&#x20;       ↓

complete

&#x20;       ↓

assistant message persisted



La persistencia del assistant debe ocurrir cuando exista una respuesta final válida.



Si el stream falla:



NO persistir una respuesta assistant incompleta como mensaje normal.



Si existe mecanismo de aborted/error message:



reutilizarlo.



============================================================

17\. DUPLICACIÓN DE MENSAJES

============================================================



Debes prevenir:



double submit



retry duplicate



stream retry duplicate



assistant duplicate



user duplicate



Implementar idempotencia donde sea apropiado.



Investiga si el schema ya posee:



\- id

\- message\_id

\- client\_message\_id

\- request\_id

\- agent\_run\_id



Si existe:



REUTILIZAR.



Si no existe y realmente es necesario:



proponer el cambio de schema antes de implementarlo.



NO agregar columnas arbitrarias sin justificar.



============================================================

18\. IDEMPOTENCY

============================================================



Cada ejecución de chat debe tener una identidad estable.



Evaluar:



requestId



agentRunId



messageId



idempotencyKey



No debe ser posible que un retry genere dos assistant messages idénticos.



Read operations:



deben ser retry-safe.



Write operations:



deben ser idempotent cuando sea necesario.



============================================================

19\. CONCURRENCIA

============================================================



Considerar:



\- dos tabs

\- dos ventanas

\- doble click

\- retry

\- refresh durante streaming

\- navegación mientras responde

\- conversación abierta en dos dispositivos



Evitar race conditions.



Ejemplo:



Tab A:

message A



Tab B:

message B



No permitir que una respuesta antigua sobrescriba una conversación más reciente.



============================================================

20\. MULTI-TAB

============================================================



Inspecciona el uso existente de:



BroadcastChannel



Actualmente puede existir para cuotas.



NO crear otro mecanismo si ya existe una abstracción adecuada.



Si no existe sincronización de conversaciones:



considerar eventos:



conversation-created



conversation-updated



message-added



conversation-deleted



message-updated



Pero:



NO implementar realtime complejo si no es necesario.



Si Supabase Realtime ya está disponible y la arquitectura lo permite:



evaluarlo.



Si no:



BroadcastChannel + refetch selectivo puede ser suficiente para multi-tab.



============================================================

21\. SUPABASE REALTIME

============================================================



NO activar Supabase Realtime simplemente porque existe.



Primero evaluar:



\- volumen

\- seguridad

\- RLS

\- necesidad real

\- complejidad



Para una primera implementación puede ser suficiente:



mutation

&#x20;↓

invalidate cache

&#x20;↓

refetch



La consistencia es prioritaria.



============================================================

22\. UI STATE

============================================================



La UI puede mantener:



\- selectedConversationId

\- messages

\- loading

\- streaming

\- errors

\- optimistic state



Pero debe tratar estos datos como estado de presentación.



Debe existir una forma clara de reconciliar:



optimistic UI



con



canonical DB state.



============================================================

23\. OPTIMISTIC UI

============================================================



Optimistic UI está permitida.



Ejemplo:



usuario escribe



↓

UI muestra mensaje inmediatamente



↓

backend persiste



↓

assistant stream



Pero el mensaje optimista debe tener identidad temporal estable.



Después:



temporary message

&#x20;      ↓

canonical message

&#x20;      ↓

replace



NO duplicar:



temporary user message



\+



persisted user message.



============================================================

24\. ASSISTANT STREAMING

============================================================



Durante streaming:



UI puede mostrar assistant provisional.



NO tratarlo como mensaje persistido definitivo.



Al terminar:



assistant provisional

&#x20;      ↓

canonical assistant message

&#x20;      ↓

replace/reconcile



Debe existir una sola representación final.



============================================================

25\. REFRESH / RELOAD

============================================================



Caso obligatorio:



Usuario conversa.



Refresh browser.



Debe aparecer exactamente:



\- conversación correcta

\- mensajes correctos

\- orden correcto

\- estado correcto



No depender de localStorage para recuperar el historial.



============================================================

26\. NEW TAB

============================================================



Abrir NovaInvestigator en otra pestaña.



Debe recuperar las mismas conversaciones desde BD.



No crear automáticamente conversaciones duplicadas.



============================================================

27\. LOGIN / LOGOUT

============================================================



Al cambiar usuario:



NO mostrar conversaciones del usuario anterior.



Al hacer logout:



limpiar estado local sensible.



Al login:



volver a cargar conversaciones desde backend.



NO confiar en localStorage para decidir qué conversaciones pertenecen al usuario.



============================================================

28\. TENANT ISOLATION

============================================================



CRÍTICO.



El cliente NO debe controlar:



tenantId.



Backend debe obtenerlo del principal autenticado.



Toda conversación debe comprobar:



user ownership / tenant scope / workspace scope



según las reglas actuales del sistema.



No permitir:



Tenant A

&#x20;   ↓

conversationId

&#x20;   ↓

Tenant B



Reutilizar:



RLS



RBAC



ReBAC



principal



repository authorization



existentes.



============================================================

29\. WORKSPACE SCOPE

============================================================



Determinar si las conversaciones pertenecen a:



\- tenant

\- workspace

\- user

\- combinación



NO inventar.



Inspeccionar schema y repository.



La autorización debe respetar el modelo actual.



============================================================

30\. API CONTRACT

============================================================



Auditar:



GET /api/novai/conversations



POST /api/novai/conversations



GET /api/novai/conversations/\[id]



PATCH



DELETE



POST /api/novai/chat



No romper consumidores existentes.



Si se modifica un contrato:



actualizar:



\- types

\- client

\- server

\- tests

\- documentación



============================================================

31\. ERROR HANDLING

============================================================



Si:



GET conversations falla



mostrar error recuperable.



Si:



GET conversation falla



no inventar mensajes.



Si:



POST conversation falla



no crear fake local conversation.



Si:



POST chat falla



mostrar error.



Si:



stream falla



preservar mensajes ya persistidos.



Nunca afirmar:



"mensaje guardado"



si la persistencia falló.



============================================================

32\. OFFLINE / NETWORK FAILURE

============================================================



No es obligatorio implementar offline-first.



Preferir consistencia sobre offline complexity.



Si se conserva localStorage:



NO usarlo para fingir que una conversación fue persistida.



Mostrar:



"Pendiente de sincronización"



solo si realmente existe una cola de sincronización implementada.



No implementar una cola offline incompleta.



============================================================

33\. CACHING

============================================================



Evaluar si existe:



React Query



SWR



Next cache



custom hooks



Si existe un sistema de cache:



REUTILIZAR.



No implementar otro sistema de cache.



Cache key conceptual:



conversations:{tenant/user/workspace}



conversation:{conversationId}



Debe invalidarse después de:



\- create

\- update

\- delete

\- message append



Nunca compartir cache entre tenants.



============================================================

34\. CONVERSATION LIST

============================================================



La lista de conversaciones debe mostrar datos canónicos.



Preferiblemente:



\- id

\- title

\- updatedAt

\- createdAt

\- message count si existe

\- status si existe



No derivar permanentemente la lista desde localStorage.



============================================================

35\. CONVERSATION TITLE

============================================================



Inspeccionar cómo se generan los títulos.



No cambiar la lógica sin necesidad.



Si el title se genera después del primer mensaje:



asegurar que UI y DB converjan.



============================================================

36\. CHAT DE IA GENERAL

============================================================



IMPORTANTE:



También debes inspeccionar el "chat de IA" existente fuera de NovAi.



Determinar:



\- qué componente lo renderiza

\- qué API usa

\- qué tabla usa

\- si persiste mensajes

\- si usa localStorage

\- si usa useChat

\- si tiene conversationId

\- si reutiliza infraestructura de NovAi



Si tiene infraestructura independiente:



NO fusionarla automáticamente.



Documentar la relación.



Si puede reutilizar Conversation Service sin romper su arquitectura:



proponer reutilización.



============================================================

37\. NO DUPLICATION

============================================================



Antes de crear:



\- ConversationService

\- useConversations

\- useConversation

\- persistence service

\- message persistence helper



buscar si ya existe algo equivalente.



Si existe:



reutilizar/refactorizar.



NO crear:



ConversationServiceV2



NovaiConversationManager2



ChatPersistenceV2



etc.



sin justificación técnica.



============================================================

38\. TESTS UNITARIOS

============================================================



Agregar/actualizar tests para:



1\. create conversation

2\. load conversation

3\. load messages

4\. append user message

5\. append assistant message

6\. ordering

7\. authorization

8\. tenant isolation

9\. workspace isolation

10\. duplicate prevention

11\. retry

12\. missing conversation

13\. stale UI

14\. optimistic reconciliation

15\. refresh

16\. streaming completion

17\. streaming failure



============================================================

39\. TESTS DE INTEGRACIÓN

============================================================



Escenarios obligatorios:



A.



Crear conversación.



Refresh.



La conversación sigue existiendo.



B.



Enviar mensaje.



Refresh.



El mensaje sigue existiendo.



C.



Enviar 2 mensajes.



Refresh.



Orden correcto.



D.



Abrir misma conversación en dos tabs.



Ambas deben poder sincronizarse.



E.



Intentar conversationId de otro tenant.



Debe fallar.



F.



Intentar conversationId inexistente.



Debe fallar.



G.



POST chat con historial manipulado.



Backend debe ignorar historial histórico no canónico.



H.



Retry del mismo request.



No debe duplicar mensajes.



============================================================

40\. TESTS DE AGENT

============================================================



Verificar:



Conversation:



User:

"Hola"



Assistant:

"Hola"



Refresh.



Después:



User:

"¿Qué te dije antes?"



NovAi debe poder recuperar el mensaje desde BD.



IMPORTANTE:



Esto debe funcionar incluso si:



\- React state está vacío

\- localStorage está vacío

\- browser fue refrescado



============================================================

41\. TEST DE HISTORIAL CANÓNICO

============================================================



Caso:



BD:



Message 1

Message 2

Message 3



Cliente maliciosamente envía:



Message 1

Message 2

Message FAKE



El Agent debe utilizar:



Message 1

Message 2

Message 3



y NO:



Message FAKE.



Esto demuestra que DB es la autoridad.



============================================================

42\. OBSERVABILITY

============================================================



Registrar:



requestId



conversationId



agentRunId



messageId



userId



tenantId



workspaceId



latency



persistence duration



stream duration



success/failure



NO registrar:



\- secrets

\- tokens

\- credentials

\- información sensible innecesaria



============================================================

43\. AGENT TRACE

============================================================



No romper la arquitectura de Agent Trace ya implementada.



Los eventos de:



\- tool-call

\- tool-result

\- evidence

\- audit

\- calculation

\- text

\- completion



deben seguir funcionando.



La persistencia de conversación es independiente del Agent Trace.



NO mezclar:



conversation messages



con:



internal agent trace events



salvo que el modelo actual ya defina una relación explícita.



============================================================

44\. TOOL CALLS

============================================================



No romper tools existentes.



El historial persistido debe estar disponible para el Agent cuando sea necesario.



Pero:



tool execution



NO debe depender de localStorage.



Tool authorization sigue pasando por Tool Gateway.



============================================================

45\. MEMORY

============================================================



No romper Memory Engine.



Conversation history:



persisted conversation messages.



Memory:



long-term memory.



Deben seguir siendo sistemas conceptualmente separados.



============================================================

46\. PERFORMANCE

============================================================



NO cargar toda la conversación si no es necesario.



Evaluar:



pagination



limit



recent messages



summary



context window



Pero:



NO implementar compresión/resumen de historial todavía si no existe.



Primero corregir consistencia.



Para conversaciones muy grandes:



proponer estrategia futura.



============================================================

47\. SEGURIDAD

============================================================



Nunca aceptar del cliente como autoridad:



tenantId



userId



workspaceId



conversation owner



historical messages



permissions



roles



El backend obtiene todo lo sensible del principal/autorización.



============================================================

48\. MIGRACIÓN DE LOCALSTORAGE

============================================================



Antes de eliminar:



novastore:novai\_threads\_v2



determinar:



\- si hay datos

\- estructura

\- compatibilidad

\- posibilidad de migración



Si existen threads locales con conversationId válido:



intentar reconciliarlos con BD.



Si no existen en BD:



no borrarlos automáticamente.



Definir estrategia segura.



Si el sistema no requiere migración porque esos datos son solamente cache:



documentarlo.



============================================================

49\. DOCUMENTACIÓN

============================================================



Crear o actualizar:



NOVAI\_CONVERSATION\_ARCHITECTURE.md



Debe explicar:



\- Single Source of Truth

\- conversation lifecycle

\- message lifecycle

\- UI state

\- optimistic UI

\- canonical persistence

\- Agent context

\- streaming

\- reconciliation

\- idempotency

\- multi-tab

\- security

\- tenant isolation

\- failure handling



Actualizar README/changelog si corresponde.



============================================================

50\. NO CAMBIAR INNECESARIAMENTE

============================================================



NO modificar:



\- methodology

\- evidence engine

\- tools

\- model router

\- provider adapters

\- RBAC



salvo que sea estrictamente necesario para la integración del historial.



============================================================

51\. IMPLEMENTACIÓN POR FASES

============================================================



PHASE 1 — AUDIT



No modificar código.



Entregar:



\- arquitectura actual

\- flujo UI → API → DB

\- flujo UI → Agent

\- puntos de desacoplamiento

\- localStorage

\- problemas

\- duplicaciones

\- riesgos



PHASE 2 — CANONICAL CONVERSATION SERVICE



Consolidar acceso a conversaciones.



Reutilizar repository existente.



Garantizar autorización.



PHASE 3 — CANONICAL CHAT INPUT



Hacer que backend pueda reconstruir historial desde DB.



Mantener compatibilidad si es necesario.



PHASE 4 — MESSAGE PERSISTENCE



Garantizar:



user message



assistant message



idempotency



ordering



failure handling



PHASE 5 — UI RECONCILIATION



Corregir:



\- local state

\- optimistic messages

\- canonical messages

\- stale state



PHASE 6 — REMOVE CANONICAL LOCALSTORAGE DEPENDENCY



Migrar/eliminar dependencia de localStorage como fuente de verdad.



PHASE 7 — MULTI-TAB



Implementar sincronización selectiva si realmente es necesaria.



PHASE 8 — TESTS



Unit



Integration



Agent



UI



Security



PHASE 9 — DOCUMENTATION



Actualizar arquitectura.



Después de cada fase:



\- TypeScript

\- lint

\- tests

\- build



No avanzar si se rompe la aplicación.



============================================================

52\. CRITERIOS DE ACEPTACIÓN

============================================================



La implementación se considera correcta cuando:



1\. Supabase es la fuente canónica de conversaciones.



2\. Supabase es la fuente canónica de mensajes.



3\. localStorage no es fuente de verdad.



4\. conversationId persistente proviene del backend/DB.



5\. UI puede cargar conversaciones después de refresh.



6\. UI puede cargar mensajes después de refresh.



7\. Agent puede recuperar historial persistido.



8\. Agent no depende del historial arbitrario enviado por cliente.



9\. Los mensajes mantienen orden determinista.



10\. No existen duplicados por retry.



11\. Streaming sigue funcionando.



12\. Assistant message se persiste correctamente.



13\. User message se persiste correctamente.



14\. Optimistic UI se reconcilia correctamente.



15\. Error de persistencia no se presenta como éxito.



16\. Conversación inexistente no puede recibir mensajes.



17\. Conversación de otro tenant no puede ser accedida.



18\. Workspace scope se respeta.



19\. RBAC/RLS siguen funcionando.



20\. Refresh no pierde historial.



21\. Dos tabs pueden mantenerse consistentes según estrategia implementada.



22\. NovAi sigue funcionando.



23\. Tools siguen funcionando.



24\. Agent Trace sigue funcionando.



25\. No se expone Chain of Thought.



26\. El chat de IA general no se rompe.



27\. No existen dos sistemas de persistencia innecesarios.



28\. No se duplicó lógica existente.



29\. Tests pasan.



30\. Build pasa.



============================================================

53\. FORMATO OBLIGATORIO DE REPORTE

============================================================



Después de PHASE 1:



\### Arquitectura actual



...



\### Fuente de verdad actual



...



\### Flujo actual de conversación



...



\### Flujo actual de mensajes



...



\### Flujo actual UI → Agent



...



\### Uso de localStorage



...



\### Problemas encontrados



...



\### Riesgos



...



\### Código existente reutilizable



...



\### Cambios recomendados



...



\### Plan de implementación



...



NO modificar código todavía.



Después de cada fase:



\### Implementado



\- ...



\### Reutilizado



\- ...



\### Refactorizado



\- ...



\### Nuevo



\- ...



\### Archivos modificados



\- ...



\### API changes



\- ...



\### Database changes



\- ...



\### Tests



\- ...



\### Seguridad



\- ...



\### Riesgos



\- ...



\### Próxima fase



\- ...



============================================================

54\. REGLA ESPECIAL SOBRE LA BD

============================================================



NO crear nuevas tablas de conversaciones.



NO crear nuevas tablas de mensajes.



NO crear un nuevo sistema de persistence.



Primero reutiliza:



novai\_conversations



novai\_messages



NovaiConversationsRepository



appendMessage()



getConversationWithMessages()



y las APIs existentes.



Solo modificar schema si la inspección demuestra que falta una capacidad realmente necesaria.



============================================================

55\. REGLA ESPECIAL SOBRE EL AGENT

============================================================



NovAi debe pensar conceptualmente:



"Esta conversación tiene ID X."



No:



"El navegador me dijo que estos son los mensajes."



La fuente debe ser:



conversationId

&#x20;   ↓

authorized backend lookup

&#x20;   ↓

canonical history

&#x20;   ↓

Agent Context



============================================================

56\. REGLA ESPECIAL SOBRE HISTORIAL MANIPULADO

============================================================



Nunca confiar ciegamente en:



messages\[]



recibidos desde el cliente.



El cliente es un actor no confiable.



El backend debe reconstruir el historial.



Esto es especialmente importante para:



\- auditoría

\- investigación

\- evidencia

\- metodología

\- memoria

\- trazabilidad



Un usuario no debe poder modificar retrospectivamente el historial que recibió el Agent simplemente modificando el request HTTP.



============================================================

57\. REGLA ESPECIAL SOBRE INVESTIGACIONES

============================================================



La conversación y la investigación activa son conceptos diferentes.



Conversation:



"qué hablamos"



Investigation:



"sobre qué investigación estamos trabajando"



No almacenar automáticamente investigación completa dentro de cada mensaje.



El Agent debe obtener:



conversation context



\+



active investigation context



\+



evidence



según corresponda.



============================================================

58\. REGLA FINAL

============================================================



NO hagas que NovAi "parezca" persistente.



Haz que realmente sea persistente.



NO hagas que la UI "parezca" sincronizada.



Haz que tenga una fuente canónica.



NO hagas que el Agent "parezca" recordar.



Haz que pueda recuperar el historial persistido.



NO confíes en memoria del navegador.



NO confíes en historial enviado por el cliente.



NO confíes en IDs temporales.



NO confíes en datos no autorizados.



La arquitectura final debe ser:



&#x20;                   SUPABASE

&#x20;                      │

&#x20;                      │ canonical

&#x20;                      ▼

&#x20;             Conversation Repository

&#x20;                      │

&#x20;                      ▼

&#x20;              Conversation Service

&#x20;                      │

&#x20;             ┌────────┴────────┐

&#x20;             ▼                 ▼

&#x20;            UI             Agent Runtime

&#x20;             │                 │

&#x20;        presentation       canonical

&#x20;            cache            context

&#x20;             │                 │

&#x20;             └────────┬────────┘

&#x20;                      ▼

&#x20;                 NovAi Harness



Y el flujo de chat:



USER

&#x20;↓

UI

&#x20;↓

conversationId + current message

&#x20;↓

API

&#x20;↓

authenticate

&#x20;↓

authorize

&#x20;↓

load canonical conversation

&#x20;↓

persist user message

&#x20;↓

build context

&#x20;↓

Agent

&#x20;↓

Tools / Evidence / Audit / Methodology

&#x20;↓

stream normalized events

&#x20;↓

persist assistant message

&#x20;↓

canonical response

&#x20;↓

UI reconciliation



La prioridad absoluta es:



CONSISTENCY

TRACEABILITY

SECURITY

PERSISTENCE

IDEMPOTENCY



antes que:



animations

visual effects

local caching

offline support



No inventes.



No dupliques.



No reescribas.



Inspecciona primero.



Implementa incrementalmente.



============================================================

FIN DEL PROMPT

============================================================

