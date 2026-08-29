# AUDITORÍA Y CORRECCIÓN INTEGRAL DEL PIPELINE DE NovAi — VERIFY_INVESTIGATION

Necesito que hagas una **auditoría técnica profunda del código real de NovaStore/NovAi** y corrijas el flujo de ejecución de `VERIFY_INVESTIGATION`.

Repositorio objetivo:

`dtreasuresp/NovaInvestigator`

## CONTEXTO

Ya se implementaron cambios anteriores relacionados con:

* `HybridIntentClassifier`
* selección dinámica de tools
* instrumentación de ejecuciones
* `ResponseValidator`
* búsqueda web mediante Tavily
* persistencia de evidencia
* tabla `novai_evidence`
* instrumentación `novai_agent_runs`

Sin embargo, los logs demuestran que el problema fundamental **NO está resuelto**.

No quiero otro parche cosmético ni otra capa de validación encima de las existentes.

Quiero que inspecciones cómo funciona realmente el pipeline:

```text
usuario
  ↓
intent classifier
  ↓
tool selection
  ↓
tool execution
  ↓
tool results
  ↓
agent/model reasoning
  ↓
response validation
  ↓
persistencia
  ↓
respuesta final/UI
```

y determines exactamente dónde se rompe el contrato.

---

# INCIDENTE REAL OBSERVADO

La consulta del usuario es conceptualmente:

> "Perfecto. Entonces, puedes repetir otra vez a ver si encuentras información que respalde el grado de confianza de la investigación?"

El sistema clasifica correctamente:

```text
intent = VERIFY_INVESTIGATION
confidence = 0.98
```

Y selecciona:

```text
get_active_investigation
get_investigation_details
verify_claim
calculate_matrix
web_research
```

Pero finalmente:

```text
ResponseValidator findings

actionTaken:
INSUFFICIENT_EVIDENCE

finding:
R12 CRITICAL
Faltan herramientas obligatorias o no concluyeron con éxito para intent VERIFY_INVESTIGATION: verify_claim.
```

Además:

```text
web_research executed
providerUsed: tavily
resultsCount: 5 / 8 / 6
```

Por tanto, **la búsqueda web sí está funcionando**.

Pero inmediatamente después:

```text
Error saving evidence

Could not find the 'epistemic' column of 'novai_evidence'
in the schema cache
```

Y finalmente:

```text
ResponseValidator
INSUFFICIENT_EVIDENCE
```

También aparece:

```text
Failed to persist novai_agent_runs

new row violates row-level security policy
for table "novai_agent_runs"
```

La petición termina con HTTP 200, pero la respuesta que había producido NovAi desaparece/reemplaza y aparece:

> "No se obtuvo evidencia externa suficiente para respaldar o confirmar el nivel de confianza..."

Esto es incorrecto desde el punto de vista del lifecycle de una respuesta.

---

# OBJETIVO PRINCIPAL

Quiero que conviertas `VERIFY_INVESTIGATION` en un flujo **determinista, auditable y resistente a fallos de infraestructura**.

No basta con que las tools estén:

```text
selectedTools
```

Debe existir una distinción explícita entre:

```text
EXPOSED
SELECTED
CALLED
STARTED
SUCCEEDED
FAILED
TIMED_OUT
SKIPPED
RESULT_AVAILABLE
EVIDENCE_PERSISTED
```

Una tool no puede considerarse "exitosa" simplemente porque fue seleccionada.

---

# 1. AUDITA PRIMERO. NO MODIFIQUES TODAVÍA.

Antes de escribir código, inspecciona todo el flujo relacionado con:

* `HybridIntentClassifier`
* `VERIFY_INVESTIGATION`
* tool selection
* agent runtime
* tool execution
* `verify_claim`
* `get_active_investigation`
* `get_investigation_details`
* `calculate_matrix`
* `web_research`
* `ResponseValidator`
* `novai_evidence`
* `novai_agent_runs`
* persistencia de conversaciones
* streaming
* lifecycle de mensajes
* estado de la conversación
* cualquier componente que pueda reemplazar la respuesta final
* cualquier mecanismo de retry/fallback

Busca también:

```text
INSUFFICIENT_EVIDENCE
R12
R3
verify_claim
novai_evidence
epistemic
novai_agent_runs
```

Necesito que identifiques:

### A. Quién decide que `verify_claim` es obligatoria.

### B. Quién ejecuta realmente `verify_claim`.

### C. Quién determina si `verify_claim` tuvo éxito.

### D. Qué estructura devuelve `verify_claim`.

### E. Cómo se transforma ese resultado antes de llegar al validator.

