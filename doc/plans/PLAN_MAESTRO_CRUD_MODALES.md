# Plan Maestro: CRUD Completo + Edición Exclusiva en Modal

**Proyecto:** Análisis Estratégico EFI/EFE/DAFO/QSPM/CAME  
**Documento:** Plan de implementación CRUD y mejora de UX  
**Estado:** Aprobado para implementación  
**Fecha:** 2026-08-02  
**Alcance:** Create, Read, Update (modal), Delete en todos los módulos + escala de calificación definida

---

## 1. Problemas Identificados

### 1.1. Factores hardcodeados (no CRUD)
- `domain.js:51-75` — Los arrays `INTERNAL_FACTORS` y `EXTERNAL_FACTORS` están hardcodeados con 5 elementos cada uno
- No existen funciones `addFactor()` ni `deleteFactor()` en todo el dominio
- `createBlankState()` solo limpia los factores predefinidos, no permite crear nuevos

### 1.2. Falta de funciones CRUD en el Contexto
- `AnalysisContext.jsx:59` — Solo existe `updateFactor()` para editar
- No se exponen `addFactor` ni `deleteFactor` en el Provider

### 1.3. UI sin botones de agregar/eliminar
- `efi/index.jsx` y `efe/index.jsx` — No hay botones "+" ni "×" en la tabla
- Solo se renderizan los factores que ya existen en el estado

### 1.4. Calificaciones sin significado
- Los selects de calificación muestran solo "1", "2", "3", "4" sin descripción
- `HelpModal.jsx:6-7` — Solo dice "Calificación: 1 a 4" sin definir cada nivel
- No hay tooltips ni leyenda visual

### 1.5. Edición inline no deseada
- Todos los módulos permiten edición directa en celda
- El usuario requiere edición exclusiva en modal

### 1.6. Cascada a otros módulos
- **DAFO**: Depende de factores EFI/EFE → limitado a 5×5
- **QSPM**: 6 estrategias hardcodeadas en `domain.js:77-126`
- **CAME**: 20 acciones generadas automáticamente de los 20 factores fijos

---

## 2. Decisiones de Diseño

| Decisión | Valor |
|----------|-------|
| Edición | **Solo modal** — nada de inline en tabla |
| Reordenar | **Botones ↑↓ en la columna de acciones de la tabla** |
| Eliminación | **Modal de alerta de confirmación** |
| Límite de factores | **Sin límite** |
| Calificaciones | **Labels descriptivos (1=Débil, 2=Aceptable, etc.)** |
| Módulos afectados | EFI, EFE, QSPM, CAME |

---

## 3. Fase 1: Constantes y Escala de Calificación

### 3.1. Archivo: `src/app/constants.js`

Agregar constante `RATING_SCALE`:

```js
export const RATING_SCALE = {
  internal: [
    { value: 1, label: '1 — Débil', description: 'Capacidad interna muy limitada o ausente' },
    { value: 2, label: '2 — Aceptable', description: 'Funciona pero con limitaciones claras' },
    { value: 3, label: '3 — Sólido', description: 'Buen nivel, cumple expectativas' },
    { value: 4, label: '4 — Excelente', description: 'Fortaleza diferenciadora y documentada' }
  ],
  external: [
    { value: 1, label: '1 — Muy pobre', description: 'La organización no responde ante este factor' },
    { value: 2, label: '2 — Moderada', description: 'Respuesta parcial, requiere mejora' },
    { value: 3, label: '3 — Buena', description: 'Respuesta efectiva y documentada' },
    { value: 4, label: '4 — Muy eficaz', description: 'Respuesta sobresaliente ante el entorno' }
  ]
};
```

### 3.2. Archivo: `src/components/HelpModal.jsx`

Expandir las secciones `efi` y `efe` con tabla de la escala completa.

---

## 4. Fase 2: Funciones de Dominio (CRUD)

