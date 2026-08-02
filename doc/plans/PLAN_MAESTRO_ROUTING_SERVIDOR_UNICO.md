# PLAN MAESTRO — Enrutamiento por URL + Servidor Único

**Proyecto:** Análisis Estratégico EFI/EFE/DAFO/CAME (React 19 + Vite 7 + Flask)
**Fecha:** 2026-08-02
**Estado:** Frontend implementado y verificado (Fases 0–1 completadas, build verde, smoke test con Edge headless). Backend pendiente (Fase 2).

---

## 1. Objetivo

1. **Rutas en la URL** para cada pantalla de la app: `/setup`, `/app`, `/app/context`, `/app/summary`, `/app/efi`, `/app/efe`, `/app/dafo`, `/app/qspm`, `/app/came`.
2. **Un solo servidor y un solo puerto (5000)** para el wizard y la app, en lugar de dos puertos (5001 wizard / 5000 app).
3. El asistente de configuración se muestra **solo en el primer uso** (dependencias no instaladas); si la app ya está configurada, arranca directo.
4. El **portable offline nunca muestra el wizard** (autocontenido); `/setup` solo existe como página de diagnóstico.

---

## 2. Arquitectura objetivo

### 2.1. Esquema de URLs

```
http://localhost:5000            (UN solo puerto, siempre)
├── /setup                       → Wizard React (ruta dentro de la SPA)
└── /app                         → AppLayout (shell: topbar + sidebar) → redirige a /app/context
    ├── /app/context             → ContextView      (contexto/investigación)
    ├── /app/summary             → OverviewView     (resumen, hoy "overview")
    ├── /app/efi                 → FactorView       (factores internos)
    ├── /app/efe                 → FactorView       (factores externos)
    ├── /app/dafo                → DafoView
    ├── /app/qspm                → QspmView
    └── /app/came                → CameView
```

- Cualquier otra ruta (`*`) → redirige a `/app/context`.
- `/` → redirige a `/app/context`.
- Los dos servidores (Flask y bootstrap stdlib) sirven **el mismo dist SPA** con fallback a `index.html` para rutas sin archivo físico (deep links, refresco, bookmarks).

### 2.2. Flujo de arranque por escenario

| Escenario | Qué pasa al ejecutar el launcher |
|---|---|
| Instalada, primer uso (deps faltantes) | `iniciar.bat` → detecta que faltan deps → `setup_server.py` (stdlib) en **5000** → wizard en `http://localhost:5000/setup` → instala → "Iniciar Aplicación" → **handoff** (cierra su listener, lanza `server.py`) → navegador espera `/api/health` → navega a `/app/context` |
| Instalada, ya configurada | `iniciar.bat` → check de deps OK → lanza `server.py` (Flask) en 5000 → el bat muestra "se abrirá en 10 segundos" (tecla = abrir ya) → navegador abre `/app/context` |
| App ya corriendo (5000 ocupado) y se ejecuta `iniciar.bat` | `setup_server.py` detecta que `/api/health` responde en 5000 → abre el navegador en `/app/context` y sale (no inicia otro wizard) |
| **Portable offline** | `iniciar_portable.bat` → exe directo (sin check de deps, sin wizard) → el bat muestra "se abrirá en 10 segundos" (tecla = abrir ya) → navegador abre `/setup` (**pantalla de bienvenida**: "Todo en orden" + cuenta atrás 20 s → redirige a `/app/context`) |

### 2.3. Decisiones tomadas (con el usuario)

| Decisión | Valor |
|---|---|
| ¿Cuándo aparece el wizard? | Solo primer uso (deps no instaladas). `/setup` en modo full/portable muestra **pantalla "Todo en orden"** con botón "Ir a la aplicación" |
| Bienvenida portable | El navegador abre `/setup` solo en el **portable**: pantalla "Todo en orden" con **cuenta atrás de 20 s** y redirección automática a `/app/context` (botón "Ir a la aplicación ahora" cancela la espera). En modo full se abre `/app/context` directo |
| Launchers | Ambos bats (`iniciar.bat`, `iniciar_portable.bat`) muestran *"La aplicación se abrirá en tu navegador en 10 segundos; presiona cualquier tecla para abrirla ahora"* (`timeout /t 10`) y abren el navegador ellos mismos vía `start "" http://localhost:<puerto>/<ruta>` (el puerto lo leen de un archivo que escribe el servidor: env `PORT_FILE` en `%TEMP%`) |
| ¿Dónde vive el wizard durante una instalación desde cero? | **Mismo puerto 5000** (handoff de listener) |
| Estructura de vistas en código | **Una carpeta por ruta** (`src/app/(pages)/<ruta>/` — route group estilo Next.js; el wizard NO va en `(pages)`) |
| Skill de React Router | `react-router-declarative-mode` instalada en `.agents/skills/` (el `-g` global falló: "PromptScript does not support global skill installation") |
| Portable | Jamás muestra wizard; `iniciar_portable.bat` abre el navegador con mensaje de 10 s (ver "Bienvenida portable") |

---

## 3. Estado actual (diagnóstico)

### 3.1. Frontend (`src/App.jsx`, 1314 líneas)

