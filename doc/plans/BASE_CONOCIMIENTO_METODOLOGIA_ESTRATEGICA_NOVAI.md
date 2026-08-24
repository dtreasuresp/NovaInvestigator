# Base de Conocimiento Maestra de Metodología y Diagnóstico Estratégico (NovAi)

**Versión Canónica:** 1.0.0  
**Ámbito:** NovaStore ERP / NovaInvestigator — Motor Cognitivo de NovAi  
**Autoridad:** Documento Maestro de Referencia Epistemológica y Metodológica  

---

## 1. Fundamentos Epistemológicos del Diagnóstico Estratégico

El diagnóstico estratégico en NovaInvestigator se fundamenta en la teoría de administración estratégica cuantitativa (Fred R. David, H. Igor Ansoff, Michael Porter) combinada con el análisis de impacto cruzado matricial y la planificación adaptativa de contingencias (CAME).

El propósito de NovAi no es generar texto plausible ni complacer las premisas preconcebidas del usuario, sino **actuar como un Auditor y Consultor Estratégico Senior** que aplica con rigor científico el principio de causalidad, evidencia demostrada y coherencia sistémica.

---

## 2. Matriz EFI (Evaluación de Factores Internos)

### 2.1 Definición y Propósito
Evalúa las fuerzas y debilidades críticas en las áreas funcionales de una organización (Gestión/Liderazgo, Operaciones, Finanzas, Talento Humano, Tecnología, Comercial/Marketing).

### 2.2 Reglas Matemáticas y Axiomas Deterministas
1. **Ponderación ($w_i \in [0.01, 1.00]$):** Refleja la importancia relativa del factor para tener éxito en la industria o sector, independientemente de si es una fortaleza o debilidad.
   $$\sum_{i=1}^{n} w_i = 1.00 \quad (\text{Estrictamente } 1.00 \pm 0.001)$$
2. **Clasificación / Calificación ($r_i \in \{1, 2, 3, 4\}$):**
   - **$1$ = Debilidad Mayor / Crítica:** Vulnerabilidad grave que compromete la viabilidad o desempeño fundamental.
   - **$2$ = Debilidad Menor:** Deficiencia subsanable que genera ineficiencias o desventajas temporales.
   - **$3$ = Fortaleza Menor:** Capacidad positiva estándar superior al promedio.
   - **$4$ = Fortaleza Mayor / Distintiva:** Ventaja competitiva núcleo, difícil de replicar.
   *(Nota: Una debilidad NUNCA recibe 3 o 4; una fortaleza NUNCA recibe 1 o 2).*
3. **Puntuación Ponderada ($P_i = w_i \times r_i$):**
   $$\text{Total EFI} = \sum_{i=1}^{n} (w_i \times r_i)$$
4. **Umbral de Interpretación:**
   - $\text{Total EFI} < 2.50$: Organización internamente débil frente a su sector.
   - $\text{Total EFI} = 2.50$: Posición interna promedio / neutra.
   - $\text{Total EFI} > 2.50$: Organización internamente sólida y con capacidades distintivas.

---

## 3. Matriz EFE (Evaluación de Factores Externos)

### 3.1 Definición y Propósito
Evalúa la capacidad de respuesta de la organización frente a las fuerzas del macroentorno (PESTEL: Político, Económico, Social, Tecnológico, Ecológico, Legal) y del microentorno competitivo (5 Fuerzas de Porter).

### 3.2 Reglas Matemáticas y Axiomas Deterministas
1. **Ponderación ($w_j \in [0.01, 1.00]$):**
   $$\sum_{j=1}^{m} w_j = 1.00$$
2. **Capacidad de Respuesta ($r_j \in \{1, 2, 3, 4\}$):**
   - **$1$ = Respuesta Deficiente:** La empresa no está respondiendo a la oportunidad/amenaza.
   - **$2$ = Respuesta Regular / Promedio:** Respuesta reactiva o insuficiente.
   - **$3$ = Respuesta Buena / Superior al promedio:** Estrategia orientada a capitalizar o mitigar el factor.
   - **$4$ = Respuesta Excelente / Sobresaliente:** Posicionamiento proactivo de liderazgo ante el factor externo.
3. **Puntuación Ponderada Total:**
   $$\text{Total EFE} = \sum_{j=1}^{m} (w_j \times r_j)$$
4. **Umbral de Interpretación:**
   - $\text{Total EFE} < 2.50$: Estrategias actuales no capitalizan oportunidades ni neutralizan amenazas.
   - $\text{Total EFE} \ge 2.50$: Organización con estrategias efectivas frente al entorno.

---

## 4. Matriz DAFO / FODA de Impacto Cruzado

### 4.1 Naturaleza del Impacto Cruzado
La matriz DAFO no es una lista estática, sino una **matriz de interacciones causales de segundo orden** donde cada factor interno se cruza con cada factor externo.

### 4.2 Los 4 Cuadrantes Estratégicos

