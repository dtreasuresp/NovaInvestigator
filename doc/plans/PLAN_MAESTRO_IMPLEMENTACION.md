# Plan maestro de implementación de la herramienta estratégica

**Proyecto:** Análisis Estratégico EFI/EFE/DAFO/CAME  
**Documento:** Especificación metodológica, funcional y técnica  
**Estado:** Propuesta para implementación futura  
**Fecha:** 2026-07-31  
**Alcance:** Rediseño de los cálculos, la recomendación estratégica, la priorización CAME, la selección QSPM, la trazabilidad y las exportaciones.

> Este documento es una especificación de trabajo. La aplicación no ha sido modificada como consecuencia de su creación.

---

## 1. Decisión metodológica central

La herramienta debe sugerir la **orientación estratégica dominante** que se desprende del análisis DAFO, pero no debe presentar esa orientación como una decisión definitiva e incuestionable.

El proceso tendrá dos niveles:

1. **Recomendación DAFO:** identifica el tipo de orientación que parece más coherente con las relaciones entre factores.
2. **Selección estratégica QSPM:** compara alternativas concretas y ayuda a elegir la estrategia que se llevará al plan de acción.

Esta separación resuelve una ambigüedad importante:

- DAFO responde: **¿qué orientación parece más adecuada?**
- QSPM responde: **¿cuál de las estrategias alternativas es más atractiva frente a los factores identificados?**
- CAME responde: **¿qué acciones, responsables, recursos, plazos e indicadores se necesitan?**

La aplicación sí debe mostrar una recomendación como “orientación DO: adaptativa o de reorientación”, “orientación FO: ofensiva”, “orientación FA: defensiva” u “orientación DA: supervivencia”. Lo que no debe hacer es confundir el cuadrante con una estrategia concreta ni elegirla solamente porque una fórmula automática produjo el número más alto.

### 1.1. Significado de las orientaciones

| Código | Orientación | Relación | Propósito principal | Tipo de respuesta habitual |
| --- | --- | --- | --- | --- |
| FO | Ofensiva, de crecimiento o expansión | Fortalezas + Oportunidades | Utilizar capacidades existentes para aprovechar oportunidades | Invertir, crecer, innovar, expandir |
| DO | Adaptativa, de reorientación o desarrollo | Debilidades + Oportunidades | Corregir limitaciones internas para poder aprovechar oportunidades | Integrar, desarrollar capacidades, automatizar, capacitar |
| FA | Defensiva | Fortalezas + Amenazas | Utilizar fortalezas para reducir o contener amenazas | Proteger, resistir, consolidar, mitigar |
| DA | Supervivencia, contención o defensiva restrictiva | Debilidades + Amenazas | Reducir vulnerabilidades y evitar que las amenazas comprometan la continuidad | Contener, priorizar, reducir exposición, establecer contingencias |

Los nombres pueden variar entre autores y organizaciones. La aplicación debe mostrar el nombre principal y, cuando sea útil, sus sinónimos para evitar que una diferencia terminológica parezca una diferencia metodológica.

### 1.2. Recomendación para el caso de estudio

Con los datos que ya se analizaron, la configuración actual produce aproximadamente:

- EFI: `2.13`.
- EFE: `2.34`.
- FO: `1.76`.
- FA: `0.53`.
- DO: `2.07`.
- DA: `0.62`.

La orientación provisional sería **DO, adaptativa o de reorientación**, porque la organización presenta debilidades internas importantes y, al mismo tiempo, existen oportunidades relacionadas con transformación digital, modernización, inteligencia artificial y mejora de la coordinación.

Esta conclusión es coherente con el diagnóstico de poca interrelación entre los procesos del Sistema de Trabajo con los Cuadros y sus Reservas. Sin embargo, en la versión nueva debe mostrarse como:

> Orientación DAFO sugerida: DO (adaptativa/reorientación). Requiere validar las relaciones entre factores y comparar las alternativas mediante QSPM antes de seleccionar la estrategia definitiva.

No se deben modificar pesos ni calificaciones para producir una orientación determinada.

---

## 2. Objetivos del rediseño

### 2.1. Objetivo general

Convertir la aplicación en una herramienta trazable de diagnóstico, recomendación, selección y seguimiento estratégico, distinguiendo entre cálculos metodológicos clásicos y reglas operativas configurables.

### 2.2. Objetivos específicos

- Mantener el cálculo clásico de EFI y EFE.
- Validar los pesos, las calificaciones y los datos incompletos antes de interpretar resultados.
- Garantizar que las filas, subtotales, gráficos, resúmenes y exportaciones utilicen la misma fuente de datos.
- Sustituir el cruce DAFO ciego por relaciones explícitas, seleccionables y justificables.
- Recomendar una orientación FO, DO, FA o DA con una explicación legible.
- Mostrar incertidumbre o empate cuando los resultados no permitan una recomendación clara.
- Incorporar QSPM para comparar estrategias concretas.
- Convertir CAME en un plan de acción con priorización multicriterio.
- Evitar que una debilidad grave sea clasificada como prioridad media solamente porque su calificación EFI es baja.
- Exportar los datos, fórmulas, supuestos, evidencias y decisiones metodológicas junto con los resultados.

### 2.3. Fuera de alcance de la primera versión

- No presentar el resultado como una certificación científica automática.
- No sustituir el juicio de expertos ni la validación del investigador.
- No afirmar que existe una fórmula universal de DAFO o CAME.
- No usar la herramienta para modificar datos con el propósito de forzar una estrategia.
- No convertir la puntuación de una matriz en una predicción estadística del desempeño futuro.

---

## 3. Fundamento metodológico

### 3.1. EFI y EFE

EFI y EFE son matrices cuantitativas de evaluación de factores. La secuencia clásica es:

1. Identificar factores clave.
2. Asignar pesos relativos.
3. Asignar calificaciones de 1 a 4.
4. Multiplicar peso por calificación.
5. Sumar los puntajes ponderados.
6. Interpretar el resultado junto con los subtotales y la evidencia.

La fórmula por fila es:

$$
P_i = w_i \times r_i
$$

Donde:

- $w_i$ es el peso del factor $i$.
- $r_i$ es la calificación del factor $i$.
- $P_i$ es el puntaje ponderado del factor $i$.

El total de la matriz es:

$$
T = \sum_{i=1}^{n} w_i r_i
$$

Con pesos que suman `1.00` y calificaciones entre `1` y `4`, el total queda dentro del intervalo teórico `1.00` a `4.00`. El valor `2.50` puede utilizarse como referencia media, siempre que la interfaz lo presente como referencia metodológica y no como una frontera absoluta.

#### EFI

En EFI, la calificación describe la condición interna:

| Calificación | Significado |
| --- | --- |
| 1 | Debilidad mayor |
| 2 | Debilidad menor |
| 3 | Fortaleza menor |
| 4 | Fortaleza mayor |

#### EFE

En EFE, la calificación describe la respuesta de la organización al entorno:

| Calificación | Significado |
| --- | --- |
| 1 | Respuesta deficiente |
| 2 | Respuesta regular |
| 3 | Respuesta buena |
| 4 | Respuesta excelente |

Una calificación EFE baja no significa que el factor externo sea poco importante. Significa que la respuesta organizacional frente a ese factor es deficiente.

### 3.2. DAFO

DAFO es un marco para organizar fortalezas, debilidades, oportunidades y amenazas y para generar alternativas estratégicas. La literatura revisada no establece una única fórmula universal para convertir todas las relaciones DAFO en un único índice cuantitativo.

Por ello, la aplicación debe distinguir:

- **Diagnóstico DAFO:** clasificación y descripción de factores.
- **Relación DAFO:** vínculo explícito entre dos factores, justificado por el usuario o por expertos.
- **Orientación DAFO:** síntesis recomendada del conjunto de relaciones.
- **Estrategia concreta:** alternativa redactada y evaluada mediante QSPM.

### 3.3. CAME

CAME convierte el diagnóstico en acciones:

- **C:** Corregir debilidades.
- **A:** Afrontar amenazas.
- **M:** Mantener fortalezas.
- **E:** Explotar oportunidades.

CAME no debe limitarse a clasificar factores con un umbral numérico fijo. Un plan CAME útil debe incluir, como mínimo:

- Acción.
- Factor de origen.
- Objetivo.
- Responsable.
- Recursos.
- Plazo.
- Indicador.
- Línea base.
- Meta.
- Estado.
- Prioridad y criterios que la justifican.

### 3.4. QSPM

QSPM es el módulo recomendado para comparar alternativas estratégicas. Para cada factor se asigna una puntuación de atractivo frente a cada estrategia.

$$
TAS_{ij} = w_i \times AS_{ij}
$$

Donde:

- $w_i$ es el peso normalizado del factor $i$.
- $AS_{ij}$ es la puntuación de atractivo de la estrategia $j$ frente al factor $i$.
- $TAS_{ij}$ es el puntaje total de atractivo de la estrategia $j$ frente al factor $i$.

