# PLAN MAESTRO: FIX REBOTE INFINITO EN GRÁFICOS DASHBOARD

## Título
Fix rebote infinito en gráficos al hacer hover (Positioning Matrix, Factors Distribution, Came Actions)

## Contexto
Dashboard de investigaciones en NovaStore ERP / NovaInvestigator
- Next.js 16 + TypeScript + Supabase
- Multi-tenant SaaS
- Gráficos usando Recharts library

## Problema identificado
Al posicionar el mouse sobre puntos del gráfico, estos empiezan a "rebotar" interminablemente. Esto es causado por el componente `<Tooltip>` de Recharts que gestiona estado interno sin props explícitos de `active` y `payload`, provocando un ciclo de re-renders infinitos.

## Archivos afectados
1. `D:/03. MATRIZ DAFO/src/views/dashboards/investigations/components/positioning-matrix.tsx` (línea 271)
2. `D:/03. MATRIZ DAFO/src/views/dashboards/investigations/components/factors-distribution-chart.tsx` (línea 150)
3. `D:/03. MATRIZ DAFO/src/views/dashboards/investigations/components/came-actions-chart.tsx` (línea 117)

## Solución propuesta

### Fix A: positionining-matrix.tsx (scatter plot)
**Línea 271**: Cambiar de:
```tsx
<Tooltip content={<CustomTooltip />} />
```
A:
```tsx
<Tooltip
  content={<CustomTooltip />}
  active={true}
  payload={points.length > 0 ? points : undefined}
  offset={[10, 10]}
/>
```

### Fix B: factors-distribution-chart.tsx (bar chart)
**Línea 150**: Cambiar de:
```tsx
<Tooltip content={<CustomTooltip />} />
```
A:
```tsx
<Tooltip
  content={<CustomTooltip />}
  active={true}
  offset={[5, 5]}
/>
```

### Fix C: came-actions-chart.tsx (pie chart)
**Línea 117**: Cambiar de:
```tsx
<Tooltip content={<CustomTooltip />} />
```
A:
```tsx
<Tooltip
  content={<CustomTooltip />}
  active={true}
  offset={[5, 5]}
/>
```

## Verificación paso a paso

### Paso 1: Aplicar Fix A - positionining-matrix.tsx
- Modificar línea 271 del archivo
- Verificar que `points` esté en scope (es un array definido en la función componente)
- Confirmar que `CustomTooltip` acepta el prop `payload`

### Paso 2: Aplicar Fix B - factors-distribution-chart.tsx  
- Modificar línea 150 del archivo
- Verificar que `CustomTooltip` reciba el payload correctamente

### Paso 3: Aplicar Fix C - came-actions-chart.tsx
- Modificar línea 117 del archivo
- Verificar consistencia con los otros two fixes

### Paso 4: Testing
- Iniciar aplicación: `pnpm dev`
- Navegar al dashboard de investigaciones
- Hacer hover sobre puntos en Positioning Matrix → verificar que NO haya rebote
- Hacer hover sobre barras en Factors Distribution → verificar estabilidad
- Hacer hover sobre rebanadas en Came Actions → verificar comportamiento
- Repetir en diferentes secciones del dashboard

## Rollback plan
Si los fixes causan algún problema:
1. Revertir cambios en los 3 archivos
2. Verificar que los gráficos vuelvan a su estado original
3. Investigar causas alternativas si persiste el problema

## Dependencias
- No toca archivos original de chadcn (`src/components/ui/`)
- Los componentes CustomTooltip ya existen y son compatibles
- RechartsTooltip props `active` y `payload` son estándares de la librería

## Éxito criteria
- ✓ Hover sobre puntos de scatter plot ya no causa rebote infinito
- ✓ Hover sobre barras del bar chart es estable
- ✓ Hover sobre rebanadas del pie chart es estable
- ✓ Tooltips siguen funcionando (mostrando datos al hacer hover)
- ✓ No se degradó el rendimiento del dashboard