| Cuadrante | Cruce | Postura Estratégica | Pregunta Guía Metodológica |
| :--- | :--- | :--- | :--- |
| **FO (Maxi-Maxi)** | Fortalezas $\times$ Oportunidades | **Ofensiva / Crecimiento** | ¿En qué medida esta Fortaleza interna permite explotar y capitalizar activamente esta Oportunidad externa? |
| **DO (Mini-Maxi)** | Debilidades $\times$ Oportunidades | **Adaptativa / Reorientación** | ¿En qué medida superar esta Debilidad interna nos habilita para no perder esta Oportunidad externa? |
| **FA (Maxi-Mini)** | Fortalezas $\times$ Amenazas | **Defensiva / Blindaje** | ¿En qué medida esta Fortaleza interna sirve como escudo o ventaja para mitigar o neutralizar esta Amenaza externa? |
| **DA (Mini-Mini)** | Debilidades $\times$ Amenazas | **Supervivencia / Contención** | ¿En qué medida esta Debilidad interna nos deja expuestos o amplifica la gravedad del impacto de esta Amenaza externa? |

### 4.3 Escala Rigurosa de Intensidad / Fuerza de Relación ($0, 1, 2, 3$)

```text
[0] NULA: No existe vínculo causal directo ni indirecto relevante entre ambos factores.
[1] BAJA / INDIRECTA: Existe una relación tangencial, secundaria o dependiente de múltiples condiciones externas.
[2] MEDIA / MODERADA: Existe una correlación demostrable y un impacto relevante en el desempeño operativo o comercial.
[3] ALTA / DIRECTA Y CRÍTICA: Existe una relación causal directa, determinante y prioritaria para la supervivencia o el crecimiento.
```

### 4.4 Axiomas de Juicio Crítico y Auditoría Causal (Anti-Sycophancy)

1. **Axioma DA de Vulnerabilidad Concurrente:**
   *Si una organización presenta una debilidad crítica (ej. fuga o desgaste de personal clave) y el entorno presenta una amenaza directa en el mismo dominio (ej. agresivo crecimiento de la competencia captando talento), la intensidad del cruce DA NO PUEDE SER 0.* Evaluarlo en 0 constituye un sesgo de ceguera estratégica, salvo que exista evidencia explícita de un mecanismo aislante ya implementado.
2. **Axioma FO de Apalancamiento:**
   *Una fortaleza de calificación 4 enfrentada a una oportunidad de alta ponderación con la que comparte canal o competencia núcleo debe reflejar una fuerza $\ge 2$.*
3. **Axioma de Justificación Obligatoria:**
   *Toda calificación de fuerza (0, 1, 2, 3) debe sustentarse en la interacción de los mecanismos operativos de ambos factores, no en suposiciones externas no demostradas.*

---

## 5. Matriz Cuantitativa de Planificación Estratégica (QSPM)

### 5.1 Propósito
Determinar el atractivo relativo de opciones estratégicas alternativas factibles basándose en los factores críticos de éxito internos y externos.

### 5.2 Escala de Atractivo ($AS$: *Attractiveness Score*)
- $1$ = No es atractiva.
- $2$ = Algo atractiva.
- $3$ = Razonablemente atractiva.
- $4$ = Altamente atractiva.
- *N/A o 0* = El factor no influye en la elección de esta estrategia concreta.

### 5.3 Cálculo de Puntuación Total ($TAS$)
$$\text{TAS}_{ij} = w_i \times \text{AS}_{ij}$$
$$\text{Total QSPM}_j = \sum_{i=1}^{k} \text{TAS}_{ij}$$
La estrategia con el mayor $\text{Total QSPM}$ representa la opción cuantitativamente más respaldada por los factores de diagnóstico.

---

## 6. Marco de Ejecución CAME

El plan CAME traduce el diagnóstico en acciones tácticas de transformación:
- **C - Corregir Debilidades:** Eliminar o mitigar deficiencias internas.
- **A - Afrontar Amenazas:** Diseñar contingencias y escudos ante riesgos del entorno.
- **M - Mantener Fortalezas:** Proteger y robustecer las ventajas competitivas.
- **E - Explotar Oportunidades:** Desplegar recursos para capturar cuota y crecimiento.

---

## 7. Protocolo de Razonamiento Senior para NovAi (Evidence & Contradiction)

Al interactuar con usuarios, NovAi debe clasificar sus aserciones en 4 categorías epistemológicas:

1. **HECHO / EVIDENCIA (Ground Truth):**
   Dato registrado explícitamente en el expediente (ej. *"Rotación del 18% registrada en el factor D-03"*).
2. **INFERENCIA METODOLÓGICA:**
   Deducción lógica basada en los axiomas de EFI/EFE/DAFO (ej. *"Dado que D-03 es una debilidad de talento y A-02 es presión competitiva de contratación, el cuadrante DA exige contención inmediata"*).
3. **HIPÓTESIS DE TRABAJO:**
   Escenario plausible pero no verificado directamente en la base de datos (debe explicitarse: *"Como hipótesis de trabajo sujeta a validación en campo..."*).
4. **RECOMENDACIÓN ACCIONABLE:**
   Propuesta directiva o estratégica alineada con CAME/QSPM.

### Directiva Canónica Anti-Complacencia:
> Si el usuario o el expediente clasifica un cruce, ponderación o factor de manera contraria a las evidencias y axiomas metodológicos, **NovAi no debe inventar justificaciones para legitimar el error**. NovAi debe señalar con respeto, claridad y rigor técnico la discrepancia, fundamentar por qué la evaluación es inconsistente y sugerir el ajuste metodológico correspondiente.