La puntuación total de cada estrategia es:

$$
TAS_j = \sum_{i=1}^{n} w_i AS_{ij}
$$

La estrategia con mayor $TAS_j$ es la más atractiva de forma relativa según los factores, pesos y juicios introducidos. QSPM estructura la decisión, pero no elimina la necesidad de justificar los juicios.

### 3.5. AHP y Delphi

AHP o Delphi pueden incorporarse como mecanismos de validación cuando se disponga de expertos:

- **Delphi:** consenso sucesivo de un panel de expertos.
- **AHP:** comparación por pares de criterios o factores y obtención de pesos relativos.

No son obligatorios para la primera versión, pero la arquitectura debe permitir registrar que un peso o una prioridad fue validado por expertos.

---

## 4. Diagnóstico del estado actual

### 4.1. Superficie funcional existente

La implementación actual se concentra principalmente en:

- `index.html` y `setup.html`: entradas Vite de la interfaz y del asistente de configuración (solo puntos de montaje de React).
- `src/`: aplicación React (Vite) — `App.jsx`, `domain.js` (cálculos puros compartidos) y estilos (`styles.css`, `tokens.css`).
- `src/setup/`: asistente de configuración inicial en React (4 pasos).
- `server.py`: servicio Flask y generación de PDF.
- `setup_server.py`: servidor del asistente (Python stdlib, APIs de verificación e instalación).
- `generar_graficos.py`: gráficos usados en exportaciones.
- `frontend/dist`: build de producción servido por `server.py` y `setup_server.py`.

### 4.2. Cálculos que se deben conservar

Las funciones `calcularEFI()` y `calcularEFE()` ya aplican la operación básica `ponderación × calificación` y suman los resultados. Esa lógica debe mantenerse, pero debe trasladarse a funciones puras y compartidas para que la misma operación alimente:

- La celda de cada fila.
- El total.
- Los subtotales.
- Los listados.
- Los gráficos.
- El objeto exportado.

### 4.3. Problemas que se deben resolver

#### Desincronización de datos

La interfaz ha mostrado diferencias entre valores visibles y resúmenes calculados. La causa funcional a evitar es que algunas partes lean `datosEntrada` y otras conserven resultados anteriores o utilicen arrays de ejemplo distintos.

Solución requerida:

- Una única fuente de verdad.
- Recalculo centralizado.
- Renderizado posterior al cálculo.
- Prohibición de que la UI calcule fórmulas de forma independiente.
- Pruebas de igualdad entre valores visibles y valores exportados.

#### Cruce DAFO automático

La función actual suma todos los productos posibles:

$$
FO = \sum_i \sum_j (F_i \times O_j)
$$

Esto equivale a multiplicar los subtotales de los grupos cuando todos los pares se cruzan. El resultado puede funcionar como indicador exploratorio, pero no representa una relación estratégica validada entre cada par de factores.

#### Prioridad CAME basada en el puntaje bruto

La regla actual tiene una forma equivalente a:

```text
puntaje > 0.30 ? "Alta" : "Media"
```

No debe conservarse como regla metodológica principal. En EFI, una calificación `1` identifica una debilidad mayor. Por tanto, una debilidad grave puede producir un puntaje ponderado bajo sin ser poco prioritaria.

#### Selección de estrategia por máximo bruto

La elección automática del mayor entre FO, FA, DO y DA puede conservarse como recomendación provisional durante una transición, pero debe cambiarse por:

1. Relaciones DAFO explicitadas.
2. Índices comparables y transparentes.
3. Advertencia de empate o baja diferencia.
4. QSPM para seleccionar la alternativa final.

---

## 5. Flujo funcional propuesto

El proceso completo será:

```text
Factores y evidencias
        |
        v
Validación de factores
        |
        v
EFI ------------------ EFE
 |                      |
 +----------+-----------+
            v
      Relaciones DAFO
            |
            v
Orientación FO/DO/FA/DA
            |
            v
Alternativas estratégicas
            |
            v
           QSPM
            |
            v
      Estrategia elegida
            |
            v
           CAME
            |
            v
Seguimiento e indicadores
            |
            v
 Exportación metodológica
```

### 5.1. Paso 0: factores y evidencias

Cada factor debe poder registrar:

- Identificador estable.
- Nombre.
- Tipo: F, D, O o A.
- Descripción operacional.
- Fuente de evidencia.
- Técnica de obtención: entrevista, encuesta, revisión documental, observación u otra.
- Fecha de evidencia.
- Responsable de validación.
- Estado: propuesto, validado, descartado.

No se debe depender solamente del nombre breve del factor. Para una tesis, la evidencia y la definición operacional son necesarias para defender por qué el factor fue incluido.

### 5.2. Paso 1: EFI

La pantalla debe permitir:

- Editar factores internos.
- Cambiar F/D.
- Introducir pesos.
- Seleccionar calificaciones de 1 a 4.
- Introducir o consultar la evidencia.
- Ver puntaje por fila.
- Ver suma de pesos.
- Ver total EFI.
- Ver subtotales de fortalezas y debilidades.
- Ver factores ordenados por importancia o por puntaje.
- Ver advertencias de datos incompletos.

### 5.3. Paso 2: EFE

La pantalla debe permitir:

- Editar factores externos.
- Cambiar O/A.
- Introducir pesos.
- Seleccionar calificaciones de respuesta de 1 a 4.
- Introducir o consultar la evidencia.
- Ver puntaje por fila.
- Ver suma de pesos.
- Ver total EFE.
- Ver subtotales de oportunidades y amenazas.
- Diferenciar importancia del factor y calidad de respuesta.

### 5.4. Paso 3: relaciones DAFO

La pantalla debe presentar una matriz o editor de relaciones. No todos los pares tienen que ser válidos ni estratégicamente relevantes.

Para cada relación se deben registrar:

- Factor interno.
- Factor externo.
- Cuadrante derivado.
- Relación activa: sí/no.
- Fuerza de relación: 0, 1, 2 o 3.
- Justificación.
- Evidencia.
- Autor de la valoración.
- Fecha.
- Observación.

Escala recomendada:

| Valor | Significado |
| --- | --- |
| 0 | No existe relación estratégica suficiente |
| 1 | Relación débil |
| 2 | Relación moderada |
| 3 | Relación fuerte |

La fuerza `0` debe diferenciarse de “sin evaluar”. “Sin evaluar” no debe entrar en el cálculo ni interpretarse como ausencia de relación.

---

## 6. Cálculo propuesto para DAFO

### 6.1. Principio

El cálculo DAFO debe cuantificar la **fuerza de las relaciones registradas**, no inventar relaciones entre todos los factores.

Para una relación entre el factor interno $i$ y el factor externo $j$:

$$
R_{ij} = w_i \times w_j \times s_{ij}
$$

Donde:

- $w_i$ es el peso del factor interno.
- $w_j$ es el peso del factor externo.
- $s_{ij}$ es la fuerza de relación entre `0` y `3`.

El índice de un cuadrante es:

$$
Q_k = \sum_{(i,j) \in k} R_{ij}
$$

El resultado debe denominarse:

> Índice operativo de relaciones DAFO.

No debe denominarse “fórmula universal de DAFO”.

### 6.2. Normalización

Para facilitar la comparación se puede calcular un índice normalizado por cuadrante:

$$
Q_{k,norm} = \frac{Q_k}{3 \times \sum_{(i,j) \in k} w_i w_j}
$$

Si el denominador es cero, el cuadrante queda como “sin relaciones evaluadas”.

También se debe mostrar la cobertura:

$$
Cobertura_k = \frac{\sum_{(i,j) \in k,\ evaluadas} w_i w_j}{\sum_{(i,j) \in k,\ posibles} w_i w_j}
$$

La cobertura evita que un cuadrante parezca concluyente cuando solamente se evaluó una pequeña parte de sus relaciones.

### 6.3. Uso de las calificaciones EFI/EFE

Las calificaciones EFI/EFE no deben reinterpretarse silenciosamente como fuerza de relación.

Se utilizarán así:

- La calificación EFI caracteriza la condición interna.
- La calificación EFE caracteriza la respuesta frente al entorno.
- La fuerza de relación DAFO se registra de forma independiente.
- La severidad de una debilidad se utiliza principalmente en CAME.
- La urgencia de una amenaza se valida en CAME mediante criterios explícitos.

Si posteriormente se decide usar factores derivados de las calificaciones, debe activarse una opción metodológica visible y documentada, nunca una transformación escondida en el código.

### 6.4. Recomendación de orientación

El sistema debe ordenar los cuatro índices normalizados y producir:

- Cuadrante dominante.
- Orientación asociada.
- Segundo cuadrante.
- Diferencia entre primero y segundo.
- Cobertura del cuadrante dominante.
- Número de relaciones fuertes.
- Advertencias metodológicas.

