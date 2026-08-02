import { BookOpen, ChevronRight, Download, Eraser, FolderOpen, Plus, RefreshCw, Target } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { NAV_ITEMS, STAGE_ROUTES } from './constants.js';
import { useAnalysis } from '../state/AnalysisContext.jsx';
import HelpModal from '../components/HelpModal.jsx';
import ResearchManager from '../components/ResearchManager.jsx';
import StageStatus from '../components/StageStatus.jsx';
import ValidationSummary from '../components/ValidationSummary.jsx';

export default function AppLayout() {
  const {
    state,
    validation,
    investigations,
    showHelp,
    setShowHelp,
    showResearchManager,
    setShowResearchManager,
    exportStatus,
    createNewResearch,
    loadDemo,
    clearAnalysis,
    openResearch,
    duplicateResearch,
    archiveResearch,
    restoreResearch,
    closeResearch,
    renameResearch,
    exportPdf
  } = useAnalysis();
  const navigate = useNavigate();

  const openNew = () => {
    createNewResearch();
    navigate('/app/context');
  };
  const openDemo = () => {
    loadDemo();
    navigate('/app/summary');
  };
  const clearAndGo = () => {
    clearAnalysis();
    navigate('/app/context');
  };
  const openResearchAndGo = research => {
    openResearch(research);
    navigate('/app/summary');
  };
  const duplicateAndGo = research => {
    duplicateResearch(research);
    navigate('/app/summary');
  };
  const navClass = ({ isActive }) => `stage-nav-item ${isActive ? 'is-active' : ''}`;

  return (
    <div className="app-shell" id="analysis-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark" aria-hidden="true"><Target size={19} strokeWidth={2.2} /></span>
          <div>
            <p className="brand-kicker">NovaInvestigator</p>
            <h1>Basado en EFI / EFE / DAFO / QSPM / CAME</h1>
          </div>
        </div>
        <div className="topbar-actions">
          <span className={`validation-state validation-${state.metadata.validation}`}>
            <span className="status-dot" aria-hidden="true" />
            {state.metadata.status || state.metadata.validation || 'borrador'}
          </span>
          <button className="button button-quiet" type="button" onClick={() => setShowResearchManager(true)} title="Abrir gestor de investigaciones">
            <FolderOpen size={15} /> Investigaciones
          </button>
          <button className="button button-quiet" type="button" onClick={openNew} title="Crear una nueva investigación">
            <Plus size={15} /> Nueva
          </button>
          <button className="button button-quiet" type="button" onClick={() => setShowHelp(true)} title="Abrir guía metodológica">
            <BookOpen size={15} /> Guía
          </button>
          <button className="button button-quiet" type="button" onClick={openDemo} title="Cargar datos demostrativos">
            <RefreshCw size={15} /> Demo
          </button>
          <button className="button button-quiet" type="button" onClick={clearAndGo} title="Limpiar todos los datos del análisis">
            <Eraser size={15} /> Limpiar
          </button>
          <button className="button button-primary" type="button" onClick={exportPdf} title="Exportar análisis a PDF">
            <Download size={15} /> Exportar PDF
          </button>
        </div>
      </header>

      <div className="workspace-grid">
        <aside className="sidebar">
          <div className="case-identity">
            <p className="eyebrow">Caso activo</p>
            <h2>{state.metadata.organization || 'Entidad por definir'}</h2>
            <p>{state.metadata.unit || 'Unidad de análisis pendiente'}</p>
            <span className="case-code">{state.metadata.id}</span>
            <span className="case-status">{state.metadata.status || 'borrador'} · guardado local</span>
          </div>

          <nav className="stage-nav" aria-label="Etapas del análisis">
            <NavLink to="/app/context" className={navClass}>
              <span className="stage-index">00</span>
              <span className="stage-copy"><strong>Contexto</strong><small>Entidad y propósito</small></span>
              <StageStatus status={validation.stageStatus.context} />
              <span className="stage-arrow" aria-hidden="true"><ChevronRight size={19} /></span>
            </NavLink>
            {NAV_ITEMS.map(item => (
              <NavLink to={STAGE_ROUTES[item.id]} className={navClass} key={item.id}>
                <span className="stage-index">{item.index}</span>
                <span className="stage-copy"><strong>{item.label}</strong><small>{item.detail}</small></span>
                <StageStatus status={validation.stageStatus[item.id]} />
                <span className="stage-arrow" aria-hidden="true"><ChevronRight size={19} /></span>
              </NavLink>
            ))}
          </nav>

          <ValidationSummary validation={validation} onNavigate={stage => navigate(STAGE_ROUTES[stage])} />
        </aside>

        <main className="main-content">
          <Outlet />
        </main>
      </div>

      {exportStatus && <output className="toast">{exportStatus}</output>}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
      {showResearchManager && <ResearchManager investigations={investigations} activeId={state.metadata.id} onClose={() => setShowResearchManager(false)} onNew={openNew} onOpen={openResearchAndGo} onDuplicate={duplicateAndGo} onArchive={archiveResearch} onRestore={restoreResearch} onRename={renameResearch} onCloseResearch={closeResearch} />}
    </div>
  );
}
