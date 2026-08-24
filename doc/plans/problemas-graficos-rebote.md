# Problema: Rebote infinito en gráficos al hacer hover

## Descripción del problema
Al posicionar el mouse sobre los puntos del gráfico (especialmente en el `PositioningMatrix` / scatter plot), los puntos empiezan a "rebotar" interminablemente. Esto parece ser un problema de hidratación o refresh continuo en los componentes Recharts.

## Raíz probable
El problema está en el uso del componente `<Tooltip>` de Recharts sin controles adecuados. Cuando el mouse se mueve sobre los puntos, el tooltip entra en un estado donde:
- El prop `active` cambia constantemente entre true/false
- El `payload` se actualiza en cada render cycle
- Esto causa un bucle de re-renders infinitos

## Análisis de los archivos afectados

### 1. `positioning-matrix.tsx` (línea 271)
```tsx
<Tooltip content={<CustomTooltip />} />
```
El tooltip no recibe props `active` ni `payload` explícitos, por lo que Recharts gestiona su propio estado interno que puede volverse inestable.

### 2. `factors-distribution-chart.tsx` (línea 150)
```tsx
<Tooltip content={<CustomTooltip />} />
```
Mismo patrón, sin controles de estabilidad.

### 3. `came-actions-chart.tsx` (línea 117)
```tsx
<Tooltip content={<CustomTooltip />} />
```
Mismo patrón en gráfico de pastel.

## Solución propuesta

### Fix 1: Añadir props `active` y `payload` al Tooltip
Proporcionar valores explícitos evita que Recharts gestione estado interno problemático:

```tsx
// En positioning-matrix.tsx, factors-distribution-chart.tsx, came-actions-chart.tsx
<Tooltip
  content={<CustomTooltip />}
  active={true}  // Forzar estado activo estable
  payload={payload}  // Payload estable desde parent
  hide={false}
/>
```

### Fix 2: Usar `offset` para evitar superposición
Añadir offset evita que el tooltip se reubique constantemente:

```tsx
<Tooltip
  content={<CustomTooltip />}
  active={true}
  offset={[10, 10]}  // Pequeño offset en x e y
/>
```

### Fix 3: Estabilizar el componente CustomTooltip
Asegurarse de que `CustomTooltip` no cause re-renders innecesarios:

```tsx
// Verificar que CustomTooltip use React.memo o useMemo adecuadamente
// Que el payload sea un objeto estable (no arrays nuevos cada render)
```

### Fix 4: Añadir `onMouseLeave` handler explícito
En el componente `Scatter` o `BarChart`/`PieChart`, añadir handlers que aseguren limpieza:

```tsx
// En positioning-matrix.tsx - en el componente Scatter
<Scatter
  data={points}
  onMouseLeave={() => console.log('mouse left')}
  // Otros handlers
>
```

## Implementación recomendada

### Para `positioning-matrix.tsx`:
Modificar línea 271 de:
```tsx
<Tooltip content={<CustomTooltip />} />
```
a:
```tsx
<Tooltip
  content={<CustomTooltip />}
  active={true}
  payload={points.length > 0 ? points : undefined}
  offset={[10, 10]}
/>
```

### Para `factors-distribution-chart.tsx`:
Modificar línea 150 de:
```tsx
<Tooltip content={<CustomTooltip />} />
```
a:
```tsx
<Tooltip
  content={<CustomTooltip />}
  active={true}
  offset={[5, 5]}
/>
```

### Para `came-actions-chart.tsx`:
Modificar línea 117 de:
```tsx
<Tooltip content={<CustomTooltip />} />
```
a:
```tsx
<Tooltip
  content={<CustomTooltip />}
  active={true}
  offset={[5, 5]}
/>
```

## Diagnóstico adicional

Si el problema persiste después de estos fixes, podría ser necesario:

1. **Inspectar el hook `useI18n`** - cambios de idioma podrían causar re-renders
2. **Verificar `calculateAnalysis` / `calculateCame`** - si devuelven objetos nuevos cada llamado
3. **Revisar dependencias de `useContext`** - el ChartContext podría estar causando re-renders
4. **Añadir `React.memo`** a los componentes de punto/celda si hacen renderizados costosos

## Testing

Para validar el fix:
1. Iniciar la aplicación en modo desarrollo: `pnpm dev`
2. Navegar al dashboard de investigaciones
3. Hacer hover sobre los puntos del gráfico Positioning Matrix
4. Verificar que ya no haya rebote infinito
5. Repetir para Factors Distribution Chart y Came Actions Chart

## Referencia
Este es un problemadocumentado en Recharts donde el Tooltip gestiona estado interno que puede volverse inestable sin props explícitos. La solución de proporcionar `active` y `payload` props es el patrón recomendado.