Regla recomendada:

1. Si no hay relaciones evaluadas, mostrar “No hay base suficiente para recomendar una orientación”.
2. Si hay un cuadrante dominante con cobertura baja, mostrar la recomendación como provisional.
3. Si la diferencia entre primero y segundo es pequeña, mostrar “orientación no concluyente” y presentar las dos opciones principales.
4. Si hay cobertura suficiente y diferencia clara, mostrar la orientación dominante.
5. En todos los casos, indicar que QSPM debe comparar las estrategias concretas.

Los valores de diferencia y cobertura deben ser configurables. Un valor inicial de diferencia del `10 %` puede utilizarse como regla de interfaz, pero debe etiquetarse como umbral operativo, no como norma científica.

### 6.5. Mapeo de recomendación

```text
FO -> Ofensiva / crecimiento
DO -> Adaptativa / reorientación
FA -> Defensiva / protección
DA -> Supervivencia / contención
```

La recomendación debe incluir una explicación basada en los pares principales. Ejemplo:

> DO adaptativa: las relaciones más fuertes vinculan la falta de integración y la falta de automatización con oportunidades de transformación digital y modernización. La orientación sugiere corregir capacidades internas para aprovechar esas oportunidades.

---

## 7. Alternativas estratégicas

La herramienta no debe saltar directamente del cuadrante al plan de acción. Debe permitir redactar varias alternativas concretas.

### 7.1. Plantilla de alternativa

Cada alternativa debe contener:

- Identificador.
- Nombre.
- Cuadrante de origen.
- Orientación.
- Problema que aborda.
- Factores que aprovecha o mitiga.
- Descripción.
- Resultado esperado.
- Horizonte temporal.
- Responsable propuesto.
- Estado: propuesta, validada, seleccionada, descartada.

### 7.2. Alternativas iniciales para el caso de estudio

Estas alternativas son ejemplos para cargar en una futura versión, no decisiones definitivas:

1. **Integración formal de los procesos de cuadros y reservas**
   - Orientación: DO.
   - Propósito: establecer un flujo común, responsabilidades y puntos de coordinación.

2. **Sistema digital de seguimiento del ciclo de cuadros y reservas**
   - Orientación: DO.
   - Propósito: reducir procesos fragmentados, mejorar la trazabilidad y apoyar la toma de decisiones.

3. **Comité o mecanismo permanente de coordinación interprocesos**
   - Orientación: DO/FA.
   - Propósito: asegurar la articulación institucional y el seguimiento de acuerdos.

4. **Programa de capacitación con evaluación de impacto**
   - Orientación: DO.
   - Propósito: vincular capacitación, desempeño, resultados y necesidades reales del sistema.

5. **Plan de continuidad y retención de cuadros y reservas**
   - Orientación: DA/FA.
   - Propósito: reducir la vulnerabilidad ante migración, fluctuación y pérdida de capacidades.

6. **Fortalecimiento de indicadores de gestión e integración**
   - Orientación: FO/DO.
   - Propósito: medir el funcionamiento del sistema y detectar fallas de coordinación.

La aplicación debe permitir modificar, eliminar o crear alternativas sin alterar los factores originales.

---

## 8. Módulo QSPM

### 8.1. Preparación de pesos

EFI y EFE tienen cada una pesos que suman `1.00`. Para una QSPM que combine ambos grupos se recomienda normalizar los factores incluidos en una escala común:

$$
w_{QSPM,i} = \frac{w_i}{\sum_{h=1}^{m} w_h}
$$

Así, si se utilizan todos los factores de EFI y EFE, la suma combinada de los pesos QSPM será `1.00`. Los pesos originales deben conservarse para mantener la trazabilidad.

### 8.2. Puntuación de atractivo

| Valor | Significado |
| --- | --- |
| 1 | No resulta atractiva frente al factor |
| 2 | Poco atractiva |
| 3 | Atractiva |
| 4 | Muy atractiva |
| — | No aplica o no existe diferencia relevante |

No se debe convertir automáticamente un campo vacío en `1`. Un factor no evaluado debe quedar identificado como pendiente.

### 8.3. Tabla QSPM

La tabla debe contener:

| Factor | Tipo | Peso QSPM | Estrategia 1 AS | Estrategia 1 TAS | Estrategia 2 AS | Estrategia 2 TAS |
| --- | --- | --- | --- | --- | --- | --- |
| Factor 1 | D | 0.10 | 4 | 0.40 | 2 | 0.20 |

El sistema debe mostrar:

- Total TAS por estrategia.
- Cantidad de factores evaluados.
- Cantidad de factores pendientes.
- Diferencia entre la primera y la segunda estrategia.
- Ranking.
- Advertencia si existe empate o diferencia mínima.
- Observaciones del evaluador.

### 8.4. Regla de selección

La QSPM debe mostrar una estrategia recomendada cuando:

- Todas las filas relevantes están evaluadas.
- Las puntuaciones están dentro del rango permitido.
- Existe una diferencia suficiente entre las primeras estrategias.
- El usuario ha confirmado que los juicios son aceptables.

Si no se cumplen esas condiciones, mostrar:

> La QSPM no permite una selección concluyente. Revise los factores, complete las puntuaciones y valide los juicios.

La selección final debe permitir una confirmación manual y una justificación. Si el usuario elige una estrategia distinta de la primera del ranking, la aplicación debe guardar el motivo sin bloquearlo.

### 8.5. Relación entre DAFO y QSPM

La orientación DAFO debe ayudar a crear alternativas, pero no limitar la evaluación a una sola alternativa del cuadrante ganador.

Ejemplo:

- Orientación recomendada: DO.
- Alternativas evaluadas: dos DO, una FA y una DA.
- Resultado QSPM: una alternativa DO ocupa el primer lugar.
- Decisión: se selecciona esa alternativa y se documenta por qué.

Si una alternativa FA supera a las DO en QSPM, la aplicación debe aceptarlo. La herramienta no debe forzar que el resultado final coincida con el cuadrante dominante.

---

## 9. Módulo CAME rediseñado

### 9.1. Principio de prioridad

La prioridad CAME no debe derivarse directamente de `peso × calificación` sin considerar el sentido de la escala.

Para una debilidad EFI con calificación $r$:

$$
Severidad_D = 5 - r
$$

Una calificación `1` genera una severidad alta y una calificación `4` una severidad baja. Esta transformación puede utilizarse como dato inicial, pero debe poder ser revisada por expertos.

Para una amenaza EFE con respuesta baja, una primera señal de urgencia puede ser:

$$
Urgencia_A = 5 - r
$$

Esta señal no mide por sí sola el tamaño de la amenaza. La amenaza debe valorarse también por impacto, probabilidad y horizonte temporal.

### 9.2. Criterios de prioridad

Cada acción tendrá valores de 1 a 5 en criterios configurables. Se propone comenzar con:

- **Impacto sobre el problema central.**
- **Urgencia.**
- **Severidad o evidencia.**
- **Alineación con la estrategia seleccionada.**
- **Factibilidad de ejecución.**

Los pesos de los criterios deben sumar `1.00`.

Como configuración inicial neutral:

| Criterio | Peso inicial |
| --- | --- |
| Impacto | 0.20 |
| Urgencia | 0.20 |
| Severidad/evidencia | 0.20 |
| Alineación estratégica | 0.20 |
| Factibilidad | 0.20 |

Esta configuración es un punto de partida operativo, no un estándar universal. Debe poder modificarse y documentarse.

El índice es:

$$
Prioridad_i = \sum_{k=1}^{p} c_k \times \frac{x_{ik}}{5}
$$

Donde:

- $c_k$ es el peso del criterio $k$.
- $x_{ik}$ es la valoración de la acción $i$ en el criterio $k$.
- El resultado queda entre `0` y `1`.

### 9.3. Categorías de prioridad

La interfaz debe mostrar el índice continuo y, opcionalmente, una categoría. Las categorías deben configurarse en la aplicación y exportarse junto con el análisis.

Configuración inicial sugerida:

| Índice | Categoría |
| --- | --- |
| 0.75 a 1.00 | Crítica |
| 0.50 a 0.7499 | Alta |
| 0.25 a 0.4999 | Media |
| 0.00 a 0.2499 | Baja |

Estos cortes son reglas de presentación. No deben citarse como umbrales académicos universales. Para muestras pequeñas, puede ser preferible ordenar las acciones por ranking y validar las primeras con expertos.

### 9.4. Tratamiento de la debilidad central

La “Falta de integración de procesos” debe poder aparecer como prioridad alta o crítica si la evidencia, el impacto, la urgencia y la alineación con la estrategia lo justifican.

No se debe conseguir esa clasificación alterando su peso o calificación. Debe conseguirse mediante:

- Evidencia empírica de entrevistas y otras técnicas.
- Valoración alta del impacto sobre el problema central.
- Valoración alta de urgencia cuando corresponda.
- Alineación con la estrategia DO seleccionada.
- Validación de expertos.

### 9.5. Ficha de acción CAME

La ficha debe contener:

- Código.
- Acción.
- Letra C/A/M/E.
- Factor de origen.
- Estrategia relacionada.
- Problema u oportunidad abordada.
- Objetivo específico.
- Responsable.
- Participantes.
- Recursos.
- Fecha de inicio.
- Fecha de finalización.
- Indicador.
- Línea base.
- Meta.
- Frecuencia de seguimiento.
- Estado.
- Criterios de prioridad.
- Índice de prioridad.
- Justificación.
- Observaciones.

### 9.6. Acciones iniciales posibles para el caso de estudio

- Diseñar y aprobar el mapa integrado de procesos de cuadros y reservas.
- Definir entradas, salidas, responsables y puntos de coordinación.
- Crear un registro único de seguimiento de cuadros y reservas.
- Establecer reuniones periódicas de coordinación interprocesos.
- Vincular los planes de capacitación con la evaluación de impacto.
- Diseñar indicadores de integración, cumplimiento y resultados.
- Crear alertas para retrasos, vacantes, movimientos y necesidades de formación.
- Establecer medidas de continuidad frente a la fluctuación de cuadros y reservas.

Estas acciones son ejemplos para la fase de diseño. Deben validarse, completarse y priorizarse con el diagnóstico real.

---

## 10. Modelo de datos propuesto

La aplicación debe evolucionar desde arrays separados hacia un estado centralizado. La estructura conceptual puede ser:

```javascript
const estadoAnalisis = {
    metadata: {
        versionMetodologica: "2.0",
        fecha: "",
        organizacion: "",
        unidadAnalizada: "",
        autor: "",
        estadoValidacion: "borrador"
    },
    factores: {
        internos: [],
        externos: []
    },
    matrices: {
        efi: {
            pesos: {},
            calificaciones: {},
            resultados: {},
            validacion: {}
        },
        efe: {
            pesos: {},
            calificaciones: {},
            resultados: {},
            validacion: {}
        }
    },
    relacionesDafo: [],
    orientacionDafo: {
        cuadrantes: {},
        dominante: null,
        confianza: null,
        advertencias: []
    },
    estrategias: [],
    qspm: {
        pesosNormalizados: {},
        puntuacionesAtractivo: {},
        resultados: [],
        seleccionada: null,
        justificacion: ""
    },
    came: {
        criterios: [],
        acciones: [],
        categorias: {},
        seleccionada: []
    }
};
```

### 10.1. Factor

```javascript
{
    id: "D-08",
    nombre: "Falta de integración de procesos",
    tipo: "D",
    origen: "interno",
    descripcion: "Los procesos no se articulan de forma suficiente...",
    evidencia: [
        {
            tipo: "entrevista",
            referencia: "Entrevistas a directivos y especialistas",
            fecha: "",
            observacion: ""
        }
    ],
    validado: true
}
```

### 10.2. Relación DAFO

```javascript
{
    id: "rel-D08-O01",
    internoId: "D-08",
    externoId: "O-01",
    cuadrante: "DO",
    estado: "evaluada",
    fuerza: 3,
    justificacion: "La transformación digital puede facilitar la integración...",
    evidencia: "Entrevistas y revisión documental",
    evaluador: "",
    fecha: ""
}
```

### 10.3. Alternativa estratégica

```javascript
{
    id: "EST-DO-01",
    nombre: "Integrar formalmente los procesos de cuadros y reservas",
    cuadrante: "DO",
    orientacion: "adaptativa",
    descripcion: "",
    factoresRelacionados: ["D-08", "O-01", "O-02"],
    estado: "propuesta"
}
```

### 10.4. Acción CAME

```javascript
{
    id: "ACC-C-001",
    tipo: "C",
    factorId: "D-08",
    estrategiaId: "EST-DO-01",
    accion: "Diseñar y aprobar el mapa integrado de procesos",
    criterios: {
        impacto: 5,
        urgencia: 5,
        severidad: 5,
        alineacion: 5,
        factibilidad: 4
    },
    prioridad: 0,
    categoria: "",
    responsable: "",
    recursos: [],
    fechaInicio: "",
    fechaFin: "",
    indicador: "",
    lineaBase: "",
    meta: "",
    estado: "propuesta",
    justificacion: ""
}
```

---

## 11. Arquitectura técnica de implementación

### 11.1. Fuente única de verdad

El estado central debe ser la única fuente de datos. Las funciones de cálculo no deben leer directamente valores visibles del DOM.

Flujo recomendado:

```text
Evento de usuario
    -> actualizar estado
    -> validar estado
    -> calcular resultados puros
    -> guardar resultados
    -> renderizar UI
    -> actualizar gráficos
    -> preparar exportación
```

### 11.2. Funciones puras recomendadas

En el frontend (hoy React, con los cálculos puros en `src/domain.js`) se recomienda separar funciones con responsabilidades únicas:

- `validarPesos(pesos)`.
- `validarCalificaciones(calificaciones, tipoMatriz)`.
- `calcularMatrizPonderada(factores, pesos, calificaciones)`.
- `calcularSubtotalesPorTipo(factores, resultados)`.
- `calcularRelacionesDafo(factores, relaciones)`.
- `normalizarCuadrantes(cuadrantes, relaciones)`.
- `recomendarOrientacionDafo(resultadoDafo, configuracion)`.
- `calcularQSPM(factores, estrategias, puntuaciones)`.
- `calcularPrioridadCame(accion, criterios)`.
- `clasificarPrioridad(indice, umbrales)`.
- `validarAnalisisCompleto(estado)`.
- `calcularTodo()` como orquestador, no como lugar para todas las fórmulas.

### 11.3. Validaciones EFI/EFE

La aplicación debe bloquear la interpretación definitiva cuando:

- Existen pesos negativos.
- Existen pesos mayores que `1`.
- Falta un peso de un factor activo.
- Falta una calificación.
- Una calificación no es entera entre `1` y `4`.
- La suma de pesos no es `1.00` dentro de una tolerancia configurable.
- Hay factores sin tipo válido.
- Hay factores duplicados sin confirmación.

La tolerancia de suma puede ser `0.001` para evitar errores por redondeo, pero el valor completo debe mantenerse internamente.

Mensajes sugeridos:

- “Los pesos EFI suman 0.94. Complete o ajuste la matriz hasta alcanzar 1.00.”
- “La calificación EFE representa la respuesta de la organización, no la importancia del factor.”
- “No se puede recomendar una orientación porque existen relaciones DAFO pendientes de evaluación.”
- “La QSPM tiene factores sin puntuar. La selección es provisional.”

### 11.4. Redondeo

- Calcular con precisión completa.
- Mostrar normalmente dos decimales en totales.
- Mostrar cuatro decimales en celdas de relaciones si es necesario.
- Exportar el valor completo o al menos seis decimales en el JSON de análisis.
- No redondear antes de sumar.

### 11.5. Compatibilidad con datos actuales

Durante la migración:

1. Leer los arrays actuales de `datosEntrada`.
2. Crear factores con identificadores estables.
3. Convertir pesos y calificaciones al nuevo estado.
4. Inicializar relaciones como `sin evaluar`.
5. Mantener el modo exploratorio para poder visualizar datos antiguos.
6. Mostrar una advertencia de que la recomendación DAFO no es concluyente hasta evaluar relaciones.

`cargarEjemplo()` debe cargar un único conjunto coherente de factores, pesos y calificaciones. No debe conservar arrays de ejemplo distintos de los que se muestran en la UI.

---

## 12. Cambios de interfaz propuestos

### 12.1. Indicador de proceso

Actualizar el proceso visual para reflejar:

```text
1. Factores -> 2. EFI/EFE -> 3. Relaciones DAFO ->
4. Orientación -> 5. QSPM -> 6. CAME -> 7. Seguimiento
```

### 12.2. EFI/EFE

Agregar:

- Estado de validación.
- Suma de pesos visible y coloreada según validez.
- Subtotales separados.
- Columna o panel de evidencia.
- Diferencia entre datos introducidos y valores calculados, si existe.
- Botón para revisar factores pendientes.

### 12.3. DAFO

Reemplazar la presentación de la matriz como único cálculo automático por dos bloques:

1. **Editor de relaciones:** pares relevantes, fuerza y justificación.
2. **Resumen de orientación:** índices, cobertura, cuadrante dominante, confianza y advertencias.

Cada tarjeta de cuadrante debe mostrar:

- Nombre de la orientación.
- Índice normalizado.
- Número de relaciones evaluadas.
- Cobertura.
- Principales relaciones.
- Acción típica.

### 12.4. Recomendación

La tarjeta debe cambiar de “Estrategia Principal Recomendada” a:

> Orientación DAFO sugerida

Debe incluir:

- Código FO/DO/FA/DA.
- Nombre de orientación.
- Explicación en lenguaje claro.
- Factores que la sustentan.
- Nivel de confianza: alto, medio, bajo o no concluyente.
- Aviso: “La estrategia final se selecciona en QSPM”.
- Botón para pasar a alternativas.

### 12.5. QSPM

Agregar:

- Editor de estrategias.
- Tabla de factores y pesos normalizados.
- Celdas AS y TAS.
- Observación por puntuación.
- Ranking.
- Confirmación de selección.
- Justificación de la decisión.

### 12.6. CAME

Sustituir listas de acciones generadas solamente por texto por fichas editables. Cada ficha debe permitir introducir criterios, responsable, fechas, indicadores y estado.

La acción automática inicial puede ser una plantilla, pero debe quedar marcada como “borrador” y no como acción definitiva.

### 12.7. Exportación

El PDF, la imagen y cualquier exportación futura deben incluir:

- Datos de identificación.
- EFI y EFE completos.
- Validaciones.
- DAFO y relaciones seleccionadas.
- Orientación sugerida.
- Alternativas.
- QSPM.
- Estrategia seleccionada.
- CAME.
- Criterios y pesos de prioridad.
- Advertencias y limitaciones.
- Fecha y versión metodológica.

---

## 13. Plan de implementación por fases

### Fase 0. Congelación y respaldo

- Crear una copia de seguridad del estado actual.
- Registrar los valores de referencia: EFI `2.13`, EFE `2.34`, FO `1.76`, FA `0.53`, DO `2.07`, DA `0.62`.
- Documentar la diferencia observada entre filas y resúmenes.
- No borrar la lógica anterior hasta tener pruebas de la nueva.

### Fase 1. Estado central y sincronización

- Crear el objeto de estado único.
- Migrar `config`, `datosEntrada` y `resultados` a una estructura coherente.
- Centralizar cálculo y renderizado.
- Corregir la actualización después de modificar pesos, calificaciones o tipos.
- Hacer que `calcularTodo()` ejecute el flujo completo.

**Salida esperada:** todos los valores visibles coinciden con el mismo resultado almacenado.

### Fase 2. Validación EFI/EFE

- Implementar validación de pesos.
- Implementar validación de calificaciones.
- Mostrar advertencias antes de interpretar.
- Mantener `peso × calificación`.
- Agregar subtotales y evidencia.

**Salida esperada:** una matriz incompleta no se presenta como resultado definitivo.

### Fase 3. Relaciones DAFO y orientación

- Crear editor de relaciones.
- Registrar fuerza, justificación y evidencia.
- Implementar índice operativo de relaciones.
- Normalizar cuadrantes.
- Calcular cobertura.
- Recomendar FO/DO/FA/DA.
- Mostrar empate, baja cobertura y confianza.

**Salida esperada:** la herramienta sugiere una orientación y explica por qué.

### Fase 4. Alternativas y QSPM

- Crear editor de alternativas.
- Normalizar pesos combinados.
- Introducir puntuaciones de atractivo.
- Calcular TAS.
- Ordenar estrategias.
- Permitir confirmación y justificación de la decisión.

**Salida esperada:** la estrategia final se selecciona de forma trazable.

### Fase 5. CAME multicriterio

- Crear fichas de acciones.
- Configurar criterios y pesos.
- Implementar índice continuo.
- Implementar categorías configurables.
- Prellenar severidad o urgencia como sugerencia, no como verdad.
- Añadir responsables, plazos e indicadores.

**Salida esperada:** CAME produce un plan priorizado y ejecutable.

### Fase 6. Exportación y documentación

- Actualizar exportación HTML/PDF.
- Incluir fórmulas y supuestos.
- Incluir advertencias.
- Añadir versión metodológica.
- Validar gráficos con los mismos resultados que la UI.
- Actualizar el instructivo.

### Fase 7. Validación con expertos

- Presentar factores y relaciones a expertos.
- Revisar pesos y calificaciones.
- Validar alternativas QSPM.
- Revisar prioridades CAME.
- Registrar fecha, panel, consenso y cambios.

---

## 14. Pruebas y criterios de aceptación

### 14.1. Pruebas EFI/EFE

- Si todos los pesos suman `1.00`, la matriz es válida.
- Si los pesos suman `0.94`, se muestra error y no se emite interpretación definitiva.
- Si una calificación es `0` o `5`, se muestra error.
- Si se modifica una calificación, se actualizan fila, subtotal, total, DAFO, QSPM y CAME.
- El valor exportado coincide con el valor mostrado.
- El redondeo visible no modifica la suma interna.

### 14.2. Pruebas DAFO

- Una relación con fuerza `0` no aporta al cuadrante.
- Una relación sin evaluar no se interpreta como relación inexistente.
- Una relación fuerte aporta más que una relación débil cuando los pesos son iguales.
- El cuadrante dominante se explica mediante las relaciones principales.
- Si dos cuadrantes tienen resultados cercanos, se muestra advertencia.
- Si no existen relaciones válidas, no se recomienda una orientación definitiva.
- La recomendación DO puede aparecer aunque no sea conveniente seleccionar una estrategia DO después de QSPM.

### 14.3. Pruebas QSPM

- Una puntuación AS fuera de `1` a `4` se rechaza.
- Un factor no aplica puede quedar vacío o con `—`, pero se contabiliza como pendiente si la metodología exige evaluarlo.
- El TAS es igual a peso QSPM por AS.
- La suma de pesos QSPM es `1.00` después de normalizar.
- Un empate se muestra como empate.
- Se puede elegir manualmente una alternativa distinta, guardando justificación.

### 14.4. Pruebas CAME

- Una debilidad con calificación EFI `1` obtiene una señal de severidad mayor que una con calificación `4`, manteniendo iguales los demás criterios.
- La prioridad no depende solamente de `peso × calificación`.
- Cambiar un criterio actualiza el índice y el ranking.
- Si se cambian los pesos de criterios, la suma debe validarse.
- La acción “Falta de integración de procesos” puede adquirir prioridad alta cuando sus criterios y evidencia lo justifican.
- Toda acción tiene responsable, plazo e indicador antes de marcarse como aprobada.

### 14.5. Pruebas de exportación

- El PDF contiene los mismos totales que la interfaz.
- La orientación exportada coincide con la UI.
- La QSPM exporta AS, TAS y ranking.
- CAME exporta criterios, índice, categoría y responsables.
- Se incluyen advertencias y limitaciones.

---

## 15. Criterios de aceptación funcional

La implementación se considerará lista cuando:

- EFI y EFE calculen y validen los resultados sin discrepancias.
- La suma de pesos y el estado de cada matriz sean visibles.
- DAFO no dependa de cruzar automáticamente todos los pares.
- El usuario pueda evaluar y justificar relaciones relevantes.
- La herramienta sugiera FO, DO, FA o DA con una explicación y nivel de confianza.
- La herramienta pueda declarar que no existe una orientación concluyente.
- QSPM compare al menos tres alternativas.
- La estrategia seleccionada quede registrada con justificación.
- CAME priorice acciones mediante criterios configurables.
- Las debilidades graves no reciban prioridad media por una interpretación invertida del puntaje.
- El caso de la falta de integración pueda quedar sustentado como prioridad alta por evidencia y criterios.
- Las exportaciones contengan método, resultados, supuestos y advertencias.
- Existan pruebas para los casos críticos descritos en este documento.

---

## 16. Redacción metodológica recomendada para la tesis

La herramienta puede describirse de la siguiente manera:

> La matriz EFI se utilizó para evaluar los factores internos mediante la asignación de pesos relativos y calificaciones de uno a cuatro, calculando para cada factor el producto entre el peso y la calificación. La matriz EFE se aplicó con el mismo procedimiento, interpretando la calificación como el nivel de respuesta de la organización frente a cada oportunidad o amenaza.
>
> El análisis DAFO se empleó como marco para organizar los factores internos y externos y generar alternativas estratégicas. Las relaciones entre factores se valoraron de manera explícita según su fuerza y se documentaron mediante justificaciones y evidencias. La orientación resultante se interpretó como una recomendación de tipo FO, DO, FA o DA, sin considerarla por sí sola una selección definitiva.
>
> Las alternativas estratégicas se compararon mediante una Matriz Cuantitativa de Planificación Estratégica, asignando puntuaciones de atractivo frente a los factores ponderados. La alternativa seleccionada se convirtió en un plan CAME con acciones, responsables, recursos, plazos, indicadores y criterios de prioridad. Las ponderaciones y prioridades de la propuesta operativa se sometieron a validación de expertos.

Esta redacción evita afirmar que DAFO o CAME poseen una fórmula universal y deja claro qué parte corresponde al método clásico y qué parte corresponde al diseño operativo de la investigación.

