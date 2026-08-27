Quiero que trabajes sobre el repositorio:

dtreasuresp/NovaInvestigator

Rama objetivo:

dev

IMPORTANTE:
- Primero AUDITA.
- Después PROPÓN.
- NO MODIFIQUES NINGÚN ARCHIVO todavía.
- NO HAGAS COMMIT.
- NO CAMBIES LA BD.
- NO CAMBIES VARIABLES de entorno.
- NO instales dependencias.
- No implementes nada hasta que yo lo autorice explícitamente.
- Quiero que toda afirmación sobre el estado actual del sistema esté respaldada por código real del repositorio.
- No asumas que una funcionalidad existe porque aparezca documentada en un .md.
- Distingue siempre entre "documentado", "implementado" y "funcionando/integrado end-to-end".

OBJETIVO GENERAL

Quiero convertir la capacidad de investigación web de NovAi en una infraestructura de investigación externa robusta, trazable y epistemológicamente segura.

NovAi no debe tratar una búsqueda web como simple recuperación de snippets.

La arquitectura objetivo conceptual es:

INTENT
  ↓
SEARCH
  ↓
RETRIEVE
  ↓
EXTRACT
  ↓
VALIDATE
  ↓
RANK
  ↓
EVIDENCE
  ↓
SYNTHESIS
  ↓
CITATION

Tavily debe ser considerado un PROVEEDOR de capacidades de búsqueda/retrieval, no el cerebro investigador de NovAi.

Quiero que determines cuánto de esta arquitectura existe actualmente y qué falta.

==================================================
1. AUDITORÍA DEL ESTADO ACTUAL
==================================================

Inspecciona como mínimo:

src/features/novai/tools/research/
src/features/novai/tools/
src/features/novai/
src/lib/
package.json
pnpm-lock.yaml
.env.example

Y localiza todos los componentes relacionados con:

- web_research
- Tavily
- Brave
- Serper
- EXTERNAL_EVIDENCE
- INTERNAL_EVIDENCE
- evidence
- research
- investigations
- context
- citations
- sources
- credibility
- relevance
- retrieval
- extraction

Busca también todas las referencias a:

TAVILY_API_KEY
BRAVE_SEARCH_API_KEY
BRAVE_API_KEY
SERPER_API_KEY

No te limites a web-research.ts.

Quiero conocer el flujo completo:

USER → AGENT → TOOL → PROVIDER → RESULT → AGENT → RESPONSE/UI

==================================================
2. AUDITA web-research.ts
==================================================

Analiza específicamente:

src/features/novai/tools/research/web-research.ts

Determina exactamente:

A. Qué inputs acepta.
B. Qué outputs devuelve.
C. Qué proveedor utiliza.
D. Cómo selecciona el proveedor.
E. Cómo maneja errores.
F. Cómo maneja timeout.
G. Qué información de Tavily conserva.
H. Qué información descarta.
I. Qué información llega realmente al modelo.
J. Qué información llega a la UI.
K. Qué información queda persistida.
L. Qué información queda auditada.

Documenta cada punto con ruta de archivo y líneas relevantes.

==================================================
3. TAVILY
==================================================

Verifica contra la documentación ACTUAL de Tavily qué capacidades relevantes existen.

No asumas que necesitamos implementar todas.

Analiza al menos:

- search
- extract
- crawl
- map
- research
- raw_content
- advanced search
- domain filtering
- date filtering
- topic/news
- result metadata
- source metadata
- relevance score
- cualquier otra capacidad que sea relevante para un agente investigador.

Quiero una matriz:

| Capacidad Tavily | Existe actualmente | Implementada en NovAi | Necesaria | Prioridad | Justificación |

IMPORTANTE:

No quiero que NovAi dependa innecesariamente de Python.

Determina si la implementación actual mediante HTTP/fetch es adecuada para Next.js/TypeScript.

NO agregues `tavily-python`.

Si consideras mejor utilizar un SDK Node/TypeScript, indícalo como propuesta separada y justifica ventajas/desventajas frente a fetch directo.

==================================================
4. PROBLEMA CRÍTICO: SCORE VS CREDIBILITY
==================================================

Audita especialmente este punto.

Actualmente parece existir una transformación conceptual similar a:

Tavily score
    ↓
relevanceScore / score
    ↓
credibilityScore

Quiero que determines si esto ocurre realmente.

Si ocurre, considéralo un problema epistemológico.

Tavily's score NO debe interpretarse automáticamente como:

- credibilidad
- confiabilidad
- calidad científica
- autoridad de la fuente
- validez metodológica.

Debe distinguirse claramente:

1. relevance_score
   Qué tan relevante es el resultado para la consulta.

2. source_authority
   Qué autoridad tiene la fuente.

3. source_reliability
   Qué tan confiable es la fuente según criterios explícitos.

4. evidence_quality
   Calidad de la evidencia encontrada.

5. freshness
   Vigencia temporal.

6. methodological_strength
   Fortaleza metodológica, cuando corresponda.