- **Sin router.** Navegación por estado: `const [activeStage, setActiveStage] = useState('overview')` (L243) con valores `'context' | 'overview' | 'efi' | 'efe' | 'dafo' | 'qspm' | 'came'`.
- Render condicional en `<main className="main-content">` (L597–605): 7 bloques `{activeStage === 'x' && <View />}`.
- Sidebar (L557–595): botón "Contexto" (L567–576) + mapeo de `NAV_ITEMS` (L577–589), ambos con `setActiveStage`.
- `NAV_ITEMS` (L32–39): `overview`(00), `efi`, `efe`, `dafo`, `qspm`, `came`.
- **Todo el estado vive en `App`** (L240–246): `workspace`, `state`, `investigations`, `activeStage`, `showHelp`, `showResearchManager`, `exportStatus`.
- Derivados (L256–259): `analysis = calculateAnalysis(state)`, `validation = validateInvestigation(...)`, `selectedStrategy`, `selectedResult`.
- Núcleo de escritura: `commitState(producer, reason, requestedStatus)` (L261) + handlers de actualización (L277–495): `updateFactor`, `updateMetadata`, `updateRelationship`, `addRelationship`, `updateQspmScore`, `updateStrategy`, `updateCameAction`, `saveCameAction`, `updateCameCriterion`, `selectStrategy`, `updateSelectionJustification`, `confirmSelection`, gestión de investigaciones (`createNewResearch`, `loadDemo`, `clearAnalysis`, `openResearch`, `duplicateResearch`, `archiveResearch`, `restoreResearch`, `closeResearch`, `renameResearch`).
- Exportación: `exportPdf` (L495–518) → `createReportModel` (L138) + `renderReportHtml` (L152–237, CSS embebido con `@page A4`) → `POST /generar-pdf`.
- Helpers de módulo (L32–137): `cloneState`, `normalizeStoredState`, `readWorkspace`/`persistWorkspace` (localStorage `matriz-dafo-workspace-v1`, L55), `historyEntryFor`, `withHistory`, `statusForChange`, `escapeHtml`, `reportValue`, `reportFactorRows`.
- Imports: `useState/useEffect` (L1), 13 iconos lucide-react (L2–16), funciones de `./domain.js` (L17–29; **`INVESTIGATION_STATUSES` es import muerto**, L18), `./styles.css` (L30).

**Componentes React (líneas actuales en App.jsx):**

| Componente | Líneas | Destino |
|---|---|---|
| `App` (raíz: estado, handlers, layout, sidebar, switch) | 239–613 | Se descompone |
| `ValidationSummary` | 615–637 | `src/components/ValidationSummary.jsx` |
| `StageStatus` | 638–643 | `src/components/StageStatus.jsx` |
| `PageHeader` | 644–656 | `src/components/PageHeader.jsx` |
| `ContextView` | 657–711 | `src/app/(pages)/context/index.jsx` |
| `ResearchManager` (modal) | 712–775 | `src/components/ResearchManager.jsx` |
| `OverviewView` | 776–854 | `src/app/(pages)/summary/index.jsx` |
| `FactorView` + `FactorRow` + `FactorList` | 855–907 | `src/app/(pages)/efi/index.jsx` y `src/app/(pages)/efe/index.jsx` (FactorView con prop `factorType`) |
| `DafoView` + `DafoMatrix` + `DafoExploratoryMatrix` + `DafoExploratorySubtotal` + `DafoStrategyAnalysis` + `FactorStack` + `RelationshipComposer` + `RelationRow` + `DAFO_MATRIX` | 908–930, 931–970, 972–1033, 1034–1040, 1041–1106, 1103–1105, 1107–1125, 1184–1187 | `src/app/(pages)/dafo/index.jsx` |
| `ChartDeck` + `ChartBar` + `RadarChart` + `PriorityChart` | 1126–1183 | `src/components/charts.jsx` (compartida resumen + DAFO) |
| `QspmView` + `QspmRow` | 1189–1210 | `src/app/(pages)/qspm/index.jsx` |
| `CameView` + `CameDistribution` + `CameRow` + `priorityLabel` | 1211–1267 | `src/app/(pages)/came/index.jsx` |
| `MetricCard` | 1268–1271 | `src/app/(pages)/summary/index.jsx` |
| `PanelHeading`, `Notice` | 1272–1275, 1297–1300 | `src/components/` |
| `TraceNode`, `QuadrantBar`, `QuadrantCard` | 1276–1287 | `src/app/(pages)/summary/index.jsx` |
| `StrategyCard`, `QspmRanking` | 1288–1296 | `src/app/(pages)/qspm/index.jsx` |
| `HelpModal` | 1301–1312 | `src/components/HelpModal.jsx` |

- CSS: clases existentes en `styles.css` cubren todo el layout (`app-shell`, `topbar`, `workspace-grid`, `sidebar`, `stage-nav`, `stage-nav-item`, `.is-active`, `main-content`, clases por vista). **No se toca CSS salvo adiciones mínimas.**

### 3.2. Wizard React (`src/setup/App.jsx`, 446 líneas)

- Componente `SetupWizard`, CSS propio `setup.css` (importa `tokens.css`), API por fetch a `${API_BASE}/api/...` (mismo origen).
- Pasos 1–4; APIs: `/api/check-all`, `/api/install` (POST), `/api/port/<n>`, `/api/ports/available`, `/api/start-app` (POST).
- Tras `startApp` OK hoy abre pestaña nueva (`window.open(result.url)`).

### 3.3. Backend