### F. Quién genera `INSUFFICIENT_EVIDENCE`.

### G. Quién reemplaza la respuesta generada por el agente.

### H. Qué ocurre con la respuesta anterior cuando `ResponseValidator` decide `INSUFFICIENT_EVIDENCE`.

### I. Por qué `web_research` devuelve resultados pero no consigue persistirlos.

### J. Por qué `novai_agent_runs` viola RLS.

No asumas nada.

Busca el código real.

---

# 2. BUG CRÍTICO: verify_claim

Los logs muestran:

```text
selectedTools:
[
  get_active_investigation,
  get_investigation_details,
  verify_claim,
  calculate_matrix,
  web_research
]
```

pero:

```text
ResponseValidator:
Faltan herramientas obligatorias:
verify_claim
```

Esto indica una inconsistencia entre:

```text
tool selected
```

y:

```text
tool successfully executed
```

Necesito que encuentres la causa exacta.

Comprueba si existe alguno de estos problemas:

* el modelo nunca llama `verify_claim`
* la tool no está realmente disponible al runtime
* la tool recibe argumentos inválidos
* la tool falla silenciosamente
* el resultado no se registra
* el resultado se pierde durante streaming
* el resultado tiene una estructura incompatible con el tracker
* el tracker no reconoce el resultado
* el validator está mirando una fuente de estado distinta
* se está marcando como ejecutada en un lugar pero no en otro
* el nombre de la tool no coincide
* el resultado se genera pero se descarta
* el modelo decide hacer `web_research` pero no `verify_claim`
* el runtime tiene un problema de tool-calling con el modelo seleccionado

Corrige la causa raíz.

NO hagas esto:

```ts
if (intent === "VERIFY_INVESTIGATION") {
   assumeVerifyClaimSucceeded = true;
}
```

Eso sería un parche incorrecto.

La única forma válida de considerar `verify_claim` exitosa debe ser a partir de su **resultado real**.

---

# 3. BUG CRÍTICO: web_research FUNCIONA PERO LA EVIDENCIA NO SE PERSISTE

Los logs son inequívocos:

```text
web_research executed
providerUsed: tavily
resultsCount: 5
```

pero:

```text
Could not find the 'epistemic' column
of 'novai_evidence' in the schema cache
```

Posteriormente se repite varias veces.

Quiero que inspecciones:

* migraciones
* schema SQL
* tipos TypeScript
* repository/service de evidencia
* función de persistencia
* payload generado por `web_research`
* columnas realmente existentes
* cualquier trigger
* RLS
* índices
* relaciones
* nombres de columnas
* tipos JSON
* cache/schema de Supabase

Determina si el problema es:

```text
código nuevo ≠ migración aplicada
```

o:

```text
migración ≠ código
```

o:

```text
contrato de datos inconsistente
```

o una combinación.

No cambies simplemente el código para eliminar `epistemic`.

Primero determina si `epistemic` es conceptualmente necesario para el modelo epistemológico/evidencial de NovAi.

Si lo es, debe existir correctamente en el schema.

Si no lo es, elimina su uso de manera consistente de todo el código.

Debe existir **un único contrato canónico**.

Después verifica:

```text
migration
↓
Supabase schema
↓
TypeScript types
↓
repository
↓
tool result
↓
validator
```

Todo debe estar alineado.

---

# 4. MUY IMPORTANTE: FALLO DE PERSISTENCIA NO SIGNIFICA "NO EXISTE EVIDENCIA"

Este es uno de los bugs conceptuales más importantes.

Actualmente parece ocurrir:

```text
Tavily devuelve evidencia
       ↓
fallo guardando evidencia
       ↓
validator interpreta:
"No hay evidencia"
       ↓
INSUFFICIENT_EVIDENCE
```

Eso es incorrecto.

Debe distinguirse:

### Caso A

```text
No se encontraron resultados externos
```

de:

### Caso B

```text
Se encontraron resultados externos
pero falló la persistencia
```

de:

### Caso C

```text
Se encontraron resultados
y se persistieron correctamente
```

de:

### Caso D

```text
La búsqueda web falló completamente
```

de:

### Caso E

```text
La tool no fue ejecutada
```

Estos estados NO son equivalentes.

Por ejemplo:

```ts
evidenceStatus:
  | "NONE_FOUND"
  | "FOUND_NOT_PERSISTED"
  | "PERSISTED"
  | "SEARCH_FAILED"
  | "TOOL_NOT_EXECUTED"
```

No necesariamente tienes que utilizar exactamente esos nombres; utiliza la arquitectura que corresponda al código existente.

Pero conceptualmente deben distinguirse.

