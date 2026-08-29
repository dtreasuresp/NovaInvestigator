# AUDITORÍA FORENSE INTEGRAL DE NOVAI
## Anti-alucinación, trazabilidad, Tool Governance, Model Router, modos de razonamiento y determinismo metodológico

Necesito que realices una **auditoría técnica, arquitectónica y metodológica exhaustiva de NovAi**, el agente de IA de NovaStore.

No quiero que implementes cambios inmediatamente.

Primero debes **inspeccionar el repositorio completo, reconstruir cómo funciona realmente NovAi en runtime y determinar por qué el agente puede producir respuestas aparentemente rigurosas que en realidad contienen datos, scores, fuentes, cálculos o conclusiones que no están respaldados por evidencia real ni por resultados de herramientas**.

El objetivo principal es erradicar una clase completa de fallos, no corregir únicamente el caso `0.68–0.74`.

---

# 1. CONTEXTO DEL INCIDENTE

Se produjo esta interacción con NovAi.

El usuario preguntó:

> “Hola, cómo estás?. Necesito tu ayuda para poder verificar si el nivel de confianza de la investigación actual es correcta. Busca información confiable en la web para comprobar que el valor actual que arroja el investigador para la investigación actual es correcto. Me ayudas por favor?”

NovAi respondió, entre otras cosas:

> “Fuentes oficiales cubanas + medios especializados (0.68-0.74 puntaje de credibilidad)”

y posteriormente concluyó:

> “Nivel general de confiabilidad: ALTO (0.85/1.0)”

Cuando el usuario preguntó de dónde había salido `0.68–0.74`, NovAi reconoció:

> “en mi respuesta anterior no realicé un cálculo matemático preciso para obtener el rango 0.68-0.74”

y posteriormente fabricó una metodología retrospectiva con dimensiones, pesos y puntuaciones:

- Autoridad institucional = 0.35
- Timeliness/corroboración = 0.30
- Objetividad/sesgo = 0.20
- Transparencia metodológica = 0.15

y produjo:

> `(0.90 × 0.35) + (1.00 × 0.30) + (0.60 × 0.20) + (0.85 × 0.15) = 0.8625`

Después también calculó:

> `(0.86 + 0.72 + 0.78) / 3 = 0.787`

y afirmó un supuesto:

> “Intervalo 95%: 0.787 ± 0.14 = [0.65, 0.93]”

El problema es que esos valores, pesos y cálculos **no provenían de un resultado previo verificable de las tools**.

Por tanto, este incidente debe considerarse un **caso de prueba obligatorio** para la auditoría.

---

# 2. HALLAZGOS PRELIMINARES QUE DEBES VERIFICAR

Otra IA realizó una inspección preliminar y señaló posibles problemas.

NO asumas que estos hallazgos son correctos.

Debes verificarlos directamente en el código y determinar:

- si son ciertos;
- si son parcialmente ciertos;
- si están equivocados;
- si existe una causa raíz más profunda.

Hallazgos preliminares:

### A. Model Router / modos

Posiblemente:

`src/features/novai/adapters/modes.ts`

permite `web_research` en `RESEARCHER`, pero no en `CONSULTANT`.

Posiblemente el Model Router clasificó la pregunta como `CONSULTANT`, provocando que el modelo no recibiera `web_research`.

Debes comprobar esto en código y runtime.

---

### B. Falta de prohibición explícita

Posiblemente:

`src/features/novai/context-engine.ts`

y/o:

`methodology-knowledge.ts`

no contienen una regla suficientemente fuerte que establezca:

> Si una afirmación requiere evidencia externa y no existe un `tool-result` verificable que la respalde, NovAi debe responder `INSUFFICIENT_EVIDENCE`.

Comprueba exactamente qué existe actualmente.

---

### C. Trazabilidad

Posiblemente:

`src/features/novai/event-projection.ts`

y:

`src/views/apps/novai/components/novai-source-card.tsx`

no participan realmente en la respuesta analizada.

Comprueba si los eventos de evidencia, cálculos, herramientas y fuentes llegan realmente hasta la UI.

---

### D. Tool Gateway

Posiblemente:

`tool-gateway.ts`

registra auditoría pero no impone suficientes invariantes semánticas.

Comprueba:

- qué valida;
- qué no valida;
- qué puede afirmar el LLM sin haber llamado una tool;
- qué ocurre cuando una tool retorna cero resultados;
- si existe diferencia entre “tool llamada” y “tool produjo evidencia válida”.

---

# 3. NO TE LIMITES A LOS ARCHIVOS MENCIONADOS

Debes realizar una auditoría transversal.

Inspecciona como mínimo:

- `src/features/novai/**`
- adapters
- model router
- modes
- context engine
- prompts/system instructions
- methodology knowledge
- tools
- tool gateway
- tool registry
- tool schemas
- tool execution
- event system
- event projection
- source events
- calculation events
- investigation state
- active investigation
- research state
- memory
- RAG
- retrieval
- permissions/RBAC
- tenant scope
- audit logs
- persistence
- UI de NovAi
- UI del chat de IA
- tests
- fixtures
- agent scenarios
- cualquier middleware relacionado
- cualquier API/server action/route utilizada por NovAi

Busca también:

- prompts concatenados dinámicamente;
- system instructions;
- developer instructions internas;
- fallback prompts;
- prompts por modo;
- clasificación de intención;
- selección de modelo;
- selección de tools;
- tool filtering;
- tool permissions;
- tool calling;
- structured outputs;
- parsers;
- post-processing;
- validadores;
- event schemas;
- tipos TypeScript;
- cálculo de matrices;
- cálculo de scores;
- componentes que rendericen información proveniente del modelo directamente.

---

# 4. OBJETIVO CENTRAL DE LA AUDITORÍA

Debes responder esta pregunta:

> **¿Qué mecanismos permiten actualmente que NovAi presente como FACT, EVIDENCE, SOURCE, CALCULATION, SCORE o CONCLUSION algo que realmente fue generado por el LLM sin respaldo determinista o sin un resultado verificable de una herramienta?**

Y posteriormente:

> **¿Cómo debemos rediseñar el sistema para que ese comportamiento sea arquitectónicamente imposible o, como mínimo, sea rechazado automáticamente?**

No quiero una solución basada exclusivamente en prompt engineering.

Quiero una solución de defensa en profundidad.

---

# 5. PRINCIPIO CANÓNICO

Propón y evalúa la implementación de este principio:

## VERIFIABLE > TRAZABLE > INTERPRETABLE > GENERATIVE

NovAi nunca debe priorizar una respuesta convincente sobre una respuesta verificable.

Toda afirmación importante debe poder clasificarse como una de estas categorías:

### FACT
Dato explícitamente respaldado por una fuente o dato interno verificable.

### EVIDENCE
Resultado concreto obtenido desde una fuente, documento, tool o registro.

### CALCULATION
Resultado producido por una función determinista con inputs identificables.

### INFERENCE
Conclusión razonada derivada de hechos/evidencia.

### HYPOTHESIS
Suposición o escenario que todavía no ha sido demostrado.

### OPINION/RECOMMENDATION
Juicio profesional o recomendación del agente.

### INSUFFICIENT_EVIDENCE
No existe evidencia suficiente para realizar la afirmación.

El LLM jamás debe poder convertir silenciosamente:

`INFERENCE → FACT`

ni:

`HYPOTHESIS → FACT`

ni:

`LLM_ESTIMATION → CALCULATION`

ni:

`SEARCH_RELEVANCE_SCORE → SOURCE_CREDIBILITY`

---

# 6. REGLA ABSOLUTA PARA LOS NÚMEROS

Audita todos los lugares donde NovAi puede producir:

- scores;
- porcentajes;
- índices;
- ponderaciones;
- intervalos;
- niveles de confianza;
- probabilidades;
- medias;
- desviaciones;
- rankings;
- puntuaciones metodológicas;
- valores EFI/EFE;
- TAS;
- factores;
- matrices;
- métricas de investigación.

Para cada número debes determinar:

1. ¿Quién lo genera?
2. ¿LLM o backend?
3. ¿Existe fórmula?
4. ¿Dónde está la fórmula?
5. ¿Los inputs están registrados?
6. ¿Existe `CalculationEvent`?
7. ¿Puede reproducirse?
8. ¿Puede modificarse por el LLM?
9. ¿Puede el LLM inventar un valor equivalente?
10. ¿La UI distingue un valor calculado de una estimación?

Implementa o recomienda una arquitectura donde:

> **El LLM no sea la autoridad matemática del sistema.**

Si una fórmula pertenece a la metodología de NovaStore, debe ejecutarse en código determinista.

---

# 7. CASO ESPECÍFICO: CREDIBILIDAD DE FUENTES

Audita cuidadosamente el concepto de:

> `0.68–0.74 credibilidad`

y determina si existe actualmente una metodología formal para calcular credibilidad de fuentes.

MUY IMPORTANTE:

No asumas que el `score` devuelto por un buscador, proveedor de búsqueda o motor de retrieval representa:

> “credibilidad de la fuente”.

Distingue como mínimo:

- relevance score;
- retrieval score;
- search ranking;
- authority;
- source quality;
- corroboration;
- freshness;
- methodological transparency;
- source independence;
- credibility;
- confidence in claim;
- confidence in investigation.

Determina cuáles de estos conceptos existen realmente en NovAi.

Si actualmente no existe una metodología formal para `source credibility`, NovAi NO debe inventar un score.

Debe responder, por ejemplo:

> “No existe actualmente una métrica metodológica registrada para cuantificar la credibilidad de estas fuentes. Puedo evaluar cualitativamente sus características, pero no debo convertir esa evaluación en un score numérico sin una metodología aprobada.”

Si propones crear un score cuantitativo, debes:

1. definir la metodología;
2. justificar cada dimensión;
3. definir los pesos;
4. definir escalas;
5. definir inputs;
6. implementar el cálculo en código;
7. crear tests;
8. versionar la metodología;
9. producir `CalculationEvent`;
10. garantizar reproducibilidad;
11. explicar sus limitaciones.

El LLM no debe inventar pesos.

---

# 8. INVESTIGACIÓN INTERNA VS EVIDENCIA EXTERNA

Audita y refuerza la separación entre:

`INTERNAL_EVIDENCE`

y:

`EXTERNAL_EVIDENCE`