- **`server.py`** (Flask + Waitress, 272 líneas): sirve `frontend/dist` con fallback SPA (L172–182, hoy responde 503 si falta dist), `POST /generar-pdf` (L185–223), `POST /generar-pdf-local` (L226–250). `BROWSER_PATHS` (L36–47). `main()` (L253–272): `FLASK_PORT` env, `OPEN_BROWSER=1` → `abrir_navegador_cuando_este_listo` abre `http://localhost:{port}`.
- **`setup_server.py`** (stdlib http.server, ~400 líneas): puerto `SETUP_PORT = 5001` (fallback 5011–5020), sirve `frontend/dist` (redirect `/` → `/setup.html`), APIs del wizard (GET `/api/check-all`, `/api/check/<name>`, `/api/port/<n>`, `/api/ports/available`; POST `/api/install`, `/api/start-app`). `REQUIRED_PACKAGES` (flask≥3.0.0, waitress≥3.0.0, matplotlib≥3.8.0, numpy≥1.24.0, pillow≥10.0.0). `_handle_start_app` lanza `server.py` con `FLASK_PORT` y espera a que responda el puerto.
- **`iniciar.bat`**: selecciona intérprete (`.venv` > `py -3` > `python`), auto-build si falta `frontend\dist\setup.html` (a ajustar), ejecuta `setup_server.py`.
- **`iniciar_portable.bat`** (raíz y copia en `offline/`): lanza el exe con `OPEN_BROWSER=1`. **NO se toca.**
- **`preparar_portable_offline.bat`**: PyInstaller `--onedir` con `frontend\dist` (sin templates/static desde el refactor anterior).

---

## 4. FRONTEND — React Router (declarativo)

### 4.1. Dependencias

```bash
npx skills add remix-run/agent-skills@react-router-declarative-mode -g -y
npm install react-router-dom   # v7, modo declarativo
```

### 4.2. Estructura final de carpetas

```
src/
├── main.jsx                    # StrictMode + BrowserRouter + <App/>
├── App.jsx                     # SOLO rutas (<Routes/>) + lazy/Suspense + AnalysisProvider
├── domain.js                   # sin cambios
├── styles.css / tokens.css     # + clase mínima .route-loading (hecho)
├── state/
│   ├── AnalysisContext.jsx     # TODO el estado + handlers + derivados (useMemo)
│   └── workspace.js            # helpers puros + storage + reporte PDF (createReportModel/renderReportHtml)
├── app/                        # una carpeta por ruta; (pages) = route group (no afecta URL)
│   ├── constants.js            # NAV_ITEMS (summary/efi/efe/dafo/qspm/came), STAGE_ROUTES, TYPE_LABELS, CAME_LABELS
│   ├── layout.jsx              # AppLayout: topbar + sidebar (NavLink) + <Outlet/> + modales + toast
│   └── (pages)/
│       ├── context/index.jsx   # ContextPage
│       ├── summary/index.jsx   # SummaryPage + MetricCard + TraceNode + QuadrantBar + QuadrantCard
│       ├── efi/index.jsx       # EfiPage + FactorView + FactorRow + FactorList
│       ├── efe/index.jsx       # EfePage + FactorView + FactorRow + FactorList
│       ├── dafo/index.jsx      # DafoPage + DafoMatrix + DafoExploratory* + DafoStrategyAnalysis + RelationshipComposer + RelationRow (QuadrantCard importado de ../summary)
│       ├── qspm/index.jsx      # QspmPage + QspmRow + StrategyCard + QspmRanking
│       └── came/index.jsx      # CamePage + CameDistribution + CameRow + priorityLabel
├── components/
│   ├── PageHeader.jsx  PanelHeading.jsx  Notice.jsx  StageStatus.jsx
│   ├── ValidationSummary.jsx  ResearchManager.jsx  HelpModal.jsx
│   └── charts.jsx              # ChartDeck + ChartBar + RadarChart + PriorityChart
└── setup/
    ├── App.jsx                 # SetupWizard (ruta /setup, fuera del AppLayout; import EAGER — crítico de arranque)
    └── setup.css               # se mantiene (main.jsx eliminado)
```

### 4.3. Definición de rutas (`src/App.jsx`)

```jsx
import { Navigate, Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import AnalysisProvider from './state/AnalysisContext.jsx';

const ContextView = lazy(() => import('./views/context/index.jsx'));
const SummaryView = lazy(() => import('./views/summary/index.jsx'));
const EfiView     = lazy(() => import('./views/efi/index.jsx'));
const EfeView     = lazy(() => import('./views/efe/index.jsx'));
const DafoView    = lazy(() => import('./views/dafo/index.jsx'));
const QspmView    = lazy(() => import('./views/qspm/index.jsx'));
const CameView    = lazy(() => import('./views/came/index.jsx'));
const SetupWizard = lazy(() => import('./setup/App.jsx'));

function App() {
  return (
    <AnalysisProvider>
      <Suspense fallback={<div className="route-loading" />}>
        <Routes>
          <Route path="/setup" element={<SetupWizard />} />
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Navigate to="context" replace />} />
            <Route path="context" element={<ContextView />} />
            <Route path="summary" element={<SummaryView />} />
            <Route path="efi" element={<EfiView />} />
            <Route path="efe" element={<EfeView />} />
            <Route path="dafo" element={<DafoView />} />
            <Route path="qspm" element={<QspmView />} />
            <Route path="came" element={<CameView />} />
          </Route>
          <Route path="/" element={<Navigate to="/app/context" replace />} />
          <Route path="*" element={<Navigate to="/app/context" replace />} />
        </Routes>
      </Suspense>
    </AnalysisProvider>
  );
}
```

- `main.jsx`: `createRoot(...).render(<StrictMode><BrowserRouter><App/></BrowserRouter></StrictMode>)`.
- `route-loading`: clase nueva mínima en `styles.css` (spinner simple o texto).
- **Requisito**: `vite.config.js` debe tener `server.historyApiFallback` implícito (Vite dev lo hace solo); en producción lo resuelve el fallback SPA de los servidores (ver §5).