---

# 5. RESPONSE VALIDATOR NO DEBE BORRAR UNA RESPUESTA VÁLIDA

Este es probablemente el bug más visible para el usuario.

Actualmente ocurre:

```text
modelo genera respuesta
        ↓
validator
        ↓
INSUFFICIENT_EVIDENCE
        ↓
respuesta anterior desaparece
        ↓
UI muestra otra respuesta
```

Eso es peligrosísimo.

El validator puede:

* bloquear una respuesta que todavía no debe publicarse
* solicitar retry
* degradar el nivel de confianza
* añadir una advertencia
* marcar la ejecución como incompleta

Pero **no debe destruir silenciosamente una respuesta ya generada y presentada al usuario**.

Diseña claramente el lifecycle:

```text
GENERATING
TOOLS_RUNNING
EVIDENCE_COLLECTED
MODEL_RESPONSE_READY
VALIDATING
FINALIZED
```

Si existe streaming:

```text
STREAMING
```

debe tener reglas explícitas.

Necesito que determines si actualmente la UI está mostrando un mensaje provisional y posteriormente otro estado reemplaza ese mensaje.

Si es así, corrígelo.

---

# 6. VALIDATION DEBE EVALUAR EL RESULTADO REAL, NO SOLO LA LISTA DE TOOLS

No quiero:

```ts
requiredTools.every(tool => executedTools.includes(tool))
```

como única condición de validez.

Porque:

```text
tool ejecutada ≠ evidencia suficiente
```

Pero tampoco quiero:

```text
tool no persistida = tool fallida
```

automáticamente.

El validator debe trabajar con un execution ledger real.

Por ejemplo conceptualmente:

```ts
{
  tool: "web_research",
  selected: true,
  called: true,
  succeeded: true,
  resultAvailable: true,
  evidenceCount: 8,
  persisted: false,
  persistenceError: "...",
}
```

y:

```ts
{
  tool: "verify_claim",
  selected: true,
  called: true,
  succeeded: true,
  resultAvailable: true,
}
```

A partir de eso debe determinar qué puede afirmar NovAi.

---

# 7. VERIFY_INVESTIGATION DEBE TENER UN CONTRATO EXPLÍCITO

Define y documenta qué significa una ejecución válida de:

```text
VERIFY_INVESTIGATION
```

Por ejemplo:

```text
1. Identificar investigación activa.
2. Obtener detalles.
3. Obtener evidencia interna relevante.
4. Ejecutar verificación de claims relevantes.
5. Si el usuario solicita respaldo externo, realizar web research.
6. Evaluar evidencia.
7. Detectar contradicciones.
8. Calcular/validar métricas necesarias.
9. Formular conclusión.
10. Indicar nivel de confianza y sus límites.
```

No necesariamente tienes que utilizar exactamente esta secuencia.

Primero estudia las tools existentes y adapta el contrato a la arquitectura real.

Pero debe existir una definición clara.

---

# 8. REVISAR TOOL SELECTION

Actualmente:

```text
excludedTools:
[
 search_evidence,
 get_factor_evidence,
 audit_factor,
 audit_relationship,
 find_contradictions,
 validate_methodology,
 ...
]
```

Quiero que determines si esto tiene sentido para:

```text
VERIFY_INVESTIGATION
```

Especialmente porque la consulta del usuario pide:

> respaldo del grado de confianza de la investigación.

Eso parece requerir más que simplemente:

```text
get_active_investigation
get_investigation_details
verify_claim
calculate_matrix
web_research
```

Evalúa qué tools son realmente necesarias para verificar confianza metodológica.

No quiero que simplemente agregues todas las tools.

Quiero **mínimo conjunto suficiente y determinista**.

---

# 9. NO CONFUNDIR "GRADO DE CONFIANZA" CON "EVIDENCIA EXTERNA"

La respuesta anterior de NovAi mezcla:

```text
confidence
external evidence
methodological confidence
strategic diagnosis confidence
```

Necesito que revises el modelo conceptual.

Si NovAi afirma:

> "La investigación tiene 87% de confianza"

debe poder explicar:

```text
qué representa ese porcentaje
cómo se calcula
qué evidencia lo soporta
qué factores lo aumentan
qué factores lo reducen
qué incertidumbres permanecen
```

No debe inventar un nivel de confianza porque encontró noticias que parecen apoyar la investigación.

La evidencia externa puede:

```text
corroborar
contradecir
contextualizar
```

pero no necesariamente demostrar la validez causal de un factor interno.

Esto debe quedar reflejado en el flujo.

---

# 10. REVISAR EL CASO DE LA INVESTIGACIÓN FCBC