7. verification_status
   Si la afirmación fue corroborada o no.

NO inventes valores numéricos de credibilidad si no existe una metodología para calcularlos.

Si actualmente existe `credibilityScore` basado directamente en Tavily score, propón eliminar esa equivalencia.

Preferiría:

relevanceScore

y, separadamente:

credibilityAssessment

con estado explícito, por ejemplo:

UNKNOWN
ASSESSED
CORROBORATED
CONTRADICTED

siempre que esto encaje realmente con la arquitectura existente.

No agregues campos arbitrarios sin justificar su utilidad.

==================================================
5. EXTERNAL_EVIDENCE VS INTERNAL_EVIDENCE
==================================================

Audita la separación actual entre:

INTERNAL_EVIDENCE
EXTERNAL_EVIDENCE

Quiero comprobar si esta separación es REAL end-to-end.

Determina:

- dónde se crea
- dónde se transforma
- dónde se almacena
- dónde se pasa al modelo
- dónde se muestra
- dónde se cita
- dónde se audita.

Comprueba específicamente si existe algún camino por el cual:

EXTERNAL_EVIDENCE

pueda terminar siendo presentada como:

INTERNAL_EVIDENCE.

También comprueba lo contrario.

Si existe riesgo, propón mecanismos de aislamiento tipado y validación.

==================================================
6. EXTRACCIÓN DE FUENTES
==================================================

Evalúa si NovAi actualmente puede hacer:

1. Search
2. Seleccionar una fuente
3. Abrir/extraer esa fuente
4. Analizar su contenido completo
5. Obtener evidencia concreta
6. Citar la fuente.

Actualmente parece que Tavily se utiliza con:

include_raw_content: false

y que el snippet se limita aproximadamente a 600 caracteres.

Verifica esto en código.

Determina si esto es suficiente para un agente investigador.

Mi expectativa es que NovAi NO dependa exclusivamente de snippets para realizar afirmaciones importantes.

Propón una arquitectura de:

SEARCH → SELECT SOURCES → EXTRACT → EVIDENCE

pero sin implementar todavía.

==================================================
7. SOURCE EVIDENCE
==================================================

Diseña conceptualmente una representación de evidencia externa.

Debe poder responder:

- ¿Qué fuente originó esta evidencia?
- ¿Cuál es la URL?
- ¿Cuál es el título?
- ¿Cuándo fue publicada?
- ¿Cuándo fue recuperada?
- ¿Qué proveedor la encontró?
- ¿Qué consulta produjo el resultado?
- ¿Qué fragmento/contenido respalda la afirmación?
- ¿Cuál es el relevance score?
- ¿Fue corroborada?
- ¿Qué investigación/conversación la utilizó?
- ¿Qué afirmación del modelo respalda?

IMPORTANTE:

No implementes todavía.

Primero determina si debe:

A. reutilizarse una estructura existente,
B. extenderse una estructura existente,
C. crear una nueva entidad/table,
D. utilizar `novai_evidence`,
E. utilizar metadata.

Quiero una recomendación fundamentada.

==================================================
8. CONTEXTO E INVESTIGACIÓN ACTIVA
==================================================

La búsqueda web debe estar correctamente contextualizada.

Audita si web_research conoce o recibe correctamente:

- tenantId
- userId
- investigationId
- conversationId
- messageId
- active investigation
- current context.

El parámetro:

investigation_id

no debe ser decorativo.

Determina si actualmente realmente participa en trazabilidad/persistencia/contexto.

Si se recibe un investigation_id pero no se usa realmente, señálalo.

Quiero evitar exactamente el problema que hemos tenido con NovAi confundiendo investigaciones activas.

==================================================
9. PROVIDER ROUTING
==================================================

Audita:

Tavily
↓
Brave
↓
Serper

Determina:

- prioridad
- fallback
- errores
- timeout
- disponibilidad
- configuración
- observabilidad.

Evalúa si el fallback conserva correctamente:

providerUsed
source
retrievedAt
scores
metadata.

No permitir que un resultado de Brave sea etiquetado como Tavily.

No permitir que el modelo crea que una fuente proviene de un proveedor cuando realmente provino de otro.

==================================================
10. FAILURE MODES
==================================================

Audita qué ocurre cuando:

- no existe API key
- Tavily devuelve 401
- Tavily devuelve 429
- Tavily devuelve 500
- timeout
- respuesta malformada
- resultados vacíos
- Brave falla
- todos los proveedores fallan.

El agente debe recibir estados estructurados.

Nunca debe convertir:

EXTERNAL_RESEARCH_ERROR

en una respuesta inventada.

Nunca debe convertir:

EXTERNAL_RESEARCH_DISABLED

en una afirmación factual.

==================================================
11. CITATIONS
==================================================

Audita cómo NovAi cita fuentes externas.

Determina si actualmente puede producir:

- URL
- título
- fuente
- fecha
- fragmento relevante
- referencia trazable.

Quiero evitar respuestas como:

"Según estudios recientes..."

sin identificar exactamente qué estudio.

Si una afirmación importante depende de web research, debería existir una fuente identificable.

Evalúa si necesitamos una estructura de citation/evidence independiente.

==================================================
12. ANTI-HALLUCINATION
==================================================

Diseña reglas para impedir que el modelo:

- invente fuentes
- invente URLs
- invente resultados Tavily
- invente contenido de páginas
- atribuya una fuente a Tavily cuando vino de Brave
- convierta relevance score en credibility
- convierta snippets en contenido completo
- afirme haber verificado algo que no verificó
- presente una fuente externa como evidencia interna.

Especialmente:

Si una tool devuelve:

results: []

status: EXTERNAL_RESEARCH_ERROR

el modelo NO debe fabricar una respuesta basada en supuesta búsqueda.

==================================================
13. OBSERVABILIDAD
==================================================

Audita los logs actuales.

Determina si podemos reconstruir:

- quién ejecutó la búsqueda
- tenant
- investigación
- query
- provider
- latencia
- número de resultados
- error
- fallback
- fuente seleccionada
- extracción
- evidencia utilizada.

Quiero que la observabilidad permita responder:

"¿Por qué NovAi dio esta respuesta?"

sin almacenar secretos ni datos sensibles innecesarios.

==================================================
14. BENCHMARK
==================================================

Revisa si existe:

scripts/benchmark-novai-context.ts

y cualquier benchmark/test relacionado.

Determina si necesitamos crear casos específicos para web research.

Propón benchmarks reproducibles para:

A. búsqueda exitosa Tavily
B. Tavily fallback → Brave
C. sin providers
D. timeout
E. resultados vacíos
F. fuente externa vs interna
G. relevance vs credibility
H. extracción de fuente
I. citación
J. investigación activa correcta
K. investigación incorrecta/no existente.

No implementes todavía.

==================================================
15. ARQUITECTURA OBJETIVO
==================================================

Después de auditar, propón una arquitectura concreta.

Debe ser algo parecido a:

User Intent
    ↓
Intent / Research Decision
    ↓
Research Orchestrator
    ↓
Provider Router
    ├── Tavily
    ├── Brave
    └── futuros providers
    ↓
Search Results
    ↓
Source Selection
    ↓
Content Extraction
    ↓
Evidence Normalization
    ↓
Evidence Validation
    ↓
Evidence Store
    ↓
Context Manager
    ↓
LLM
    ↓
Answer + Citations
    ↓
Audit

Pero NO asumas que esta arquitectura es correcta.
Adáptala al código real.

==================================================
16. PRINCIPIO FUNDAMENTAL
==================================================

Quiero que respetes esta regla:

SEARCH RESULT ≠ EVIDENCE

Y también:

RELEVANCE ≠ CREDIBILITY

Y:

EXTERNAL SOURCE ≠ INTERNAL EVIDENCE

Y:

SNIPPET ≠ VERIFIED CONTENT

Y:

MODEL CLAIM ≠ FACT

NovAi debe mantener estas diferencias explícitas.

==================================================
17. CAMBIOS PROPUESTOS
==================================================

Después de la auditoría, presenta los cambios divididos en:

P0 — Críticos
P1 — Importantes
P2 — Mejoras
P3 — Futuro

Para cada cambio:

- archivo
- componente
- problema
- solución
- riesgo
- impacto
- dependencias
- tests necesarios.

NO MODIFIQUES NADA.

==================================================
18. COMPATIBILIDAD
==================================================

Todos los cambios propuestos deben preservar:

- Next.js
- TypeScript
- Vercel
- Supabase
- multi-tenancy
- RLS
- RBAC
- auditoría
- arquitectura modular de NovAi
- herramientas existentes
- INTERNAL_EVIDENCE
- contratos existentes siempre que sea posible.

No propongas introducir Python únicamente para Tavily.

==================================================
19. RESPUESTA FINAL OBLIGATORIA
==================================================

Quiero que tu respuesta final tenga exactamente estas secciones:

# 1. Estado actual

Qué existe realmente.

# 2. Qué afirmó la auditoría anterior

Qué afirmaciones estaban correctas.

# 3. Qué afirmaciones eran incompletas o incorrectas

Especialmente:

score vs credibility.

# 4. Matriz Tavily

search / extract / crawl / map / research / raw content / etc.

# 5. Problemas encontrados

Ordenados por severidad.

# 6. Arquitectura actual

Diagrama textual.

# 7. Arquitectura propuesta

Diagrama textual.

# 8. Modelo de evidencia recomendado

Sin implementar.

# 9. Cambios P0/P1/P2/P3

Muy concretos.

# 10. Tests y benchmark propuestos

# 11. Riesgos

# 12. Plan de implementación por fases

IMPORTANTE:

No implementes ninguna modificación.

No hagas commit.

No cambies la rama.

No instales paquetes.

No ejecutes migraciones.

Quiero primero revisar y aprobar tu diagnóstico y arquitectura.