### 4.4. `src/state/AnalysisContext.jsx` (corazón del refactor)

1. **Mover desde `App.jsx`**: todos los `useState` (workspace, state, investigations, showHelp, showResearchManager, exportStatus), el `useEffect` de persistencia (L248–254), los derivados `analysis`/`validation`/`selectedStrategy`/`selectedResult` (L256–259), y TODOS los handlers (L261–518).
2. **API del context** (expone):
   - Datos: `state, workspace, investigations, analysis, validation, selectedStrategy, selectedResult`.
   - UI: `showHelp, setShowHelp, showResearchManager, setShowResearchManager, exportStatus, setExportStatus`.
   - Escritura: `commitState, updateFactor, updateMetadata, updateRelationship, addRelationship, updateQspmScore, updateStrategy, updateCameAction, saveCameAction, updateCameCriterion, selectStrategy, updateSelectionJustification, confirmSelection`.
   - Investigaciones: `createNewResearch, loadDemo, clearAnalysis, openResearch, duplicateResearch, archiveResearch, restoreResearch, closeResearch, renameResearch`.
   - Exportación: `exportPdf`.
   - Helpers: `navigateTo(stageId)` → `navigate('/app/' + stageId)` (para `onNavigate` de ValidationSummary/OverviewView/ContextView).
3. **Optimización**: `analysis` y `validation` con `useMemo` dependientes de `state` (hoy se recalculan en cada render).
4. Los helpers puros de módulo (L32–137) se quedan en el archivo del context (o se mueven a `src/state/workspace.js` si se prefiere).
5. Eliminar el import muerto `INVESTIGATION_STATUSES`.
6. `createDemoState`/`createBlankState`/`normalizeStoredState` siguen viniendo de `domain.js`.

### 4.5. `src/layout/AppLayout.jsx`

- Renderiza: `header.topbar` (L522–554, incluido botón **Exportar PDF** que llama a `exportPdf` del context), `div.workspace-grid` con `aside.sidebar` + `main.main-content`.
- **Sidebar** (reemplaza L557–595):
  - "Contexto": `<NavLink to="/app/context" className={...is-active...}>` con `StageStatus` de validación.
  - `NAV_ITEMS` (renombrar `overview` → `summary`): `<NavLink to={'/app/' + item.id}>` + `StageStatus`.
  - `ValidationSummary` con `onNavigate={(stage) => navigate('/app/' + stage)}`.
- `<main className="main-content"><Outlet /></main>`.
- Modales `HelpModal` y `ResearchManager` + `toast` (output.toast) + `PageHeader` se usan dentro de las vistas.
- `onNavigate` del contexto se usa donde hoy hay `setActiveStage('x')`:
  - `ContextView` "Continuar" (L598: `setActiveStage('efi')`) → `navigate('/app/efi')`.
  - `ValidationSummary` salto por etapa → `navigate('/app/<stage>')`.
  - `OverviewView`/`MetricCard` (L805–808, L837) → `navigate('/app/summary'|'/app/<x>')`.
  - `createNewResearch` (L397) → `navigate('/app/context')`; `loadDemo` (L404), `openResearch` (L415), `duplicateResearch` (L434) → idem.

### 4.6. Extracción de vistas (movimientos exactos)

Ver tabla §3.1 (columna "Destino"). Reglas:

- Cada `src/app/(pages)/<ruta>/index.jsx` exporta por defecto el componente de la vista y mueve consigo sus subcomponentes privados.
- `FactorView` recibe `factorType="internal" | "external"` como prop y mapea los labels (TYPE_LABELS ya existe).
- `ChartDeck` (y ChartBar/RadarChart/PriorityChart) → `src/components/charts.jsx` (usada por summary y dafo).
- `PageHeader`, `PanelHeading`, `Notice`, `StageStatus`, `ValidationSummary`, `HelpModal`, `ResearchManager` → `src/components/`.
- `activeStage` desaparece por completo (grep final: cero ocurrencias).

### 4.7. Wizard `/setup` — cambios (`src/setup/App.jsx`)

1. **Detección de modo** al montar: `GET /api/health` →
   - `mode: 'bootstrap'` (servido por `setup_server.py`): comportamiento actual (instalación + botón "Iniciar Aplicación" con handoff).
   - `mode: 'full'` (servido por Flask): ocultar "Instalar Dependencias" y cambiar "Iniciar Aplicación" por "Abrir Aplicación" (`navigate`/`window.location` a `/app/context`).
   - `mode: 'portable'` (exe): banner "Versión portable: no requiere configuración", checks informativos, sin acciones de instalación/lanzamiento, botón "Ir a la aplicación".
   - Si `/api/health` falla: tratar como bootstrap.
2. **Handoff tras "Iniciar Aplicación"** (solo bootstrap):
   - `POST /api/start-app {port}` → al recibir `success` → poll `GET /api/health` cada 500 ms (máx. 20 s, limpiar intervalo en unmount para tolerar StrictMode) → cuando responda → `window.location.assign('/app/context')` (misma pestaña; el origen es el mismo puerto 5000).
   - Mostrar estado intermedio "Iniciando servidor..." y reintento si el poll expira.
3. `setup.css` se mantiene; el wizard es una página completa (sin AppLayout).

### 4.8. Lazy loading