La investigación activa relevante es:

```text
FCBC
```

En respuestas anteriores NovAi afirmó cosas como:

```text
D-01 = 1.0
D-02 = 1.0
O-01 = 4.0
O-02 = 4.0
```

y posteriormente intentó usar evidencia externa para afirmar que dichas puntuaciones estaban "altamente justificadas".

Quiero que revises el código para impedir este razonamiento defectuoso.

Una fuente externa que diga:

```text
hubo una reforma salarial
```

NO demuestra automáticamente:

```text
D-01 = 1.0
```

Y tampoco demuestra:

```text
D-02 = 1.0
```

La relación debe ser epistemológicamente correcta.

Debe distinguir:

```text
HECHO EXTERNO
↓
corrobora contexto
```

de:

```text
EVIDENCIA INTERNA
↓
soporta factor interno
```

de:

```text
INFERENCIA
↓
relaciona ambos
```

de:

```text
CAUSALIDAD
↓
requiere evidencia específica
```

---

# 11. CORREGIR novai_agent_runs / RLS

También aparece:

```text
Failed to persist novai_agent_runs
new row violates row-level security policy
```

Audita:

* migraciones
* policies
* ownership
* tenant_id
* user_id
* auth.uid()
* service role usage
* server-side client
* transaction boundaries

Determina cuál es el modelo correcto.

No desactives RLS.

No utilices una policy:

```text
USING (true)
```

como parche.

La persistencia debe respetar:

```text
tenant isolation
user authorization
auditability
```

Si la escritura debe realizarse mediante un backend/service-role controlado, implementa el patrón correcto y documenta por qué.

---

# 12. REVISAR HTTP 200

Actualmente:

```text
POST /api/novai/chat 200
```

aunque internamente existen errores críticos.

Determina si HTTP 200 es correcto.

Diferencia entre:

```text
respuesta válida pero evidencia incompleta
```

y:

```text
fallo interno del pipeline
```

No quiero que un fallo crítico de infraestructura sea presentado como si simplemente no hubiera evidencia.

---

# 13. REDUCIR EL TIEMPO DE RESPUESTA

Actualmente:

```text
POST /api/novai/chat
~81-85 segundos
```

La ejecución debe analizarse.

Identifica:

* llamadas seriales innecesarias
* retries
* tool calls duplicadas
* llamadas web repetidas
* persistencia repetida
* billing/quota innecesario
* validaciones duplicadas
* timeouts
* fallback de modelos
* streaming bloqueado

No optimices a ciegas.

Primero construye un timeline:

```text
t0 classifier
t1 tool selection
t2 get_active_investigation
t3 get_investigation_details
t4 verify_claim
t5 web_research
t6 persistence
t7 model
t8 validator
t9 final response
```

Luego identifica el cuello de botella.

---

# 14. MODEL ROUTING

También observa:

```text
recommendedModel:
openrouter/free
```

y anteriormente ocurrió:

```text
mistralai/mistral-small-24b-instruct-2501:free
```

que fue rechazado por OpenRouter porque el modelo free dejó de estar disponible.

Quiero que revises el sistema de fallback.

Debe existir:

```text
modelo seleccionado
↓
provider/model realmente utilizado
↓
error
↓
fallback
↓
modelo final
```

y el runtime debe registrar claramente cuál terminó produciendo la respuesta.

No puede depender de un slug free obsoleto sin fallback robusto.

---

# 15. INSTRUMENTACIÓN

Amplía la instrumentación para que un run pueda reconstruirse completamente.

Necesito poder responder:

> ¿Por qué NovAi dijo esto?

a partir de logs/datos estructurados.

Como mínimo:

```text
runId
intent
intentConfidence
selectedTools
toolExecutionStatus
toolCallId
toolStart
toolEnd
toolDuration
toolResultStatus
evidenceCount
evidencePersistenceStatus
validationStatus
validationFindings
model
provider
fallbacks
finalResponseStatus
conversationMessageId
```

Sin almacenar innecesariamente contenido sensible.

Mantén:

```text
tenant isolation
PII minimization
security
```

---

# 16. NO CAMBIAR LA UI SIN NECESIDAD

La prioridad es corregir el backend/orquestador.

No quiero que resuelvas el problema simplemente modificando la UI para ocultar:

```text
INSUFFICIENT_EVIDENCE
```

La UI debe recibir un estado correcto.

---

# 17. PRUEBAS OBLIGATORIAS

Después de corregir, crea pruebas reproducibles para al menos estos casos:

### TEST 1 — VERIFY normal