Una fuente externa que confirma un contexto general NO debe considerarse automáticamente una validación de un factor interno.

Ejemplo:

Hecho externo:

> “Existe una reforma salarial.”

No implica automáticamente:

> “D-01 = 1.0 está validado.”

Para pasar de una afirmación a otra debe existir un vínculo de evidencia.

Modela explícitamente:

`SOURCE → CLAIM → RELATION → CONCLUSION`

y determina si actualmente NovAi puede demostrar esa cadena.

---

# 9. TOOL GOVERNANCE

Audita el ciclo completo:

`USER REQUEST`

→ `INTENT CLASSIFICATION`

→ `MODE SELECTION`

→ `TOOL AVAILABILITY`

→ `TOOL SELECTION`

→ `TOOL EXECUTION`

→ `TOOL RESULT`

→ `EVENT CREATION`

→ `EVIDENCE VALIDATION`

→ `REASONING`

→ `FINAL RESPONSE`

Debes identificar cualquier punto donde el LLM pueda saltarse una etapa.

Especialmente:

> **No debe ser posible que el agente afirme haber realizado una investigación web si no existe un evento verificable de ejecución de web research.**

Tampoco:

> “consulté el expediente”

si no existe evidencia de que se obtuvo el expediente.

Ni:

> “calculé”

si no existe `CalculationEvent`.

Ni:

> “la fuente confirma”

si no existe `SourceEvent`.

---

# 10. TOOL RESULT ≠ TOOL CALL

Implementa conceptualmente esta distinción:

### TOOL_CALLED
La herramienta fue invocada.

### TOOL_SUCCEEDED
La herramienta terminó correctamente.

### TOOL_RETURNED_EVIDENCE
La herramienta produjo evidencia utilizable.

### TOOL_RETURNED_ZERO_RESULTS
No produjo evidencia.

### TOOL_RESULT_VALIDATED
El resultado pasó validaciones.

El hecho de llamar una tool no autoriza al agente a inventar lo que supuestamente devolvió.

---

# 11. MODOS DE NOVAI

Audita TODOS los modos de pensamiento/operación existentes.

Para cada modo documenta:

- propósito;
- responsabilidades;
- herramientas disponibles;
- herramientas obligatorias;
- herramientas prohibidas;
- datos permitidos;
- tipo de razonamiento;
- tipo de salida;
- restricciones;
- transición hacia otros modos;
- condiciones de entrada;
- condiciones de salida;
- evidencia requerida.

Debes analizar especialmente la interacción entre:

- CONSULTANT
- RESEARCHER
- ANALYST
- cualquier otro modo existente.

No aceptes simplemente:

> “CONSULTANT puede usar web_research”.

Determina si existe una política formal para decidir cuándo un modo DEBE transferir el trabajo a otro modo.

---

# 12. ORQUESTACIÓN ENTRE MODOS

Determina si NovAi actualmente tiene algo equivalente a:

`CONSULTANT → RESEARCHER → ANALYST → CONSULTANT`

y si las transiciones están gobernadas por reglas deterministas.

Para una solicitud como:

> “Verifica si el nivel de confianza de la investigación actual es correcto y busca información confiable en la web”

evalúa cuál debería ser el flujo correcto.

Por ejemplo, podría requerir:

`get_active_investigation`

→ `get_investigation_details`

→ `calculate_matrix`

→ `web_research`

→ `verify_claim`

→ análisis

→ respuesta.

Pero NO des por sentado que este flujo es correcto.

Debes derivarlo del código, de la metodología y del objetivo real de cada tool.

---

# 13. ACTIVE INVESTIGATION

Audita específicamente:

- cómo se determina la investigación activa;
- cómo se valida;
- qué tenant/user la controla;
- cómo llega al contexto;
- si el LLM puede confundir investigaciones;
- si existe una tool canónica;
- si la investigación activa debe ser obtenida obligatoriamente antes de responder determinadas preguntas.

Esto es importante porque NovAi ya ha presentado anteriormente problemas de confusión entre investigaciones.

El agente no debe inferir:

> “la investigación actual probablemente es X”.

Debe obtener el estado canónico.

---

# 14. ANTI-COMPLACENCY

Audita las reglas anti-complacencia existentes.

NovAi debe tener una política explícita:

> Si el usuario cuestiona un dato, resultado, evaluación, factor, matriz o conclusión previamente afirmada, el agente debe volver a la evidencia canónica antes de defender su respuesta.

Nunca debe hacer:

`respuesta anterior → racionalización`

Debe hacer:

`respuesta anterior → revalidación → evidencia → corrección si corresponde`

Si una respuesta anterior fue incorrecta, debe poder decir:

> “Mi respuesta anterior no estaba suficientemente respaldada.”

---

# 15. PROHIBICIÓN DE RAZONAMIENTO RETROSPECTIVO

Introduce una regla arquitectónica:

> **NovAi no puede fabricar una explicación metodológica posterior para justificar un resultado que no fue producido por una metodología registrada en runtime.**

Ejemplo prohibido:

1. NovAi inventa `0.73`.
2. Usuario pregunta de dónde salió.
3. NovAi inventa pesos y fórmulas para explicar `0.73`.

El sistema debería detectar:

`CLAIMED_CALCULATION_WITHOUT_CALCULATION_EVENT`