- Las 7 vistas + el wizard se cargan con `React.lazy` → Vite genera un chunk por vista (la de DAFO es la más pesada, ~250 líneas).
- `Suspense` global con fallback `route-loading`.

---

## 5. BACKEND — Servidor único

### 5.1. Nuevo módulo compartido `setup_api.py` (stdlib puro, sin Flask)

Contenido movido desde `setup_server.py` (sin cambios de lógica):

- Constantes: `APP_PORT = 5000`, `VENV_DIR`, `VENV_PYTHON`, `REQUIRED_PACKAGES`, `BROWSER_PATHS`.
- Funciones: `runtime_python()`, `ensure_local_environment()`, `runtime_version()`, `check_python()`, `check_package(key)`, `check_browser()`, `check_port(port)`, `get_available_ports()`, `run_all_checks()`, `install_package(key)`, `find_available_port(preferred, alternatives)`.
- `start_app(port)`: lanza `server.py` con `FLASK_PORT=<port>` (y opcionalmente `OPEN_BROWSER=0`) y espera a que el puerto responda (lógica actual de `_handle_start_app`).
- `is_portable()`: `getattr(sys, 'frozen', False)`.

**Uso doble**: `setup_server.py` (bootstrap stdlib) y `server.py` (Flask) importan este módulo → una sola implementación de la API del wizard.

### 5.2. `server.py` (Flask) — modo "full"

1. `import setup_api` y reemplazar `BROWSER_PATHS` local por el del módulo (evitar duplicación; `encontrar_navegador` usa el mismo orden).
2. **Nuevas rutas API** (envueltas con `jsonify`):
   - `GET /api/health` → `{'ok': True, 'mode': 'portable' if sys.frozen else 'full', 'version': <versión de la app>}`.
   - `GET /api/check-all` → `setup_api.run_all_checks()`.
   - `GET /api/check/<name>` → check individual.
   - `GET /api/port/<port>` → `setup_api.check_port(port)`.
   - `GET /api/ports/available` → `setup_api.get_available_ports()`.
   - `POST /api/install` → `setup_api.install_package(key)`; en modo portable → `{'success': False, 'error': 'No disponible en versión portable'}`.
   - `POST /api/start-app` → en modo full: `{'success': True, 'url': f'http://localhost:{puerto}/app/context'}` (sin spawn: ya está corriendo).
   - `POST /generar-pdf` y `/generar-pdf-local`: sin cambios.
3. **SPA fallback** (ya casi listo en L172–182): `/app/*`, `/setup` y cualquier ruta sin archivo físico → `index.html`. Verificar caso `path='/setup'` (no existe `frontend/dist/setup` → sirve index.html ✓).
4. **Apertura de navegador**: `abrir_navegador_cuando_este_listo` y el `main()` abren `f'http://localhost:{app_port}/app/context'` (hoy abre la raíz).
5. `main()` sin cambios en el resto (FLASK_PORT, OPEN_BROWSER, Waitress).

### 5.3. `setup_server.py` (stdlib) — modo "bootstrap"

1. **Puerto**: `SETUP_PORT = 5000`, con fallback `5002–5010` (antes 5001 / 5011–5020).
2. **Detección de app ya corriendo** en `main()`: si no puede bindear 5000 → `GET http://127.0.0.1:5000/api/health` → si responde `ok` → `webbrowser.open('http://localhost:5000/app/context')` y salir con mensaje "La aplicación ya está en ejecución".
3. **Nuevo endpoint** `GET /api/health` → `{'ok': True, 'mode': 'bootstrap'}`.
4. **Handoff en `_handle_start_app`** (el cambio crítico):

```text
1. Recibe POST /api/start-app {port}
2. Verifica server.py existe y el intérprete válido (lógica actual)
3. Responde 200 JSON {success: true, url: 'http://localhost:<port>/app/context'}
4. En hilo daemon (inmediatamente después de responder):
   a. server.shutdown()          # libera el puerto 5000 (serve_forever termina)
   b. bucle hasta 3 s: comprobar que el puerto <port> queda libre (bind test); si sigue ocupado → reintentar
   c. spawn de server.py con FLASK_PORT=<port> y OPEN_BROWSER=0 (sin abrir navegador: lo controla el wizard)
   d. si el spawn falla (excepción), registrar en stderr del proceso
5. El wizard (React) hace poll de /api/health hasta que responda 'full' → navega a /app/context
```

   - Notas: `HTTPServer.shutdown()` debe llamarse desde otro hilo (bloquea hasta que `serve_forever` termina); el hilo debe ser `daemon=True` y el proceso no debe salir antes de spawnear Flask.
   - El proceso `setup_server.py` termina (return 0) tras ceder el puerto — o se mantiene vivo esperando Ctrl+C; se decide en implementación (recomendado: salir tras confirmar que Flask respondió, con mensaje "Aplicación iniciada en http://localhost:5000").
5. `/` → redirect a `/setup` (ya existe). El resto de la API usa `setup_api` (módulo compartido).

### 5.4. `iniciar.bat` — detección de primer uso

```bat
rem Después de resolver PYTHON_EXE:
"%PYTHON_EXE%" %PYTHON_ARGS% -c "import flask, waitress, matplotlib, numpy, PIL" >nul 2>&1
if errorlevel 1 (
    echo Configuracion inicial requerida. Iniciando asistente...
    "%PYTHON_EXE%" %PYTHON_ARGS% "%PROJECT_DIR%setup_server.py"
) else (
    echo Iniciando aplicacion...
    set "OPEN_BROWSER=1"
    "%PYTHON_EXE%" %PYTHON_ARGS% "%PROJECT_DIR%server.py"
)
```

