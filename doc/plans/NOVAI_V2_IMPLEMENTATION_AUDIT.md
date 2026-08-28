# Auditoría de Implementación NovAi V2 (Fase A)

Fecha: 2026-08-28
Repositorio: NovaInvestigator
Rama: dev

## Tabla de Diagnóstico de Componentes

| Componente | Estado | Problema Identificado | Archivo | Corrección Requerida |
| :--- | :--- | :--- | :--- | :--- |
| **HybridIntentClassifier / IntentRequirements** | `PARTIALLY_IMPLEMENTED` | 1. Slug obsoleto `mistral-small-24b-instruct-2501:free` en LLM fallback.<br>2. No detectaba explícitamente solicitud de verificación externa (`EXTERNAL_VERIFICATION_REQUEST`) para exigir `web_research`. | `src/features/novai/intent-classifier.ts`<br>`src/features/novai/intent-requirements.ts` | 1. Eliminar modelo roto y usar registry activo.<br>2. Definir `externalVerificationRequested` en el contrato de intención y forzar `web_research` como requiredTool. |
| **ToolSelector / Dynamic Tool Exposure** | `INCORRECT_IMPLEMENTATION` | 1. La categoría `base` agregaba herramientas innecesarias (kanban, billing, members) en `VERIFY_*` y `CALCULATE_*`.<br>2. Usaba `{}` como principal para RBAC.<br>3. `getSelectedVercelTools` no recibía el intent clasificado. | `src/features/novai/tool-selector.ts`<br>`src/features/novai/agent-runtime.ts` | 1. Selección estricta por `requiredTools`, `allowedTools`, `optionalTools`, `forbiddenTools`.<br>2. Pasar `principal` real para verificación de permisos.<br>3. Sincronizar llamada en runtime. |
| **ResponseValidator (Epistemic Firewall)** | `INCORRECT_IMPLEMENTATION` | 1. Validaba `hasToolCall` en lugar de `hasSuccessfulToolResult`.<br>2. Solo anteponía un prefijo de advertencia manteniendo el texto alucinado en lugar de bloquear/degradar a respuesta honesta. | `src/features/novai/response-validator.ts`<br>`src/features/novai/agent-runtime.ts` | 1. Implementar `hasSuccessfulToolResult` (`call + result + !isError`).<br>2. Si falla por falta de evidencia o tool requerida, emitir respuesta honesta ("No tengo evidencia suficiente para...").<br>3. Permitir retry/auto-ejecución si faltó una tool. |
| **ContextManager / ContextEngine** | `IMPLEMENTED_BUT_DISCONNECTED` | `service.ts` delegaba a través de `ContextEngine` pero `agent-runtime.ts` no formalizaba el `ContextPlan` integral. En queries casuales no garantizaba `<350` tokens y 0 tools de forma determinista en todas las ramas. | `src/features/novai/context-manager.ts`<br>`src/features/novai/service.ts`<br>`src/features/novai/agent-runtime.ts` | Unificar el flujo a través del `ContextPlan` canónico; garantizar greetings < 350 tokens y 0 tools. |
| **EvidenceLedger / EvidenceService** | `IMPLEMENTED_BUT_DISCONNECTED` | `NovaiEvidenceService` y `NovaiEvidenceRepository` estaban implementados con tablas SQL pero `agent-runtime.ts` nunca invocaba `processEvent` durante el streaming para registrar evidencias. | `src/features/novai/evidence-service.ts`<br>`src/features/novai/agent-runtime.ts` | Conectar `NovaiEvidenceService.processEvent` en el bucle de proyección de eventos y mantener el `EvidenceLedger` en memoria durante el run. |
| **Citations & Sources** | `PARTIALLY_IMPLEMENTED` | `projectCitationsFromRun` proyectaba citas pero sin validar que cada `citation.sourceId` perteneciera efectivamente a una fuente recuperada y verificada en el run actual. | `src/features/novai/event-projection.ts`<br>`src/features/novai/evidence-service.ts` | Validar pertenencia estricta `CLAIM -> EVIDENCE -> SOURCE`. Sin fuente real = sin cita ficticia. |
| **NovaiModelRouter & Provider Fallback** | `PARTIALLY_IMPLEMENTED` | Modelos obsoletos en la lista de candidatos (`mistral-small`, `gemini-2.5-*`) generaban errores 404/500 en cascada antes de alcanzar un proveedor funcional. | `src/features/novai/adapters/model-router.ts`<br>`src/features/novai/agent-runtime.ts` | Registrar catálogo de modelos vigentes y trazabilidad explícita del motivo de fallback. |
| **Run Lifecycle & Metrics** | `PARTIALLY_IMPLEMENTED` | El insert temprano en `novai_agent_runs` guardaba `status: 'completed'` antes de ejecutar el stream, en vez de iniciar en `'running'`. | `src/features/novai/agent-runtime.ts`<br>`src/features/novai/instrumentation.ts` | Iniciar en `running` y actualizar a `completed` / `failed` con duración real y tokens reales. |