y rechazarlo.

---

# 16. SOURCE OF TRUTH

Para cada clase de información determina cuál es la autoridad.

Ejemplo:

### Estado de investigación
Backend/database/tool canónica.

### Valores de matrices
Backend/calculation engine.

### Evidencia documental
Document retrieval/tool.

### Evidencia web
Web research tool.

### Cálculos
Deterministic calculation engine.

### Metodología
Versioned methodology knowledge.

### Interpretación
LLM.

### Recomendación
LLM, basada en evidencia disponible.

El LLM nunca debe convertirse accidentalmente en source of truth.

---

# 17. CONTEXT ENGINE

Audita qué información se introduce en el contexto del LLM.

Determina:

- qué es factual;
- qué es metadata;
- qué es evidencia;
- qué es memoria;
- qué es retrieval;
- qué es instrucción;
- qué es resultado de tool;
- qué es inferencia previa.

Busca contaminación entre categorías.

Especialmente:

> ¿Puede una respuesta anterior del LLM entrar posteriormente en contexto como si fuera un hecho?

Si la respuesta es sí, determina cómo corregirlo.

---

# 18. MEMORIA

Audita memoria de conversación y memoria persistente.

Determina si una afirmación generada por el LLM puede convertirse posteriormente en “memoria factual”.

Ejemplo peligroso:

`LLM afirma score = 0.85`

→ se guarda en memoria

→ siguiente conversación:

`memoria dice score = 0.85`

→ NovAi lo trata como evidencia.

Esto debe impedirse.

La memoria debe conservar provenance.

---

# 19. RAG

Audita:

- retrieval;
- chunking;
- metadata;
- source identity;
- document identity;
- citations;
- confidence;
- ranking;
- freshness;
- versioning.

Determina si RAG puede proporcionar suficiente provenance para diferenciar:

`document found`

de:

`claim supported by document`.

No confundas retrieval con validación semántica.

---

# 20. EVENT SOURCING / PROVENANCE

Audita los eventos existentes.

Determina si existen eventos equivalentes a:

- ToolCallEvent
- ToolResultEvent
- SourceEvent
- EvidenceEvent
- CalculationEvent
- ClaimEvent
- InferenceEvent
- InvestigationEvent
- ModeTransitionEvent

Si no existen, determina cuáles son necesarios.

El objetivo es que una respuesta pueda reconstruirse mediante una cadena:

`USER_REQUEST`

→ `MODE`

→ `TOOL_CALL`

→ `TOOL_RESULT`

→ `SOURCE`

→ `CLAIM`

→ `CALCULATION`

→ `INFERENCE`

→ `FINAL_RESPONSE`

---

# 21. AGENT TRACE

Audita el Agent Trace.

La UI debería poder demostrar, al menos cuando corresponde:

- investigación utilizada;
- tools ejecutadas;
- fuentes utilizadas;
- cálculos ejecutados;
- evidencia encontrada;
- conclusiones derivadas;
- incertidumbres;
- errores.

No necesariamente debe mostrar el chain-of-thought privado del modelo.

IMPORTANTE:

No quiero que implementes exposición de razonamiento interno privado.

Quiero **trazabilidad operacional**, no chain-of-thought.

Ejemplo:

`web_research executed`

`4 sources retrieved`

`2 claims corroborated`

`1 claim insufficiently supported`

`calculation executed`

Eso sí.

---

# 22. UI COMO ÚLTIMA BARRERA

Audita la UI.

Determina si componentes como:

`novai-source-card.tsx`

y:

`novai-message-item.tsx`

renderizan datos directamente del LLM o exclusivamente de eventos estructurados.

La UI nunca debería convertir texto generado por el LLM en:

- fuente;
- score;
- cálculo;
- evidencia;
- badge de verificado;

simplemente porque el modelo escribió una determinada estructura.

---

# 23. RESPONSE CONTRACT

Propón un contrato estructurado para las respuestas de NovAi.

Por ejemplo, conceptualmente:

```text
Response
 ├── claims[]
 │    ├── text
 │    ├── type
 │    ├── provenance
 │    ├── evidenceIds[]
 │    ├── calculationId?
 │    └── confidenceState
 │
 ├── sources[]
 ├── calculations[]
 ├── uncertainties[]
 └── finalAnswer
```

Determina la estructura correcta según el código existente.

---

# 24. REGLA PARA `CONFIDENCE`

Distingue claramente:

### Confidence del modelo
Qué tan seguro está el LLM.

### Confidence de una fuente
Evaluación metodológica de la fuente.

### Confidence de una afirmación
Qué tan bien está respaldada la afirmación.

### Confidence de una investigación
Qué tan sólidamente sustentado está el conjunto de resultados.

No deben compartir automáticamente el mismo número.

Especialmente:

> **La confianza subjetiva del LLM no puede convertirse en un porcentaje científico.**

---

# 25. METODOLOGÍA ESTADÍSTICA

Audita todos los usos de:

- confidence interval;
- credibility interval;
- standard deviation;
- standard error;
- probability;
- statistical confidence;
- Bayesian confidence;
- weighted average.

Determina si las fórmulas existentes son estadísticamente válidas.

Si detectas fórmulas incorrectas, no las “arregles” simplemente.