### 4.1. Archivo: `src/domain.js`

#### Create — Factores

```js
export const createNewFactor = (factors, type) => {
  const prefix = type;
  const existingNumbers = factors
    .filter(f => f.type === type)
    .map(f => parseInt(f.id.split('-')[1]))
    .filter(n => !isNaN(n));
  const nextNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
  const id = `${prefix}-${String(nextNum).padStart(2, '0')}`;
  return {
    id,
    name: '',
    type,
    group: type === 'F' || type === 'D' ? 'internal' : 'external',
    weight: 0,
    rating: 1,
    description: '',
    evidence: ''
  };
};
```

#### Delete — Factores

```js
export const removeFactor = (state, factorId) => {
  const isInternal = state.internal.some(f => f.id === factorId);
  const group = isInternal ? 'internal' : 'external';
  const newFactors = state[group].filter(f => f.id !== factorId);
  const newRelationships = state.relationships.filter(
    r => r.internalId !== factorId && r.externalId !== factorId
  );
  return {
    ...state,
    [group]: newFactors,
    relationships: newRelationships
  };
};
```

#### Reordenar — Factores

```js
export const reorderFactor = (factors, factorId, direction) => {
  const idx = factors.findIndex(f => f.id === factorId);
  if (idx < 0) return factors;
  const newIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (newIdx < 0 || newIdx >= factors.length) return factors;
  const copy = [...factors];
  [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
  return copy;
};
```

#### Create/Delete — Estrategias QSPM

```js
export const createNewStrategy = (strategies) => {
  const num = strategies.length + 1;
  return {
    id: `EST-${String(num).padStart(2, '0')}`,
    name: `Alternativa ${String(num).padStart(2, '0')}`,
    quadrant: 'DO',
    orientation: 'adaptativa',
    description: '',
    relatedFactors: [],
    observations: ''
  };
};

export const removeStrategy = (state, strategyId) => ({
  ...state,
  strategies: state.strategies.filter(s => s.id !== strategyId),
  selectedStrategyId: state.selectedStrategyId === strategyId ? null : state.selectedStrategyId,
  qspmScores: Object.fromEntries(
    Object.entries(state.qspmScores).filter(([key]) => key !== strategyId)
  )
});
```

#### Create/Delete — Acciones CAME

```js
export const createNewCameAction = (factorId) => ({
  id: `ACC-${factorId}-${Date.now().toString(36).slice(-4)}`,
  type: 'C',
  factorId,
  factor: '',
  strategyId: '',
  problem: '',
  objective: '',
  action: '',
  responsible: '',
  participants: '',
  resources: [],
  startDate: '',
  endDate: '',
  indicator: '',
  baseline: '',
  target: '',
  frequency: 'Mensual',
  status: 'propuesta',
  criteria: { impact: 3, urgency: 3, severity: 3, alignment: 3, feasibility: 3 },
  justification: '',
  observations: ''
});

export const removeCameAction = (state, actionId) => ({
  ...state,
  cameActions: state.cameActions.filter(a => a.id !== actionId)
});
```

---

## 5. Fase 3: Estado Global (Context)

### 5.1. Archivo: `src/state/AnalysisContext.jsx`

Acciones a agregar al Provider (línea 298-333):

| Acción | Parámetros | Efecto |
|--------|------------|--------|
| `addFactor(group, type)` | group: 'internal'/'external', type: 'F'/'D'/'O'/'A' | Inserta factor al final |
| `deleteFactor(factorId)` | factorId: string | Elimina factor + relationships |
| `reorderFactor(group, factorId, direction)` | direction: 'up'/'down' | Mueve en el array |
| `changeFactorType(factorId, newType)` | newType: 'F'/'D'/'O'/'A' | Cambia tipo y group |
| `addStrategy()` | — | Inserta estrategia vacía |
| `deleteStrategy(strategyId)` | strategyId: string | Elimina estrategia + scores |
| `addCameAction()` | — | Inserta ficha vacía |
| `deleteCameAction(actionId)` | actionId: string | Elimina ficha |