---

## 17. Fuentes metodológicas de referencia

1. **Instituto Tecnológico y de Estudios Superiores de Monterrey.** Nota técnica sobre matrices EFI y EFE. Explica pesos, calificaciones, puntajes ponderados y comparación de fortalezas/debilidades y oportunidades/amenazas.  
   <https://cic.itesm.mx/DocumentosPrincipalAlumno/80e1373f-5a14-e8ea-aa85-76e0c4e7b468.pdf>

2. **Universidad Nacional Autónoma de Nicaragua.** Repositorio con aplicación de matrices estratégicas y referencia al intervalo de 1.0 a 4.0 y al valor medio de 2.5.  
   <https://repositorio.unan.edu.ni/id/eprint/8747/1/18793.pdf>

3. **Generalitat de Catalunya / Consorci per a la Formació Contínua de Catalunya.** Material sobre análisis DAFO y CAME, con énfasis en relevancia, recursos, responsables, plazos, indicadores y seguimiento.  
   <https://conforcat.gencat.cat/web/.content/documents/EMPRESA/HUB/EINES-Analisis-DAFO-CAME.pdf>

4. **Gürel, E. y Tat, M.** *SWOT Analysis: A Theoretical Review*. Revisión teórica que caracteriza SWOT como un marco cualitativo y descriptivo.  
   <https://www.sosyalarastirmalar.com/articles/swot-analysis-a-theoretical-review.pdf>

5. **Kurttila, M., Pesonen, M., Kangas, J. y Kajanus, M.** *Utilizing the analytic hierarchy process (AHP) in SWOT analysis — a hybrid method and its application to a forest-certification case*. Explica que SWOT identifica factores, pero no ofrece por sí solo una medida analítica suficiente de importancia o atractivo de alternativas.  
   <https://doi.org/10.1016/S1389-9341(99)00004-3>

6. **David, M. E., David, F. R. y David, F. R.** *The Quantitative Strategic Planning Matrix Applied to a Retail Computer Store*. Presenta QSPM, sus pasos, ventajas y limitaciones.  
   <https://digitalcommons.coastal.edu/cbj/vol8/iss1/4/>

7. **David, M. E., David, F. R. y David, F. R.** *The quantitative strategic planning matrix: a new marketing tool*. Presenta el uso de QSPM para comparar el atractivo relativo de alternativas estratégicas.  
   <https://doi.org/10.1080/0965254X.2016.1148763>

Las fuentes deben citarse en la tesis conforme al estilo bibliográfico exigido por la institución. La herramienta debe guardar las URL y la fecha de consulta en la exportación metodológica.

---

## 18. Decisiones que deben quedar visibles en la aplicación

La interfaz o el informe exportado debe declarar:

- Qué factores fueron incluidos.
- Cómo se obtuvieron los pesos.
- Quién asignó las calificaciones.
- Qué evidencias respaldan cada factor.
- Qué relaciones DAFO fueron evaluadas.
- Qué significa la escala de relación.
- Qué criterios y pesos se usaron en CAME.
- Qué alternativas entraron en QSPM.
- Quién asignó las puntuaciones de atractivo.
- Qué estrategia se seleccionó y por qué.
- Qué decisiones fueron automáticas y cuáles fueron validadas manualmente.
- Qué resultados son estándares metodológicos y cuáles son propuestas operativas.

Esta trazabilidad es tan importante como el número final.

---

## 19. Regla de oro para la implementación

La aplicación debe sugerir una orientación estratégica, pero nunca debe ocultar el camino que llevó a esa sugerencia.

La salida ideal no es solamente:

> “Estrategia DO recomendada”.

La salida ideal es:

> “Se sugiere una orientación DO adaptativa porque las relaciones validadas entre las debilidades D-08 y D-07 y las oportunidades O-01 y O-02 presentan el mayor índice relativo, con una cobertura del 82 % y una diferencia del 14 % respecto a la segunda orientación. Esta recomendación es provisional hasta completar la QSPM. Entre las alternativas evaluadas, EST-DO-01 obtuvo el mayor TAS y fue seleccionada por el equipo responsable.”

Ese es el nivel de explicación que permite utilizar la herramienta tanto para el análisis organizacional como para fundamentar una tesis.

---

## 20. Dashboard Estratégico de Investigaciones (Centro de Mando Multiexpediente)

### 20.1. Propósito y Alcance

El Dashboard Estratégico (`/dashboard/investigations`) constituye el centro neurálgico de inteligencia y analítica multi-investigación de NovaInvestigator. Su función es sintetizar en tiempo real el estado, la salud estratégica y la orientación dominante de todas las investigaciones y organizaciones analizadas en el tenant, permitiendo una visión panorámica y acceso ágil a cualquier expediente. El segmento raíz `/dashboard` redirige canónicamente a `/dashboard/investigations`.

### 20.2. Arquitectura de Componentes

1. **`src/app/(pages)/dashboard/investigations/page.tsx` (Capa 1: Routing & Auth):**
   - Página Server Component que sirve la subruta canónica `/dashboard/investigations`.
2. **`next.config.ts` (Redirección HTTP a nivel servidor):**
   - Redirección automática permanente (308) de `/dashboard` a `/dashboard/investigations`, siguiendo la misma convención que `/apps/users` -> `/apps/users/list` sin necesidad de archivos dummy intermedios.
3. **`src/views/dashboards/investigations/index.tsx` (Capa 2: View / Controller):**
   - Controlador de cliente conectado al contexto unificado `useInvestigatorAnalysis`.
   - Agrega métricas consolidadas a partir de la colección de `investigations` (remotas y locales).
4. **Módulos Visuales y Analíticos:**
   - **Tarjetas de KPIs Consolidados:**
     - Total de expedientes registrados y desglose por estado (*En análisis*, *Validada*, *Borrador*, *Archivada*).
     - Promedio global de evaluación interna **EFI** (1.0 - 4.0 con umbral de equilibrio 2.5).
     - Promedio global de evaluación externa **EFE** (1.0 - 4.0 con umbral de respuesta 2.5).

### Fase 5. CAME multicriterio

- Crear fichas de acciones.
- Configurar criterios y pesos.
- Implementar índice continuo.
- Implementar categorías configurables.
- Prellenar severidad o urgencia como sugerencia, no como verdad.
- Añadir responsables, plazos e indicadores.

**Salida esperada:** CAME produce un plan priorizado y ejecutable.

### Fase 6. Exportación y documentación

- Actualizar exportación HTML/PDF.
- Incluir fórmulas y supuestos.
- Incluir advertencias.
- Añadir versión metodológica.
- Validar gráficos con los mismos resultados que la UI.
- Actualizar el instructivo.

### Fase 7. Validación con expertos

- Presentar factores y relaciones a expertos.
- Revisar pesos y calificaciones.
- Validar alternativas QSPM.
- Revisar prioridades CAME.
- Registrar fecha, panel, consenso y cambios.

---

## 14. Pruebas y criterios de aceptación

### 14.1. Pruebas EFI/EFE

- Si todos los pesos suman `1.00`, la matriz es válida.
- Si los pesos suman `0.94`, se muestra error y no se emite interpretación definitiva.
- Si una calificación es `0` o `5`, se muestra error.
- Si se modifica una calificación, se actualizan fila, subtotal, total, DAFO, QSPM y CAME.
- El valor exportado coincide con el valor mostrado.
- El redondeo visible no modifica la suma interna.

### 14.2. Pruebas DAFO

- Una relación con fuerza `0` no aporta al cuadrante.
- Una relación sin evaluar no se interpreta como relación inexistente.
- Una relación fuerte aporta más que una relación débil cuando los pesos son iguales.
- El cuadrante dominante se explica mediante las relaciones principales.
- Si dos cuadrantes tienen resultados cercanos, se muestra advertencia.
- Si no existen relaciones válidas, no se recomienda una orientación definitiva.
- La recomendación DO puede aparecer aunque no sea conveniente seleccionar una estrategia DO después de QSPM.

### 14.3. Pruebas QSPM

- Una puntuación AS fuera de `1` a `4` se rechaza.
- Un factor no aplica puede quedar vacío o con `—`, pero se contabiliza como pendiente si la metodología exige evaluarlo.
- El TAS es igual a peso QSPM por AS.
- La suma de pesos QSPM es `1.00` después de normalizar.
- Un empate se muestra como empate.
- Se puede elegir manualmente una alternativa distinta, guardando justificación.

### 14.4. Pruebas CAME

- Una debilidad con calificación EFI `1` obtiene una señal de severidad mayor que una con calificación `4`, manteniendo iguales los demás criterios.
- La prioridad no depende solamente de `peso × calificación`.
- Cambiar un criterio actualiza el índice y el ranking.
- Si se cambian los pesos de criterios, la suma debe validarse.
- La acción “Falta de integración de procesos” puede adquirir prioridad alta cuando sus criterios y evidencia lo justifican.
- Toda acción tiene responsable, plazo e indicador antes de marcarse como aprobada.