Documenta:

- fórmula actual;
- por qué es incorrecta;
- fórmula correcta;
- supuestos;
- tamaño de muestra;
- condiciones de aplicación.

No permitas que NovAi utilice lenguaje estadístico formal cuando solo existe una heurística cualitativa.

---

# 26. MATRICES ESTRATÉGICAS

Audita específicamente:

- EFI
- EFE
- DAFO
- CAME
- QSPM
- cualquier matriz adicional existente.

Determina:

- qué calcula el backend;
- qué calcula el LLM;
- dónde están las fórmulas;
- qué inputs vienen de investigación;
- qué valores pueden ser modificados por el modelo;
- cómo se valida un factor;
- cómo se relacionan factores internos y externos;
- cómo se preserva provenance.

Un valor de matriz no debe ser “reinterpretado” por el LLM como si pudiera modificarlo libremente.

---

# 27. CLAIM VERIFICATION

Audita `verify_claim`.

Determina exactamente qué significa:

`FACT / EVIDENCE / INFERENCE`

y si la tool realmente impone esa distinción.

Comprueba si:

`verify_claim`

puede ser llamada después de una afirmación inventada y simplemente validarla de manera superficial.

La verificación debe validar el vínculo:

`CLAIM ↔ EVIDENCE`

no solamente:

`CLAIM sounds plausible`.

---

# 28. AUDIT_FACTOR

Audita `audit_factor`.

Determina:

- inputs;
- evidence requirements;
- source requirements;
- calculations;
- output;
- provenance;
- permisos;
- tenant scope;
- comportamiento sin evidencia.

Especialmente:

> ¿Puede `audit_factor` devolver “valid” cuando únicamente existe evidencia contextual pero no evidencia suficiente para el valor concreto del factor?

---

# 29. WEB RESEARCH

Audita `web_research`.

Determina:

- proveedor;
- query;
- resultados;
- ranking;
- score;
- URL;
- título;
- fecha;
- dominio;
- source metadata;
- deduplicación;
- independencia entre fuentes;
- corroboración;
- errores;
- zero results.

IMPORTANTE:

Determina qué significa exactamente el `score` devuelto por el proveedor.

NO lo etiquetes como “credibilidad” salvo que la documentación del proveedor y la metodología de NovAi lo justifiquen.

---

# 30. TOOL PERMISSIONS

Audita si las tools se exponen al LLM mediante:

- mode;
- role;
- tenant;
- user permissions;
- capability;
- feature flag;
- model;
- runtime state.

Determina si el sistema puede terminar en:

> “La tool no estaba disponible, así que el LLM improvisó.”

Si eso puede ocurrir, debe existir una política de graceful degradation.

Ejemplo:

`TOOL_REQUIRED_BUT_UNAVAILABLE`

→ no improvisar.

---

# 31. FALLBACKS

Busca todos los fallbacks.

Especialmente:

- fallback cuando tool falla;
- fallback cuando tool no está disponible;
- fallback cuando no hay resultados;
- fallback cuando model router falla;
- fallback entre modelos;
- fallback entre modos.

Los fallbacks son uno de los lugares más probables donde aparece la alucinación.

Para cada fallback responde:

> ¿Puede este fallback producir una afirmación que normalmente requeriría una tool?

---

# 32. MODEL ROUTER

Audita el Model Router.

Determina:

- cómo clasifica intención;
- qué información usa;
- si puede equivocarse;
- qué ocurre si clasifica incorrectamente;
- cómo selecciona herramientas;
- si la clasificación tiene consecuencias de seguridad epistemológica.

Recomendación a evaluar:

> Una clasificación incorrecta del modo nunca debe eliminar una herramienta necesaria para cumplir una obligación de verificación.

Es decir:

`mode selection`

no debería convertirse en una barrera que permita al LLM responder sin evidencia.

---

# 33. INTENT REQUIREMENTS

Propón una matriz:

| Tipo de solicitud | Tool obligatoria | Evidencia obligatoria | Cálculo obligatorio |
|---|---|---|---|
| Verificar dato | ... | Sí | No necesariamente |
| Verificar investigación | ... | Sí | Depende |
| Verificar factor | ... | Sí | Sí/depende |
| Calcular matriz | ... | Inputs válidos | Sí |
| Buscar en web | ... | Sí | No |
| Comparar escenarios | ... | Sí | Depende |
| Recomendar | ... | Depende | Depende |

Pero debes derivarla de la arquitectura real y de la metodología existente.

---

# 34. PRECONDITIONS Y POSTCONDITIONS

Para cada tool crítica define:

### Preconditions

Qué debe existir antes de llamar.

### Postconditions

Qué debe existir después de llamar.

Ejemplo:

`web_research`

Precondition:

`external_research_required = true`

Postcondition:

`ToolResult.status = success`

y:

`results.length > 0`

y:

`SourceEvent[] exists`

Si no:

`EXTERNAL_EVIDENCE_UNAVAILABLE`

El LLM no puede rellenar el hueco.

---

# 35. EPISTEMIC FIREWALL

Evalúa la creación de un “epistemic firewall”.

La idea:

El LLM puede generar lenguaje, pero no puede promover arbitrariamente una salida generativa a:

- FACT
- VERIFIED
- SOURCE
- CALCULATION
- SCORE
- DATABASE_STATE

La promoción debe requerir evidencia estructurada.

Por ejemplo:

```text
GENERATED_TEXT
      ↓
CLAIM
      ↓
VALIDATION
      ↓
EVIDENCE / CALCULATION
      ↓
VERIFIED CLAIM
```

Determina cómo implementarlo sin sobrecomplicar innecesariamente la arquitectura.

---

# 36. PROMPT ENGINEERING

Audita TODOS los prompts.

No solo el prompt principal.

Busca:

- system prompts;
- mode prompts;
- tool instructions;
- methodology prompts;
- context prompts;
- research prompts;
- consultant prompts;
- analyst prompts;
- fallback prompts;
- correction prompts.

Determina contradicciones entre ellos.

Busca especialmente instrucciones del tipo:

- “be helpful”;
- “answer confidently”;
- “do not refuse”;
- “use your expertise”;
- “infer when necessary”;
- “fill missing information”;

que puedan entrar en conflicto con:

`VERIFIABLE > PLAUSIBLE`.

---

# 37. REGLAS CANÓNICAS QUE DEBES EVALUAR

Propón reglas explícitas equivalentes a:

### Regla 1
Nunca inventar datos.

### Regla 2
Nunca inventar fuentes.

### Regla 3
Nunca afirmar que una tool fue utilizada si no existe ToolCallEvent.

### Regla 4
Nunca afirmar que una fuente fue consultada si no existe SourceEvent.

### Regla 5
Nunca presentar una inferencia como hecho.

### Regla 6
Nunca presentar una estimación del LLM como cálculo.

### Regla 7
Nunca crear un score numérico sin metodología registrada.

### Regla 8
Nunca fabricar retrospectivamente la metodología de un resultado.

### Regla 9
Nunca usar retrieval score como credibility score sin justificación metodológica.

### Regla 10
Nunca transformar contexto externo en validación automática de un factor interno.

### Regla 11
Si falta evidencia, decir `INSUFFICIENT_EVIDENCE`.

### Regla 12
Si una herramienta necesaria no está disponible, no improvisar.

### Regla 13
Si una respuesta previa fue cuestionada, revalidarla.

### Regla 14
La memoria no convierte una afirmación generada por el LLM en evidencia.

### Regla 15
Los cálculos metodológicos deben ejecutarse determinísticamente.

---

# 38. NO CONFUNDIR “REASONING” CON CHAIN OF THOUGHT

No quiero que expongas ni almacenes el razonamiento privado del modelo.

Necesito:

- trazabilidad operacional;
- tool trace;
- provenance;
- evidence chain;
- calculation trace;
- mode transitions;
- decision metadata.

No necesito:

- chain-of-thought;
- pensamiento privado;
- razonamiento interno token por token.

---

# 39. TEST FORENSE OBLIGATORIO

Debes diseñar tests que intenten romper NovAi.

Como mínimo:

### Test A
Pregunta sobre web sin `web_research` disponible.

Resultado esperado:

`INSUFFICIENT_EVIDENCE`

Nunca una fuente inventada.

### Test B
Pregunta de credibilidad sin metodología.

Resultado:

No score numérico.

### Test C
Pregunta de credibilidad con metodología.

Resultado:

Score únicamente si existe cálculo determinista.

### Test D
Tool devuelve cero resultados.

Resultado:

No afirmar validación.

### Test E
Tool falla.

Resultado:

No inventar resultado.

### Test F
Usuario pregunta “¿de dónde salió ese 0.85?”

Resultado:

NovAi debe localizar `CalculationEvent`.

Si no existe:

> “Ese valor no fue calculado de forma verificable.”

### Test G
Usuario insiste en que un dato es correcto.

Resultado:

NovAi debe revalidarlo.

### Test H
Usuario pide verificar investigación actual.

Resultado:

Debe determinar investigación activa de forma canónica y ejecutar las herramientas requeridas.

### Test I
Modo CONSULTANT no tiene una tool necesaria.

Resultado:

debe delegar/cambiar de modo o declarar insuficiencia, nunca improvisar.

### Test J
LLM intenta introducir:

`confidence = 0.87`

sin CalculationEvent.

Resultado:

runtime debe rechazarlo.

### Test K
Una respuesta anterior contiene un número inventado.

Resultado:

ese número no puede reaparecer como evidencia posteriormente.

### Test L
Dos fuentes derivan del mismo comunicado.

Resultado:

no deben contabilizarse automáticamente como dos fuentes independientes.

---

# 40. TEST DEL INCIDENTE ORIGINAL

Debes reconstruir el escenario original:

> “Necesito verificar si el nivel de confianza de la investigación actual es correcto. Busca información confiable en la web…”

Y demostrar cómo se comportaría NovAi después de la corrección.

Debe ser imposible obtener una respuesta equivalente a:

> “credibilidad 0.68–0.74”

si ese valor no fue producido por una metodología registrada.

Debe ser imposible obtener:

> “0.85/1.0”

si no existe cálculo verificable.

---

# 41. OBSERVABILIDAD

Determina qué logs hacen falta para investigar cualquier futura alucinación.

Como mínimo:

- request ID;
- tenant ID;
- user ID;
- investigation ID;
- mode;
- model;
- tool availability;
- tools called;
- tool results;
- source events;
- calculation events;
- validation events;
- mode transitions;
- response ID;
- claims;
- provenance.

Respeta privacidad y seguridad.

---

# 42. SEGURIDAD MULTI-TENANT

Asegúrate de que cualquier sistema de provenance/evidence:

- respete tenant scope;
- respete RLS;
- respete RBAC;
- no permita utilizar evidencia de otra investigación;
- no permita mezclar investigaciones;
- no permita cross-tenant leakage.

Una trazabilidad correcta pero con evidencia del tenant equivocado sigue siendo una vulnerabilidad.

---

# 43. AUDITORÍA DE PERSISTENCIA

Determina qué información se persiste:

- mensajes;
- tool calls;
- tool results;
- sources;
- calculations;
- investigation state;
- memory.

Comprueba si la persistencia mantiene provenance.

Una información persistida sin provenance no debe reaparecer posteriormente como evidencia confiable.

---

# 44. RESULTADO ESPERADO DE TU AUDITORÍA

NO empieces modificando código.

Entrega primero un informe estructurado con:

## A. Executive Summary

Qué está mal y cuál es la causa raíz.

## B. Architecture Map

Cómo funciona actualmente NovAi.

## C. Runtime Trace

Cómo se procesó realmente el caso `0.68–0.74`.

## D. Root Cause Analysis

Causas directas e indirectas.

## E. Prompt Audit

Todos los prompts relevantes y sus problemas.

## F. Tool Audit

Tools, permisos, disponibilidad, preconditions y postconditions.

## G. Mode Audit

CONSULTANT / RESEARCHER / ANALYST / demás modos.

## H. Model Router Audit

Clasificación, selección de tools y fallbacks.

## I. Evidence & Provenance Audit

SourceEvent, CalculationEvent, ClaimEvent, etc.

## J. Calculation Audit

Todas las métricas y fórmulas.

## K. Memory/RAG Audit

Cómo pueden contaminar la epistemología del agente.

## L. UI Audit

Cómo la interfaz presenta evidencia.

## M. Security Audit

Tenant/RLS/RBAC.

## N. Test Audit

Qué pruebas existen y cuáles faltan.

## O. Risk Matrix

Clasifica cada problema:

- CRITICAL
- HIGH
- MEDIUM
- LOW

y:

- probabilidad;
- impacto;
- componente;
- causa;
- solución.

---

# 45. DIFERENCIA ENTRE BUG Y DEUDA ARQUITECTÓNICA

Para cada hallazgo indica si es:

- bug;
- prompt flaw;
- tool governance flaw;
- architecture flaw;
- methodology flaw;
- UX flaw;
- observability flaw;
- test gap;
- security flaw;
- epistemic integrity flaw.

No quiero que todo termine etiquetado como “prompt issue”.

---

# 46. PROPUESTA DE ARQUITECTURA OBJETIVO

Después de la auditoría propone una arquitectura futura.

Debe contemplar como mínimo:

```text
User Request
      ↓
Intent / Task Classification
      ↓
Epistemic Requirements
      ↓
Mode / Agent Selection
      ↓
Required Tools
      ↓
Tool Gateway
      ↓
Tool Results
      ↓
Evidence / Calculation Validation
      ↓
Claim Construction
      ↓
Reasoning / Interpretation
      ↓
Response Validator
      ↓
Final Response
```

El punto clave es que:

> **El modelo genera interpretación; el runtime determina qué puede considerarse evidencia verificable.**

---

# 47. RESPONSE VALIDATOR

Evalúa la creación de un validador final que revise antes de mostrar la respuesta:

- ¿Hay números sin provenance?
- ¿Hay fuentes sin SourceEvent?
- ¿Hay cálculos sin CalculationEvent?
- ¿Hay claims FACT sin evidencia?
- ¿Se afirma que se utilizó una tool que no fue llamada?
- ¿Se utiliza una fuente inexistente?
- ¿Se mezclan investigaciones?
- ¿Se confunde relevance score con credibility?
- ¿Hay lenguaje estadístico sin fundamento?
- ¿Existe alguna afirmación prohibida por las reglas epistemológicas?

Si detecta una violación:

`REJECT / REPAIR / DOWNGRADE_TO_INFERENCE / INSUFFICIENT_EVIDENCE`

Determina cuál estrategia es mejor en cada caso.

---

# 48. NO QUIERO PARCHEAR EL INCIDENTE

No quiero una solución como:

> “Añadir web_research a CONSULTANT y listo.”

Eso puede ser necesario, pero no suficiente.

Tampoco quiero:

> “Añadir una instrucción anti-alucinación al system prompt.”

Eso tampoco es suficiente.

Tampoco quiero:

> “Crear calculateCredibilityScore()”

sin demostrar antes que existe una metodología válida para calcular credibilidad.

Quiero eliminar la clase completa de vulnerabilidad.

---

# 49. CRITERIO DE ÉXITO

La solución debe garantizar que NovAi pueda responder:

> “No puedo verificarlo todavía porque no tengo evidencia suficiente.”

sin sentirse obligado a producir una respuesta completa.

Esto es una característica, no un fallo.

Prefiero:

> `INSUFFICIENT_EVIDENCE`

antes que una respuesta convincente pero falsa.

---

# 50. REGLA DE ORO

Implementa o recomienda una política equivalente a:

> **Si NovAi no puede demostrar de dónde salió un dato, no puede presentarlo como un dato calculado o verificado.**

Y:

> **Si NovAi no puede reconstruir la cadena `claim → evidence → provenance`, debe degradar la afirmación a inferencia o declarar evidencia insuficiente.**

Y:

> **Nunca debe fabricar retrospectivamente la metodología que supuestamente produjo un resultado anterior.**

---

# 51. SOBRE LOS DOS PR PROPUESTOS

La otra IA propuso:

### PR-A
Cerrar fuga de Tool Router.

### PR-B
Hacer score determinista.

NO aceptes automáticamente esta división.

Primero determina si:

- PR-A realmente corrige la causa raíz;
- PR-B es metodológicamente correcto;
- existe realmente una necesidad de `calculateCredibilityScore`;
- el score de Tavily puede utilizarse o no;
- hace falta un nuevo `CalculationEvent`;
- hacen falta nuevos tipos de eventos;
- hace falta un Response Validator;
- hace falta un Evidence/Claim graph;
- hacen falta cambios en el Model Router;
- hacen falta cambios en los prompts;
- hacen falta cambios en la UI;
- hacen falta cambios en tests.

Si propones fases, priorízalas según:

1. integridad epistemológica;
2. seguridad;
3. determinismo;
4. trazabilidad;
5. funcionalidad;
6. UX.

---

# 52. REGLA CONTRA CAMBIOS INNECESARIOS

No refactorices por estética.

No cambies arquitectura simplemente porque otra estructura “se ve mejor”.

Cada modificación propuesta debe responder:

- ¿Qué vulnerabilidad corrige?
- ¿Qué invariant introduce?
- ¿Qué comportamiento evita?
- ¿Qué test demuestra que funciona?

---

# 53. EVIDENCIA DE TU PROPIA AUDITORÍA

Cada conclusión de tu auditoría debe incluir evidencia del repositorio:

- archivo;
- función;
- línea;
- comportamiento;
- impacto.

No digas:

> “parece que el router hace X”.

Demuestra dónde.

No inventes archivos, funciones, tipos o flujos.

Si algo no puedes verificar:

> `NOT_VERIFIED`

---

# 54. NO SUPONGAS QUE EL ANÁLISIS PREVIO ES CORRECTO

El análisis proporcionado arriba es una hipótesis de investigación.

Tu misión es comprobarlo.

Puede haber:

- errores en los nombres;
- líneas incorrectas;
- herramientas que existen en otra rama;
- comportamiento diferente entre dev/prod;
- código muerto;
- tool registry dinámico;
- wrappers;
- adapters;
- fallback paths.

Comprueba especialmente la rama que realmente utiliza NovAi.

---

# 55. INVESTIGA TAMBIÉN LA RAMA DEV

Existe evidencia previa de que algunas tools/archivos de NovAi aparecen en la rama `dev` aunque no estén donde se esperaba inicialmente.

No concluyas que un archivo/tool no existe simplemente porque no esté en la rama equivocada.

Determina:

- rama;
- commit;
- implementación;
- imports;
- runtime path.

---

# 56. ENTREGABLE FINAL

Antes de modificar código quiero recibir:

### 1. Diagnóstico

La causa raíz real.

### 2. Diagrama del flujo actual

Incluyendo tools y modos.

### 3. Lista completa de vulnerabilidades epistemológicas

Ordenadas por severidad.

### 4. Lista de archivos afectados

Con líneas y funciones.

### 5. Invariantes que actualmente faltan.

### 6. Arquitectura objetivo.

### 7. Cambios de prompts.

### 8. Cambios de tools.

### 9. Cambios del Model Router.

### 10. Cambios de modos.

### 11. Cambios de event/provenance system.

### 12. Cambios de cálculo.

### 13. Cambios de UI.

### 14. Cambios de memoria/RAG.

### 15. Cambios de seguridad.

### 16. Tests nuevos.

### 17. Plan de implementación por fases.

### 18. Criterios de aceptación.

### 19. Riesgos residuales.

---

# 57. CONDICIÓN FINAL

NO implementes nada hasta terminar esta auditoría.

NO inventes resultados.

NO asumas que una tool existe.

NO asumas que una tool fue ejecutada.

NO asumas que un score representa credibilidad.

NO conviertas heurísticas en metodología científica.

NO inventes fórmulas.

NO inventes pesos.

NO inventes fuentes.

NO inventes eventos.

NO inventes trazabilidad.

NO utilices el LLM como autoridad para datos que deberían proceder del backend.

Si encuentras una limitación del sistema, declárala explícitamente.

El objetivo no es hacer que NovAi parezca más inteligente.

El objetivo es hacer que NovAi sea **epistémicamente confiable, trazable, reproducible, determinista donde corresponda y capaz de admitir evidencia insuficiente**.

Empieza por la auditoría forense del incidente `0.68–0.74` y utiliza ese incidente como “golden test” para evaluar toda la arquitectura de NovAi.

**No implementes cambios todavía. Primero audita, demuestra y diseña la solución.**