Todas usan `commitState()` existente (línea 43) para mantener historial.

---

## 6. Fase 4: Componentes Modales Nuevos

### 6.1. `src/components/FactorEditorModal.jsx`

Modal reutilizado para EFI y EFE. Estructura:

```
┌─────────────────────────────────────────────┐
│ [eyebrow] F-01 · Fortaleza                  │
│ Editar factor                               │  [X]
├─────────────────────────────────────────────┤
│                                             │
│  Nombre        [____________________]       │
│  Tipo          [Fortaleza        ▼]         │
│  Ponderación   [0.06]  Calificación [3 ▼]   │
│  Descripción   [____________________]       │
│                [____________________]       │
│  Evidencia     [____________________]       │
│                [____________________]       │
│                                             │
│  Calificación: 3 — Sólido                   │
│  "Buen nivel, cumple expectativas"          │
│                                             │
├─────────────────────────────────────────────┤
│                        [Cancelar] [Guardar] │
└─────────────────────────────────────────────┘
```

- **Select de calificación**: Muestra labels de `RATING_SCALE` (ej: "3 — Sólido")
- **Debajo del select**: Descripción del nivel seleccionado
- **Tipo**: Select con F/D/O/A — al cambiar, se reasigna group automáticamente
- **Validación**: Nombre requerido, peso 0-1, calificación 1-4

### 6.2. `src/components/ConfirmDeleteModal.jsx`

Modal de alerta para confirmar eliminación:

```
┌──────────────────────────────────────┐
│ ⚠  Eliminar factor                   │  [X]
├──────────────────────────────────────┤
│ ¿Está seguro de eliminar F-01?       │
│ "Voluntad de la alta dirección"      │
│                                      │
│ Esta acción eliminará también las    │
│ 3 relaciones asociadas.              │
├──────────────────────────────────────┤
│             [Cancelar] [Eliminar]    │
└──────────────────────────────────────┘
```

- Muestra qué se va a eliminar (nombre del factor/estrategia/acción)
- Si tiene relaciones dependientes, las cuenta
- Botón "Eliminar" en color `brick` (rojo)
- Reutilizable para factores, estrategias y acciones CAME

### 6.3. `src/components/StrategyEditorModal.jsx`

Modal para editar estrategia QSPM:

```
┌─────────────────────────────────────────────┐
│ [eyebrow] EST-DO-01                         │
│ Editar alternativa estratégica              │  [X]
├─────────────────────────────────────────────┤
│  Nombre        [____________________]       │
│  Cuadrante     [DO · Adaptativa   ▼]        │
│  Descripción   [____________________]       │
│                [____________________]       │
│  Factores relacionados                      │
│  [D-08, O-01, O-02_________________]        │
│  Observaciones    [____________________]    │
│                   [____________________]    │
├─────────────────────────────────────────────┤
│                        [Cancelar] [Guardar] │
└─────────────────────────────────────────────┘
```

### 6.4. `src/components/AsScoreModal.jsx`

Modal para editar AS (Atractivo Relativo) en QSPM:

```
┌──────────────────────────────────────┐
│ [eyebrow] EST-DO-01 × F-01          │
│ Editar atractivo relativo            │  [X]
├──────────────────────────────────────┤
│                                      │
│  Factor: F-01 — Voluntad de la...   │
│  Estrategia: EST-DO-01               │
│                                      │
│  Atractivo relativo (AS)             │
│  [1] [2] [3] [4]                    │
│                                      │
│  TAS = peso × AS = 0.06 × 3 = 0.18  │
│                                      │
├──────────────────────────────────────┤
│             [Cancelar] [Guardar]     │
└──────────────────────────────────────┘
```

- Botones de selección visual 1-4
- Cálculo en tiempo real del TAS
- Reutilizable para las 120 celdas de QSPM