### 14.5. Pruebas de exportación

- El PDF contiene los mismos totales que la interfaz.
- La orientación exportada coincide con la UI.
- La QSPM exporta AS, TAS y ranking.
- CAME exporta criterios, índice, categoría y responsables.
- Se incluyen advertencias y limitaciones.

---

## 15. Criterios de aceptación funcional

La implementación se considerará lista cuando:

- EFI y EFE calculen y validen los resultados sin discrepancias.
- La suma de pesos y el estado de cada matriz sean visibles.
- DAFO no dependa de cruzar automáticamente todos los pares.
- El usuario pueda evaluar y justificar relaciones relevantes.
- La herramienta sugiera FO, DO, FA o DA con una explicación y nivel de confianza.
- La herramienta pueda declarar que no existe una orientación concluyente.
- QSPM compare al menos tres alternativas.
- La estrategia seleccionada quede registrada con justificación.
- CAME priorice acciones mediante criterios configurables.
- Las debilidades graves no reciban prioridad media por una interpretación invertida del puntaje.
- El caso de la falta de integración pueda quedar sustentado como prioridad alta por evidencia y criterios.
- Las exportaciones contengan método, resultados, supuestos y advertencias.
- Existan pruebas para los casos críticos descritos en este documento.

---

## 16. Redacción metodológica recomendada para la tesis

La herramienta puede describirse de la siguiente manera:

> La matriz EFI se utilizó para evaluar los factores internos mediante la asignación de pesos relativos y calificaciones de uno a cuatro, calculando para cada factor el producto entre el peso y la calificación. La matriz EFE se aplicó con el mismo procedimiento, interpretando la calificación como el nivel de respuesta de la organización frente a cada oportunidad o amenaza.
>
> El análisis DAFO se empleó como marco para organizar los factores internos y externos y generar alternativas estratégicas. Las relaciones entre factores se valoraron de manera explícita según su fuerza y se documentaron mediante justificaciones y evidencias. La orientación resultante se interpretó como una recomendación de tipo FO, DO, FA o DA, sin considerarla por sí sola una selección definitiva.
>
> Las alternativas estratégicas se compararon mediante una Matriz Cuantitativa de Planificación Estratégica, asignando puntuaciones de atractivo frente a los factores ponderados. La alternativa seleccionada se convirtió en un plan CAME con acciones, responsables, recursos, plazos, indicadores y criterios de prioridad. Las ponderaciones y prioridades de la propuesta operativa se sometieron a validación de expertos.

Esta redacción evita afirmar que DAFO o CAME poseen una fórmula universal y deja claro qué parte corresponde al método clásico y qué parte corresponde al diseño operativo de la investigación.

---

## 17. Fuentes metodológicas de referencia

1. **Instituto Tecnológico y de Estudios Superiores de Monterrey.** Nota técnica sobre matrices EFI y EFE. Explica pesos, calificaciones, puntajes ponderados y comparación de fortalezas/debilidades y oportunidades/amenazas.  
   <https://cic.itesm.mx/DocumentosPrincipalAlumno/80e1373f-5a14-e8ea-aa85-76e0c4e7b468.pdf>

2. **Universidad Nacional Autónoma de Nicaragua.** Repositorio con aplicación de matrices estratégicas y referencia al intervalo de 1.0 a 4.0 y al valor medio de 2.5.  
   <https://repositorio.unan.edu.ni/id/eprint/8747/1/18793.pdf>

3. **Generalitat de Catalunya / Consorci per a la Formació Contínua de Catalunya.** Material sobre análisis DAFO y CAME, con énfasis en relevancia, recursos, responsables, plazos, indicadores y seguimiento.  
   <https://conforcat.gencat.cat/web/.content/documents/EMPRESA/HUB/EINES-Analisis-DAFO-CAME.pdf>

4. **Gürel, E. y Tat, M.** *SWOT Analysis: A Theoretical Review*. Revisión teórica que caracteriza SWOT como un marco cualitativo y descriptivo.  
   <https://www.sosyalarastirmalar.com/articles/swot-analysis-a-theoretical-review.pdf>

5. **Kurttila, M., Pesonen, M., Kangas, J. y Kajanus, M.** *Utilizing the analytic hierarchy process (AHP) in SWOT analysis — a hybrid method and its application to a forest-certification case*. Explica que SWOT identifica factores, pero no ofrece por sí solo una medida analítica suficiente de importancia o atractivo de alternativas.  
   <https://doi.org/10.1016/S1389-9341(99)00004-3>

6. **David, M. E., David, F. R. y David, F. R.** *The Quantitative Strategic Planning Matrix Applied to a Retail Computer Store*. Presenta QSPM, sus pasos, ventajas y limitaciones.  
   <https://digitalcommons.coastal.edu/cbj/vol8/iss1/4/>

7. **David, M. E., David, F. R. y David, F. R.** *The quantitative strategic planning matrix: a new marketing tool*. Presenta el uso de QSPM para comparar el atractivo relativo de alternativas estratégicas.  
   <https://doi.org/10.1080/0965254X.2016.1148763>

Las fuentes deben citarse en la tesis conforme al estilo bibliográfico exigido por la institución. La herramienta debe guardar las URL y la fecha de consulta en la exportación metodológica.

---

## 18. Decisiones que deben quedar visibles en la aplicación

La interfaz o el informe exportado debe declarar:

- Qué factores fueron incluidos.
- Cómo se obtuvieron los pesos.
- Quién asignó las calificaciones.
- Qué evidencias respaldan cada factor.
- Qué relaciones DAFO fueron evaluadas.
- Qué significa la escala de relación.
- Qué criterios y pesos se usaron en CAME.
- Qué alternativas entraron en QSPM.
- Quién asignó las puntuaciones de atractivo.
- Qué estrategia se seleccionó y por qué.
- Qué decisiones fueron automáticas y cuáles fueron validadas manualmente.
- Qué resultados son estándares metodológicos y cuáles son propuestas operativas.

Esta trazabilidad es tan importante como el número final.

---

## 19. Regla de oro para la implementación

La aplicación debe sugerir una orientación estratégica, pero nunca debe ocultar el camino que llevó a esa sugerencia.

La salida ideal no es solamente:

> “Estrategia DO recomendada”.

La salida ideal es:

> “Se sugiere una orientación DO adaptativa porque las relaciones validadas entre las debilidades D-08 y D-07 y las oportunidades O-01 y O-02 presentan el mayor índice relativo, con una cobertura del 82 % y una diferencia del 14 % respecto a la segunda orientación. Esta recomendación es provisional hasta completar la QSPM. Entre las alternativas evaluadas, EST-DO-01 obtuvo el mayor TAS y fue seleccionada por el equipo responsable.”

Ese es el nivel de explicación que permite utilizar la herramienta tanto para el análisis organizacional como para fundamentar una tesis.

---

## 20. Dashboard Estratégico de Investigaciones (Centro de Mando Multiexpediente)

### 20.1. Propósito y Alcance

El Dashboard Estratégico (`/dashboard/investigations`) constituye el centro neurálgico de inteligencia y analítica multi-investigación de NovaInvestigator. Su función es sintetizar en tiempo real el estado, la salud estratégica y la orientación dominante de todas las investigaciones y organizaciones analizadas en el tenant, permitiendo una visión panorámica y acceso ágil a cualquier expediente. El segmento raíz `/dashboard` redirige canónicamente a `/dashboard/investigations`.

### 20.2. Arquitectura de Componentes

1. **`src/app/(pages)/dashboard/investigations/page.tsx` (Capa 1: Routing & Auth):**
   - Página Server Component que sirve la subruta canónica `/dashboard/investigations`.
2. **`next.config.ts` (Redirección HTTP a nivel servidor):**
   - Redirección automática permanente (308) de `/dashboard` a `/dashboard/investigations`, siguiendo la misma convención que `/apps/users` -> `/apps/users/list` sin necesidad de archivos dummy intermedios.
3. **`src/views/dashboards/investigations/index.tsx` (Capa 2: View / Controller):**
   - Controlador de cliente conectado al contexto unificado `useInvestigatorAnalysis`.
   - Agrega métricas consolidadas a partir de la colección de `investigations` (remotas y locales).