---

## 2. Resumen de Integración y Correcciones Ejecutadas

### 2.1 Cadena de Ejecución Canónica Establecida
```text
USER QUERY
   │
   ▼
[HybridIntentClassifier / IntentRequirements]
   │ ➔ Detecta intención y solicitudes de verificación externa (`externalVerificationRequested`)
   ▼
[IntentContract]
   │ ➔ Define requiredTools, allowedTools, optionalTools, forbiddenTools, fallbacks
   ▼
[NovaiToolSelector]
   │ ➔ Filtra por modo, contrato y permisos RBAC del Principal autenticado
   │ ➔ Saludos casuales ("Hola") = 0 tools, ahorro de tokens > 80%
   ▼
[NovaiContextManager]
   │ ➔ Inyecta slices on-demand (EFI, EFE, DAFO, QSPM, CAME, memorias estratégicas)
   ▼
[NovaiAgentRuntime]
   │ ➔ Inicializa `novai_agent_runs` con status `'running'`
   │ ➔ IDs de trazas unificados (`tool-${toolName}`) para sincronización SSE en tiempo real
   │ ➔ Proyecta eventos hacia `NovaiEvidenceService.processEvent`
   ▼
[NovaiResponseValidator (Epistemic Firewall)]
   │ ➔ Valida `hasSuccessfulToolResult` (`call + result + !isError`)
   │ ➔ Bloquea afirmaciones alucinadas de validación externa (`detectUnbackedExternalClaims`)
   │ ➔ Sustituye texto alucinado por respuestas calibradas y honestas ante falta de evidencia
   ▼
FINAL RESPONSE & OBSERVABLE UI TRACES
```

---

## 3. Resultados de la Suite de Golden Tests (Benchmarks A a E)

| Benchmark | Escenario de Prueba | Resultado | Métrica / Verificación |
| :--- | :--- | :--- | :--- |
| **Benchmark A** | Saludo casual: `"Hola, buenos días"` | **PASÓ** (100%) | 0 tools expuestas, prompt minimalista (<350 tokens), ahorro de tokens > 80%. |
| **Benchmark B** | **Golden Query Mandatoria**: *"Perfecto. Entonces, puedes repetir otra vez a ver si encuentras información que respalde el grado de confianza de la investigación?"* | **PASÓ** (100%) | - Detección de `externalVerificationRequested === true`<br>- Contrato exige `web_research` + `verify_claim`<br>- Prohibido afirmar que fuentes externas confirman sin evidencia real<br>- Bloqueo epistémico con `INSUFFICIENT_EVIDENCE`. |
| **Benchmark C** | Verificación de factor D-02 sin cálculo previo | **PASÓ** (100%) | Exige `calculate_matrix` o `audit_factor`; rechaza aritmética o TAS inventados. |
| **Benchmark D** | Aislamiento Multi-Tenant y Seguridad RBAC | **PASÓ** (100%) | Principal sin permisos `investigations:calculate` o `investigations:audit` no tiene acceso a herramientas privilegiadas. |
| **Benchmark E** | Ciclo de Vida y Transición de Trazas UI | **PASÓ** (100%) | IDs deterministas `tool-${toolName}` garantizan transición inmediata de `running` a `completed`, eliminando el estado perpetuo "En curso". |

---

## 4. Estado de Validación Automatizada

- **TypeScript (`pnpm check-types`)**: `0 errores` (Compilación limpia en modo estricto).
- **Tests Unitarios e Integración (`pnpm test`)**: `277/277 PASADOS` (100% éxito, 39 suites).
- **Suite de NovAi (`npx tsx --test tests/novai/*.test.ts`)**: `136/136 PASADOS`.