```text
verify_claim succeeds
web_research succeeds
evidence persistence succeeds
validator passes
```

Resultado:

```text
respuesta final normal
```

### TEST 2 — web search sin resultados

```text
web_research succeeds
resultsCount = 0
```

Resultado:

```text
respuesta honesta indicando ausencia de evidencia externa
```

### TEST 3 — web search con resultados pero persistence failure

```text
resultsCount > 0
persistence fails
```

Resultado:

```text
NO decir "no existe evidencia"
```

Debe decir conceptualmente:

```text
"Se encontraron fuentes externas, pero no fue posible persistirlas/verificarlas
completamente, por lo que no puedo otorgarles el mismo nivel de trazabilidad."
```

### TEST 4 — verify_claim realmente falla

Resultado:

```text
respuesta degradada/incompleta
```

pero sin inventar que fue ejecutada exitosamente.

### TEST 5 — validator falla

El validator NO debe borrar una respuesta ya producida.

### TEST 6 — RLS

`novai_agent_runs` debe persistir correctamente respetando tenant isolation.

### TEST 7 — nueva conversación

La respuesta no debe desaparecer al crear/refrescar la conversación.

### TEST 8 — refresh/F5

Después de F5:

```text
historial
mensajes
estado
respuesta
```

deben permanecer correctamente sincronizados.

---

# 18. CRITERIO DE ACEPTACIÓN PRINCIPAL

La siguiente secuencia debe funcionar:

```text
Usuario:
"¿Puedes repetir otra vez a ver si encuentras información
que respalde el grado de confianza de la investigación?"

↓

VERIFY_INVESTIGATION

↓

identifica correctamente FCBC

↓

obtiene datos reales

↓

verifica claims reales

↓

realiza búsqueda Tavily

↓

obtiene fuentes

↓

clasifica epistemológicamente las fuentes

↓

persiste evidencia correctamente

↓

calcula/evalúa confianza

↓

valida la respuesta

↓

publica UNA respuesta final

↓

la respuesta permanece en el historial

↓

F5 no la elimina
```

Y si una dependencia falla:

```text
Tavily falla
```

o:

```text
persistencia falla
```

o:

```text
verify_claim falla
```

NovAi debe indicar exactamente qué parte quedó sin verificar.

Nunca debe transformar:

```text
"falló la persistencia"
```

en:

```text
"no existe evidencia"
```

ni:

```text
"no se encontraron resultados"
```

---

# 19. REGLA FUNDAMENTAL

NO quiero una solución basada en aumentar prompts.

NO quiero otra regla textual del tipo:

```text
"Si X entonces haz Y"
```

si el problema real está en el runtime.

La solución debe estar principalmente en:

```text
arquitectura
contracts
execution state
tool orchestration
result tracking
validation
persistence
error handling
```

El prompt debe expresar el comportamiento, pero **no debe ser responsable de controlar estados que el software puede determinar de forma objetiva**.

---

# 20. ENTREGA FINAL

Antes de modificar:

1. Enumera los archivos relevantes encontrados.
2. Explica el flujo actual real.
3. Identifica cada bug con causa raíz.
4. Diferencia bugs de arquitectura, bugs de implementación y problemas de DB/RLS.
5. Explica por qué ocurre la desaparición de la respuesta.
6. Explica por qué `verify_claim` aparece como obligatoria pero el validator dice que no fue completada.
7. Explica el problema de `novai_evidence.epistemic`.
8. Explica el problema de RLS de `novai_agent_runs`.
9. Explica por qué el pipeline tarda ~80 segundos.
10. Propón el cambio mínimo de arquitectura necesario.

Después implementa las correcciones.

Al finalizar:

* ejecuta tests
* ejecuta lint/typecheck si existen
* ejecuta los tests específicos de NovAi
* verifica las migraciones
* verifica RLS
* verifica el flujo de conversación
* verifica persistencia
* verifica que no haya regresiones

Entrega:

```text
A. Diagnóstico
B. Causa raíz
C. Archivos modificados
D. Migraciones realizadas
E. Cambios de arquitectura
F. Tests ejecutados
G. Resultados
H. Riesgos pendientes
I. Evidencia de que VERIFY_INVESTIGATION ahora funciona correctamente
```

IMPORTANTE:

**No declares el trabajo terminado porque los logs "se vean mejor".**

El criterio de terminado es funcional:

> NovAi debe poder ejecutar VERIFY_INVESTIGATION, obtener evidencia real, verificarla, evaluar correctamente sus límites epistemológicos, producir una respuesta coherente y persistente, y no reemplazar/borrar esa respuesta debido a un fallo posterior del validator o de la persistencia.