4. **Módulos Visuales y Analíticos:**
   - **Tarjetas de KPIs Consolidados:**
     - Total de expedientes registrados y desglose por estado (*En análisis*, *Validada*, *Borrador*, *Archivada*).
     - Promedio global de evaluación interna **EFI** (1.0 - 4.0 con umbral de equilibrio 2.5).
     - Promedio global de evaluación externa **EFE** (1.0 - 4.0 con umbral de respuesta 2.5).
     - Total de factores estratégicos identificados (F, D, O, A) y cruces DAFO establecidos.
     - Tasa de avance del plan de acción CAME (acciones asignadas, pendientes y completadas).
   - **Matriz de Posicionamiento Estratégico (EFI vs EFE / IE Matrix):**
     - Gráfico interactivo de dispersión por cuadrantes (Recharts) que ubica los expedientes en los 4 cuadrantes metodológicos:
       - **Cuadrante I (FO - Ofensivo / Crecer y Construir):** EFI > 2.5, EFE > 2.5.
       - **Cuadrante II (DO - Adaptativo / Reorientar y Desarrollar):** EFI ≤ 2.5, EFE > 2.5.
       - **Cuadrante III (FA - Defensivo / Proteger y Consolidar):** EFI > 2.5, EFE ≤ 2.5.
       - **Cuadrante IV (DA - Supervivencia / Contener y Mitigar):** EFI ≤ 2.5, EFE ≤ 2.5.
   - **Balance y Distribución de Factores DAFO:**
     - Gráfico comparativo de pesos y cantidad de Fortalezas, Debilidades, Oportunidades y Amenazas.
   - **Monitor de Planes CAME:**
     - Desglose por tipo de acción (*Corregir*, *Afrontar*, *Mantener*, *Explotar*) y estado de prioridad.
   - **Feed de Expedientes Recientes:**
     - Tabla dinámica con filtrado rápido, badges semánticos, indicadores numéricos EFI/EFE, orientación sugerida y acceso directo mediante Sheet lateral o apertura en espacio de trabajo.
   - **Sheet Lateral de Dictamen Académico y Plan de Intervención CAME (`InvestigationSummarySheet`):**
      - Drawer deslizable lateral (`side='right'`, ancho generoso `sm:max-w-2xl md:max-w-3xl`) diseñado específicamente bajo un formato editorial de informe científico y fundamentación de tesis, estructurado en:
        1. **Ficha Técnica y Protocolo:** Título de la investigación, organización objeto de estudio, unidad analizada, investigador responsable, fecha de corte y estado formal del dictamen (Validada, En análisis, Archivada).
        2. **Dictamen y Fundamentación Matricial (Narrativa en Prosa):** Redacción continua y fundamentada del resultado cuantitativo de las matrices EFI y EFE respecto al umbral teórico de 2.50, explicando en lenguaje académico la posición interna (solidez vs vulnerabilidad), la respuesta al entorno (favorable vs adverso) y la orientación relacional DAFO dominante resultante.
        3. **Decisión Estratégica Formal (Matriz QSPM):** Identificación de la alternativa seleccionada (`EST-...`), alcance operativo y fundamentación cualitativa registrada por el comité evaluador.
        4. **Plan de Intervención CAME (Operacionalización de la Estrategia):** Fichas narrativas de propuesta de intervención clasificadas en Corregir (C) Debilidades, Afrontar (A) Amenazas, Mantener (M) Fortalezas y Explotar (E) Oportunidades, detallando para cada una: Acción formulada, Objetivo específico, Responsable institucional, Indicador de verificación, Meta medible y Nivel de prioridad.
        5. **Navegación al Espacio de Trabajo:** Enlace directo para abrir la investigación completa en el entorno de edición.

---

## 21. Gating comercial del sidebar (candado + tag de plan)

### 21.1. Propósito

El sidebar debe anticipar el bloqueo comercial antes del clic: si un usuario no tiene acceso a una app del grupo **Apps** porque su plan no incluye el módulo que la habilita, la app **permanece visible pero bloqueada** con un candado y una etiqueta que muestra el **plan mínimo real** que la incluye (ej. `Team`). El clic conduce directamente a `/pages/pricing`, alineado con el guard de servidor existente en los layouts de las apps (`requireModuleAccess` → `redirect('/pages/pricing')`).

Esto cierra el hueco detectado con la app `Projects`: el sidebar no tenía requisito declarado para ella, por lo que se mostraba siempre y el bloqueo solo ocurría en el clic.

### 21.2. Estados del ítem de app en el sidebar

| Estado | Condición | Render |
| --- | --- | --- |
| `allowed` | El ítem no exige módulo, o `snapshot.status === 'active'` y `snapshot.modules` incluye el módulo requerido. | Ítem normal, navegable. |
| `locked` | El ítem declara `moduleKey` (o mapeo por label en `APP_ACCESS_BY_LABEL`) y el módulo **no** está en `snapshot.modules` (por plan, trial o `status` distinto de `active`). | Ítem visible con estilo atenuado, **candado**, **tag del plan mínimo** que incluye el módulo (si existe) y enlace a `/pages/pricing`. |
| `hidden` | El ítem exige una `capability` RBAC y el usuario no la tiene. | Oculto (comportamiento histórico, sin cambiar). |

Reglas de presentación:

- Durante la carga inicial del snapshot (`loading` o `snapshot === null`) los ítems con requisito de módulo se ocultan para evitar parpadeo de candados.
- Si el `status` es `expired`, todos los ítems comerciales aparecen `locked`, reflejando el mismo mensaje del `CommercialAccessGate`.
- El tag muestra el **nombre del plan real** (dato del catálogo de `/api/billing/plans`), no el branding heredado del template `'Pro'`.
- Si ningún plan activo incluye el módulo, se muestra solo el candado, sin tag.
- La distinción candado-vs-oculto es un tema de **plan**; los ítems bloqueados por rol (`capability`) siguen ocultándose.

### 21.3. Fuente de verdad y flujo de datos

1. `snapshot.modules` (resuelto por `resolveEffectiveAccessSnapshot`, `/api/access/effective`) decide `allowed` vs `locked` por módulo. Los módulos que no existen en `public.platform_modules` con `is_active = true` se filtran en `filterInactiveModuleEntitlements`.
2. El **plan mínimo por módulo** se calcula en el cliente a partir del catálogo público `/api/billing/plans` (`pickCheapestPlanForModule`): entre los planes activos cuyo `features` incluya `modules.<key>`, el de menor precio mensualizado (excluye `one_time`).
3. La declaración del requisito por app vive en el propio ítem del menú (`moduleKey` en `src/configs/navConfig.tsx`), con respaldo del mapeo legacy `APP_ACCESS_BY_LABEL` (`src/configs/permissions.ts`).
4. La UI **nunca** es la única barrera: el guard de dominio se ejecuta en el layout de cada app (`requireModuleAccess('kanban')` en `/apps/kanban/layout.tsx`), con redirect a `/pages/pricing`.

### 21.4. Requisitos de catálogo (base de datos)

- Toda app con gating requiere fila activa en `public.platform_modules` (`module_key`, `route_prefix`, `is_active`). La migración `2026-08-16T12-00-00_sidebar_module_gating.sql` garantiza la fila `kanban` (idempotente, `on conflict do nothing`).
- Los entitlements `modules.<key>` por plan **son configuración de negocio** gestionada desde el panel de administración (`/apps/platform/billing`, pestaña Planes → Selector Inteligente de Módulos). Las migraciones **no** inyectan ni modifican entitlements de planes existentes.
- Al desactivar/eliminar el entitlement `modules.<key>` de un plan (o del trial policy / one-time grant), el sidebar muestra automáticamente el candado del ítem correspondiente sin tocar código: el motor es 100 % gobernado por la base de datos, igual que el motor de pricing.

### 21.5. Procedimiento para incorporar una app futura

1. Crear la app y su ruta bajo `/apps/<key>`.
2. Agregar fila activa en `public.platform_modules` (migración) con `route_prefix` correcto.
3. Declarar `moduleKey: '<key>'` en el ítem del grupo Apps de `navConfig.tsx`.
4. Añadir el guard `requireModuleAccess('<key>')` en el layout de la app (redirect a `/pages/pricing`).
5. Habilitar `modules.<key>` en los planes correspondientes desde el panel de administración.

Con esto, el candado, el tag del plan mínimo y el bloqueo de servidor quedan activos sin código adicional.

### 21.6. Archivos implicados

- `src/configs/navConfig.tsx` — tipo `MenuItem` con `moduleKey?: string`; ítems `Projects` (`kanban`) e `Investigator` (`investigator`).
- `src/configs/permissions.ts` — `getAppItemAccess(item, hasCapability, hasModule): 'allowed' | 'locked' | 'hidden'`.
- `src/lib/billing/plan-catalog.ts` — `pickCheapestPlanForModule(plans, moduleKey)` (función pura).
- `src/hooks/use-plan-catalog.ts` — fetch del catálogo público de planes (`/api/billing/plans`).
- `src/components/layout/Sidebar.tsx` — render de ítems bloqueados: candado (`LockKeyholeIcon`), badge con nombre del plan mínimo y enlace a `/pages/pricing`.
- `supabase/migrations/2026-08-16T12-00-00_sidebar_module_gating.sql` — fila `kanban` en `public.platform_modules`.