- Con `.venv` presente y deps OK → app directo. Con deps rotas o sin `.venv` → wizard.
- Ajustar la condición de auto-build: `if not exist "%PROJECT_DIR%frontend\dist\index.html"`.
- El chequeo es rápido (<1 s). Se mantiene el resto del bat (selección de intérprete, mensajes, pausa en errores).

### 5.5. Vite (dev) y proxies

- `vite.config.js`: volver a **entrada única** `app: 'index.html'` (eliminar `setup: 'setup.html'`). Se elimina el archivo raíz `setup.html`.
- Proxies: `/generar-pdf` → `http://localhost:5000`, `/api` → `http://localhost:5000` (el servidor que esté en curso responde igual: full o bootstrap).
- En dev, el wizard se prueba contra el servidor que esté corriendo; para probar el modo bootstrap en dev se ejecuta `setup_server.py` directamente.

---

## 6. PORTABLE OFFLINE — salvaguardas (requisito del usuario)

1. **`iniciar_portable.bat` (raíz y `offline/`)**: exe directo con `OPEN_BROWSER=0` + `PORT_FILE=%TEMP%\analisis_estrategico_port.txt`; espera el puerto, poll de `/api/health` y abre el navegador con mensaje de 10 s (`timeout /t 10`, tecla = abrir ya) en `/setup`. El check de primer uso existe SOLO en `iniciar.bat`.
2. **Nunca se ejecuta `setup_server.py` en el portable**: el exe contiene todo (deps + dist). El wizard nunca se auto-muestra.
3. **Modo portable** (`sys.frozen`): `/api/health` responde `mode: 'portable'` → el wizard en `/setup` muestra banner informativo, checks sin acciones, y `/api/install` responde error claro. El botón "Iniciar Aplicación" no existe en este modo.
4. **URL inicial del portable**: el launcher abre `/setup` → **bienvenida** ("Todo en orden" + cuenta atrás 20 s) → redirige a `/app/context`. En modo full el launcher abre `/app/context` directo (sin bienvenida). El exe solo abre navegador si recibe `OPEN_BROWSER=1` (modo residual, timeout 60 s).
5. **Verificación post-build** (§8.4): el exe sirve `/app/context`, `/setup` (banner) y las APIs; grep de `setup_server` en el paquete offline → solo documentación.

---

## 7. PLAN DE PRUEBAS

### 7.1. Build y estática

| # | Prueba | Esperado |
|---|---|---|
| 1 | `npm run build` | Exit 0; `frontend/dist/` sin `setup.html`; un chunk por vista (lazy) + `app-*.js` + `triangle-alert-*.js`; fuentes deduplicadas |
| 2 | Grep dist | Cero URLs externas (solo relativas `/assets/...`); cero `setup.html` |
| 3 | Grep `src/` | Cero `activeStage`, cero `INVESTIGATION_STATUSES` |
| 4 | Grep proyecto (sin `.venv`/node_modules/offline) | Cero referencias a `setup.html`, `templates`, `static/` |

### 7.2. Servidor modo full (Flask)

| # | Prueba | Esperado |
|---|---|---|
| 5 | `GET /` | 200 `index.html` (o redirect) |
| 6 | `GET /app/context`, `/app/dafo`, `/setup` | 200 `index.html` (SPA fallback) |
| 7 | `GET /assets/<hash>.js`, `.woff2` | 200; woff2 `Content-Type: font/woff2` |
| 8 | `GET /api/health` | `{'ok': true, 'mode': 'full'}` |
| 9 | `GET /api/check-all` | JSON con python/browser/packages (mismo formato que hoy) |
| 10 | `GET /api/port/5055`, `/api/ports/available` | JSON correcto |
| 11 | `POST /api/install` (modo full) | Instala o informa; sin romper el servidor |
| 12 | `POST /api/start-app` (modo full) | `{'success': true, 'url': .../app/context}` sin spawn |
| 13 | `POST /generar-pdf` con HTML mínimo | 200 PDF o 500 con error legible (nunca 404) |

### 7.3. Bootstrap + handoff (requiere cerrar instancias en ejecución)

| # | Prueba | Esperado |
|---|---|---|
| 14 | `setup_server.py` con 5000 libre | Atiende en 5000; `GET /` → 302 `/setup`; `GET /setup` → 200; `/api/health` → `mode: 'bootstrap'` |
| 15 | `setup_server.py` con app ya en 5000 | Detecta `/api/health` → abre navegador `/app/context` y sale |
| 16 | `POST /api/start-app` | Respuesta `success`; listener libera 5000; `server.py` responde en 5000; `/api/health` → `mode: 'full'`; SPA `/app/context` 200 |
| 17 | Wizard React en bootstrap | Tras success: poll health → navega a `/app/context` (ventana única, mismo puerto) |

### 7.4. Portable

| # | Prueba | Esperado |
|---|---|---|
| 18 | Regenerar con `preparar_portable_offline.bat` | Exit 0; `offline/AnalisisEstrategico/_internal/frontend/dist/` con `index.html` (sin `setup.html`); `offline/iniciar_portable.bat` actualizado (copiado del raíz) |
| 19 | Ejecutar exe con `OPEN_BROWSER=0` + `PORT_FILE=%TEMP%\analisis_estrategico_port.txt` | Escribe el puerto real en el archivo; sirve `/api/health` y `/setup`; modo portable |
| 20 | `GET /api/health` en exe | `mode: 'portable'` |
| 21 | `iniciar_portable.bat` | Mensaje "se abrirá en 10 segundos" → `timeout /t 10` (tecla = abrir ya) → `start "" http://localhost:<puerto>/setup` |
| 22 | Bienvenida en `/setup` (portable) | "Todo en orden" + "Será redirigido a la aplicación automáticamente en X segundos" (cuenta atrás 20 s) → redirige a `/app/context` |
| 23 | `iniciar.bat` (modo full) | Mismo mensaje de 10 s → abre `http://localhost:<puerto>/app/context` (sin bienvenida) |