---

## 7. Fase 5: UI — EFI y EFE

### 7.1. Archivos: `src/app/(pages)/efi/index.jsx` y `efe/index.jsx`

Cambios en `FactorView` (ambos archivos comparten misma estructura):

**Toolbar** (línea 38-41):
- Agregar botón "＋ Fortaleza" y "＋ Debilidad" (en EFI)
- Agregar botón "＋ Oportunidad" y "＋ Amenaza" (en EFE)
- Estos botones llaman `addFactor(group, type)`

**Tabla** (línea 43-48):
- **Eliminar** columnas editables de Ponderación y Calificación
- **Mostrar** valores como texto formateado
- **Agregar** columna "Acciones" con:
  - Botón ✏️ (lápiz) → abre `FactorEditorModal`
  - Botones ↑ ↓ → llaman `reorderFactor`
  - Botón 🗑️ (papelera) → abre `ConfirmDeleteModal`

**FactorRow** (línea 58-69):
- Reemplazar inputs por texto clickeable
- Al hacer click en cualquier celda → abrir modal
- Agregar columna de acciones al final

**FactorList** (línea 71-73):
- Se mantiene como resumen de solo lectura

---

## 8. Fase 6: UI — QSPM

### 8.1. Archivo: `src/app/(pages)/qspm/index.jsx`

**Toolbar de strategies** (línea 27):
- Agregar botón "＋ Agregar alternativa"

**StrategyCard** (línea 44-46):
- Eliminar `<details>` con editor inline
- Al hacer click en la card → abrir `StrategyEditorModal`
- Agregar botón 🗑️ en la card → `ConfirmDeleteModal`

**QspmRow** (línea 40-41):
- El input de AS se convierte en texto clickeable
- Al hacer click → abrir `AsScoreModal`
- Mostrar cálculo TAS resultante

---

## 9. Fase 7: UI — CAME

### 9.1. Archivo: `src/app/(pages)/came/index.jsx`

**Toolbar** (línea 58):
- Agregar botón "＋ Nueva ficha"

**CameRow** (línea 71-74):
- Se mantiene botón "Ver ficha" → abre modal existente
- Agregar botón 🗑️ → `ConfirmDeleteModal`

**CameModal existente** (línea 59):
- Agregar botón "Eliminar" en el footer (junto a "Cancelar" y "Guardar")
- El draft ya soporta todos los campos necesarios

---

## 10. Fase 8: HelpModal — Escala de Calificación

### 10.1. Archivo: `src/components/HelpModal.jsx`

Expandir las pestañas `efi` y `efe`:

- Agregar tabla con la escala completa:

| Valor | EFI (Interno) | EFE (Externo) |
|-------|---------------|---------------|
| 1 | Débil / Insuficiente | Respuesta muy pobre |
| 2 | Aceptable / Regular | Respuesta moderada |
| 3 | Bueno / Sólido | Respuesta buena |
| 4 | Muy fuerte / Excelente | Respuesta muy eficaz |

- Actualizar `scale` en ambas pestañas para incluir las definiciones

---

## 11. Fase 9: CSS

### 11.1. Archivo: `src/styles.css`

Estilos a agregar/reutilizar:

| Estilo | Acción | Referencia |
|--------|--------|------------|
| `.factor-modal` | Reutilizar patrón de `.came-modal` | Línea 2657 |
| `.confirm-modal` | Estilo más compacto que `.came-modal` | Nuevo |
| `.strategy-modal` | Reutilizar patrón de `.came-modal` | Línea 2657 |
| `.as-modal` | Estilo compacto para AS | Nuevo |
| `.action-buttons` | Contenedor para ↑↓ ✏️ 🗑️ en tabla | Nuevo |
| `.action-btn` | Botón pequeño, fondo transparente | Nuevo |
| `.action-btn:hover` | Hover con `var(--teal-soft)` | Nuevo |
| `.btn-delete` | Color `var(--brick)` para eliminar | Nuevo |
| `.btn-delete:hover` | Hover con `var(--brick-soft)` | Nuevo |
| `.rating-preview` | Estilo para preview de calificación | Nuevo |