### 7.5. Funcional (regresión de la app)

| # | Prueba | Esperado |
|---|---|---|
| 24 | Navegar las 7 rutas con datos demo | Cada vista renderiza igual que hoy (comparar con versión actual) |
| 25 | Back/forward, refresco F5, bookmark de `/app/dafo` | Mantiene la ruta y el estado |
| 26 | `Exportar PDF` desde cualquier ruta | Descarga el PDF completo (todas las secciones) |
| 27 | Persistencia | Cerrar y reabrir → estado restaurado (localStorage `matriz-dafo-workspace-v1` intacto) |
| 28 | `npm run dev` | `localhost:5173/app/context` funciona con proxy `/api` → 5000 |

---

## 8. ORDEN DE IMPLEMENTACIÓN

**FASE 0 — Preparación** ✅ COMPLETADA
1. Skill `react-router-declarative-mode` instalada en `.agents/skills/` (local; `-g` no soportado).
2. `react-router-dom@^7.18.2` instalado (package.json).
3. Instancias activas: verificar antes de pruebas de handoff (Fase 3).

**FASE 1 — Frontend** ✅ COMPLETADA (build verde + smoke test headless)
4. `src/state/workspace.js` (helpers + storage + reporte PDF) y `src/state/AnalysisContext.jsx` creados; `INVESTIGATION_STATUSES` muerto eliminado.
5. `src/components/` creados (PageHeader, PanelHeading, Notice, StageStatus, ValidationSummary, HelpModal, ResearchManager, charts).
6. `src/app/(pages)/<ruta>/index.jsx` (7 vistas) creadas; navegación por `useNavigate`.
7. `src/app/layout.jsx` (shell con NavLink/Outlet) + `src/App.jsx` solo rutas (lazy/Suspense) + `src/main.jsx` con BrowserRouter. `overview`→`summary` renombrado (stageStatus no usa esa clave: sin impacto).
8. Wizard: `/api/health` al montar (modo full/portable → pantalla "Todo en orden" con botón "Ir a la aplicación"), handoff con poll tras start-app, `src/setup/main.jsx` y `setup.html` raíz eliminados, `vite.config.js` entrada única + proxy `/api`→5000, `.route-loading` en styles.css.
9. Verificado: `npm run build` exit 0 (42 módulos, 7 chunks lazy); `vite preview` sirve `/app/context`, `/app/summary`, `/setup` (fallback SPA 200); Edge headless renderiza shell, sidebar y vistas.

**FASE 2 — Backend** ✅ COMPLETADA
10. `setup_api.py` creado (SETUP_PORT=APP_PORT=5000, checks/install/ports compartidos).
11. `server.py`: importa `setup_api`; `/api/health` (mode portable|full vía `sys.frozen`), `/api/check-all`, `/api/check/<name>`, `/api/port/<int>`, `/api/ports/available`, `/api/install`, `/api/start-app`; apertura en `/app/context`; fallback SPA verificado.
12. `setup_server.py`: reescrito stdlib-only; `ThreadingHTTPServer`; `/api/health` bootstrap; handoff en `_handle_start_app` (responde JSON → hilo `_perform_handoff` → `server.shutdown()` → espera puerto ≤5 s → spawn con `FLASK_PORT`+`OPEN_BROWSER=0` → espera ≤15 s); `_handoff_thread` global corregido; Timer de navegador respeta `OPEN_BROWSER=0`; `app_ya_corriendo`.
13. `iniciar.bat`: check de imports (flask/waitress/matplotlib/numpy/PIL) → `server.py` directo, si falla → `setup_server.py`; auto-build `dist\index.html`.

**FASE 3 — Verificación** ✅ COMPLETADA
14. Build + pruebas estáticas (§7.1): `py_compile` OK; sin restos de `templates/`/`setup.html`.
15. Modo full (§7.2): `/api/health`→full; `/app/context`, `/setup`, `/`→200 SPA; `/api/start-app`→success; `/api/check-all` dict con browser/environment/packages.
16. Bootstrap + handoff (§7.3): `/api/health`→bootstrap; POST start-app→JSON; 4 s después `/api/health`→full (handoff real verificado). Hallazgo: servidor viejo en 5000 enmascaraba rutas nuevas — matado y limpiado.
17. Dev/regresión (§7.5): pendiente de repaso final del usuario (npm run dev no re-verificado en esta fase).

**FASE 4 — Portable** ✅ COMPLETADA (build + exe verificado)
18. `preparar_portable_offline.bat` → regenerar. **Correcciones del .bat**: (a) `for /f` de PYTHON_BASE roto con rutas con espacios (leía el archivo en vez del contenido) → fix con archivo temporal + `usebackq`; (b) detección de DLLs: `_ctypes.pyd` exige `ffi.dll` (no `ffi-8.dll`) → prioridad `ffi.dll` primero; (c) `pyexpat` exige `libexpat.dll` → empaquetado quirúrgico vía `--add-binary` (loop `call set`): ffi.dll, LIBBZ2.dll, libcrypto-3-x64.dll, libexpat.dll, liblzma.dll, libmpdec-4.dll, libssl-3-x64.dll, sqlite3.dll (set derivado de `dumpbin /dependents` sobre todos los `.pyd` del base).
19. Pruebas §7.4: exe arranca, escribe `PORT_FILE`, `/api/health`→`mode:'portable'`, `/setup`→200, `/api/install`→error portable, `/generar-pdf`→PDF válido. Launchers nuevos: secuencia completa simulada en ambos bats (espera puerto → poll salud → mensaje 10 s → URL correcta: `/setup` portable, `/app/context` full). Bienvenida con Edge headless: cuenta atrás visible ("...en 16 segundos" a los 5 s) y redirección automática a `/app/context` a los 20 s. `iniciar_portable.bat`/`iniciar.bat` ahora abren el navegador ellos mismos (antes lo hacía `server.py` con `webbrowser`, que fallaba si el arranque tardaba >10 s — el timeout del exe se subió a 60 s para el modo `OPEN_BROWSER=1` residual).

**FASE 5 — Cierre**
20. Actualizar `PLAN_MAESTRO_IMPLEMENTACION.md` (esquema de URLs, arquitectura de servidor único, estado de módulos).
21. Actualizar este documento: marcar pasos completados y resultados.
22. Resumen final al usuario con las URLs de la app.

---

## 9. RIESGOS Y MITIGACIONES

| Riesgo | Mitigación |
|---|---|
| Handoff: ventana de carrera al ceder el puerto 5000 | Responder JSON antes de cerrar el listener; bind-test antes del spawn; poll de `/api/health` en el wizard (20 s) |
| Refactor de App.jsx pierde algún handler/prop | Builds intermedios verdes (§Fase 1), pruebas de regresión §7.5.24–27 |
| `analysis`/`validation` duplicados entre vistas | Una sola fuente: `useMemo` en el provider |
| StrictMode monta doble los efectos (poll del wizard) | Limpiar intervalos en cleanup del `useEffect` |
| Rutas deep-link 404 en producción | Fallback SPA en ambos servidores (ya existe en Flask; añadir en stdlib para `/app/*`) |
| CSS roto por NavLink | Usar la clase existente `.is-active` con `className={({isActive}) => ...}` |
| localStorage incompatible con refactor | Mantener la clave `matriz-dafo-workspace-v1` y `normalizeStoredState` intactas |
| Portable rompe por el nuevo `/setup` | Modo `portable` (sys.frozen) desactiva acciones; pruebas §7.4 |

---

## 10. CRITERIOS DE ACEPTACIÓN

1. `http://localhost:5000/setup` y `http://localhost:5000/app/*` viven en **un mismo servidor/puerto** (modo full).
2. Primer uso (sin deps): `iniciar.bat` → wizard en **5000** → handoff → `/app/context` **sin cambiar de puerto**.
3. Uso posterior: `iniciar.bat` → app directa en `/app/context`.
4. **Portable: el wizard nunca se auto-muestra**; `/setup` muestra diagnóstico con banner; `iniciar_portable.bat` intacto.
5. Back/forward, F5 y bookmarks funcionan en las 7 rutas.
6. `Exportar PDF` funciona desde cualquier ruta con el informe completo.
7. Build limpio, chunks lazy por vista, cero URLs externas/CDN, fuentes locales.
8. Cero ocurrencias residuales de `activeStage`, `setup.html` (como entrada), `templates/`, `static/`.

---

## 11. ARCHIVOS AFECTADOS

**Nuevos**
- `src/state/AnalysisContext.jsx`, `src/state/workspace.js`
- `src/app/layout.jsx`, `src/app/constants.js`
- `src/components/PageHeader.jsx`, `PanelHeading.jsx`, `Notice.jsx`, `StageStatus.jsx`, `ValidationSummary.jsx`, `HelpModal.jsx`, `ResearchManager.jsx`, `charts.jsx`
- `src/app/(pages)/context/index.jsx`, `summary/index.jsx`, `efi/index.jsx`, `efe/index.jsx`, `dafo/index.jsx`, `qspm/index.jsx`, `came/index.jsx`
- `setup_api.py`
- Este documento

**Modificados**
- `src/App.jsx` (→ solo rutas; pierde ~1200 líneas)
- `src/main.jsx` (BrowserRouter)
- `src/setup/App.jsx` (modo de salud, handoff, banner portable)
- `server.py` (APIs wizard, `/api/health`, URL `/app/context`, import `setup_api`)
- `setup_server.py` (puerto 5000, health bootstrap, handoff, import `setup_api`)
- `iniciar.bat` (check de deps, auto-build `dist/index.html`)
- `vite.config.js` (entrada única, proxy `/api` → 5000)
- `src/styles.css` (clase `route-loading` mínima)
- `PLAN_MAESTRO_IMPLEMENTACION.md`
- `frontend/dist` (regenerado), `offline/` (regenerado)

**Eliminados**
- `setup.html` (entrada Vite duplicada; el wizard pasa a ser ruta)
- `src/setup/main.jsx` (ya no es entrada)

**Sin cambios**
- `src/domain.js`, `src/tokens.css`, `src/styles.css` (salvo clase nueva), `src/setup/setup.css`
- `generar_graficos.py`, `requirements.txt`
- `preparar_portable_offline.bat`, `iniciar_portable.bat` (raíz y copia offline)
- `offline/` (se regenera, pero el launcher no cambia)