---

## 12. Archivos a Modificar (Resumen)

| # | Archivo | Cambio principal |
|---|---------|------------------|
| 1 | `src/app/constants.js` | Agregar `RATING_SCALE` |
| 2 | `src/domain.js` | 8 funciones CRUD nuevas |
| 3 | `src/state/AnalysisContext.jsx` | 8 acciones nuevas en Provider |
| 4 | `src/components/FactorEditorModal.jsx` | **Nuevo** — modal factores |
| 5 | `src/components/ConfirmDeleteModal.jsx` | **Nuevo** — alerta eliminación |
| 6 | `src/components/StrategyEditorModal.jsx` | **Nuevo** — modal estrategias |
| 7 | `src/components/AsScoreModal.jsx` | **Nuevo** — modal AS QSPM |
| 8 | `src/app/(pages)/efi/index.jsx` | UI con modal + CRUD |
| 9 | `src/app/(pages)/efe/index.jsx` | UI con modal + CRUD |
| 10 | `src/app/(pages)/qspm/index.jsx` | UI con modal + CRUD |
| 11 | `src/app/(pages)/came/index.jsx` | UI con modal + CRUD |
| 12 | `src/components/HelpModal.jsx` | Escala de calificación expandida |
| 13 | `src/styles.css` | Estilos de modales y acciones |

---

## 13. Orden de Ejecución

1. `constants.js` → RATING_SCALE
2. `domain.js` → Funciones CRUD
3. `AnalysisContext.jsx` → Acciones del contexto
4. `ConfirmDeleteModal.jsx` → Modal de alerta (reutilizable)
5. `FactorEditorModal.jsx` → Modal de factores
6. `StrategyEditorModal.jsx` → Modal de estrategias
7. `AsScoreModal.jsx` → Modal de AS QSPM
8. `efi/index.jsx` → UI actualizada
9. `efe/index.jsx` → UI actualizada
10. `qspm/index.jsx` → UI actualizada
11. `came/index.jsx` → UI actualizada
12. `HelpModal.jsx` → Documentación
13. `styles.css` → Estilos

---

## 14. Cascada y Recálculos

Todos los cambios de factores afectan:

| Módulo | Efecto |
|--------|--------|
| **EFI/EFE** | `calculateEfi`/`calculateEfe` recalculan totales |
| **DAFO** | `buildRelationships` regenera pares; `calculateRelations` recalcula índices |
| **QSPM** | `buildQspmScores` regenera matriz; `calculateQspm` recalcula TAS |
| **CAME** | `buildCameActions` regenera fichas; `calculateCame` recalcula prioridades |
| **Summary** | Métricas y trazabilidad se actualizan |

**Nota**: Los cálculos ya están reactivos vía `useMemo` en `AnalysisContext.jsx:38-39`. No se necesita código adicional para recálculos automáticos.

---

## 15. Criterios de Aceptación

- [ ] Se pueden crear factores nuevos (F, D, O, A) sin límite
- [ ] Se pueden eliminar factores con confirmación
- [ ] Se pueden reordenar factores con botones ↑↓
- [ ] Se puede cambiar el tipo de un factor (F↔D, O↔A)
- [ ] La edición de factores es exclusivamente en modal
- [ ] Las calificaciones muestran labels descriptivos
- [ ] Las estrategias QSPM se pueden crear, editar y eliminar
- [ ] Las acciones CAME se pueden crear, editar y eliminar
- [ ] Los AS de QSPM se editan en modal
- [ ] Los cálculos se actualizan automáticamente
- [ ] El HelpModal muestra la escala completa
- [ ] No hay errores de lint o typecheck
