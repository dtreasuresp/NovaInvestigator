import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  calculateAnalysis,
  createBlankState,
  createDemoState,
  createRelationship,
  relationStatusForStrength,
  validateInvestigation
} from '../domain.js';
import {
  createReportModel,
  normalizeStoredState,
  persistWorkspace,
  readWorkspace,
  renderReportHtml,
  statusForChange,
  withHistory
} from './workspace.js';

const AnalysisContext = createContext(null);

export function AnalysisProvider({ children }) {
  const [workspace] = useState(readWorkspace);
  const [state, setState] = useState(() => normalizeStoredState(workspace.active || createDemoState()));
  const [investigations, setInvestigations] = useState(() => workspace.items.length ? workspace.items : [createDemoState()]);
  const [showHelp, setShowHelp] = useState(false);
  const [showResearchManager, setShowResearchManager] = useState(false);
  const [exportStatus, setExportStatus] = useState('');

  useEffect(() => {
    setInvestigations(current => {
      const next = [state, ...current.filter(item => item.metadata?.id !== state.metadata?.id)];
      persistWorkspace(state.metadata?.id, next);
      return next;
    });
  }, [state]);

  const analysis = useMemo(() => calculateAnalysis(state), [state]);
  const validation = useMemo(() => validateInvestigation(state, analysis), [state, analysis]);
  const selectedStrategy = state.strategies.find(strategy => strategy.id === state.selectedStrategyId);
  const selectedResult = analysis.qspm.results.find(result => result.strategyId === state.selectedStrategyId);

  const commitState = (producer, reason, requestedStatus) => {
    setState(current => {
      const produced = typeof producer === 'function' ? producer(current) : producer;
      const next = {
        ...produced,
        metadata: {
          ...produced.metadata,
          status: requestedStatus || statusForChange(current, reason),
          validation: requestedStatus || statusForChange(current, reason),
          updatedAt: new Date().toISOString()
        }
      };
      return withHistory(current, next, reason);
    });
  };

  const updateFactor = (group, factorId, field, value) => {
    commitState(current => ({
      ...current,
      [group]: current[group].map(factor => factor.id === factorId
        ? {
          ...factor,
          [field]: field === 'weight'
            ? Number.parseFloat(value) || 0
            : field === 'rating'
              ? Number.parseInt(value, 10) || 1
              : value
        }
        : factor)
    }), `${group === 'internal' ? 'EFI' : 'EFE'} actualizado`);
  };

  const updateMetadata = (field, value) => {
    commitState(current => ({
      ...current,
      metadata: {
        ...current.metadata,
        [field]: value,
      }
    }), 'contexto actualizado');
  };

  const updateRelationship = (relationshipId, field, value) => {
    commitState(current => ({
      ...current,
      relationships: current.relationships.map(relationship => relationship.id === relationshipId
        ? {
          ...relationship,
          ...(field === 'strength'
            ? { strength: Number.parseInt(value, 10), status: relationStatusForStrength(Number.parseInt(value, 10)) }
            : { [field]: value })
        }
        : relationship)
    }), 'relación DAFO actualizada');
  };

  const addRelationship = (internalId, externalId) => {
    commitState(current => {
      if (current.relationships.some(relationship => relationship.internalId === internalId && relationship.externalId === externalId)) return current;
      const relationship = createRelationship(current, internalId, externalId);
      return relationship ? { ...current, relationships: [...current.relationships, relationship] } : current;
    }, 'par DAFO añadido');
  };

  const updateQspmScore = (strategyId, factorId, value) => {
    const score = value === '' ? null : Number.parseInt(value, 10);
    commitState(current => ({
      ...current,
      qspmScores: {
        ...current.qspmScores,
        [strategyId]: {
          ...current.qspmScores[strategyId],
          [factorId]: Number.isInteger(score) && score >= 1 && score <= 4 ? score : null
        }
      }
    }), 'puntuación QSPM actualizada');
  };

  const updateStrategy = (strategyId, field, value) => {
    commitState(current => ({
      ...current,
      strategies: current.strategies.map(strategy => strategy.id === strategyId
        ? {
          ...strategy,
          [field]: field === 'relatedFactors'
            ? String(value).split(',').map(item => item.trim()).filter(Boolean)
            : value
        }
        : strategy)
    }), 'alternativa QSPM actualizada');
  };

  const updateCameAction = (actionId, field, value) => {
    commitState(current => ({
      ...current,
      cameActions: current.cameActions.map(action => action.id === actionId
        ? { ...action, [field]: value }
        : action)
    }), 'ficha CAME actualizada');
  };

  const saveCameAction = (actionId, nextAction) => {
    commitState(current => ({
      ...current,
      cameActions: current.cameActions.map(action => action.id === actionId ? { ...action, ...nextAction } : action)
    }), 'ficha CAME guardada');
  };

  const updateCameCriterion = (criterionId, value) => {
    commitState(current => ({
      ...current,
      cameCriteria: current.cameCriteria.map(criterion => criterion.id === criterionId
        ? { ...criterion, weight: Math.max(0, Math.min(1, Number.parseFloat(value) || 0)) }
        : criterion)
    }), 'criterio CAME actualizado');
  };

  const selectStrategy = strategyId => {
    commitState(current => ({ ...current, selectedStrategyId: strategyId || null }), 'alternativa QSPM seleccionada');
  };

  const updateSelectionJustification = value => {
    commitState(current => ({ ...current, selectionJustification: value }), 'justificación QSPM actualizada');
  };

  const confirmSelection = () => {
    if (!validation.valid) {
      setExportStatus(`No se puede validar todavía: ${validation.errors} errores y ${validation.warnings} advertencias pendientes.`);
      return;
    }
    commitState(current => current, 'validación', 'validada');
    setExportStatus('Investigación validada.');
  };

  const createNewResearch = () => {
    setState(createBlankState());
    setShowResearchManager(false);
    setExportStatus('Nueva investigación creada como borrador.');
  };

  const loadDemo = () => {
    setState(createDemoState());
    setShowResearchManager(false);
    setExportStatus('');
  };

  const clearAnalysis = () => {
    createNewResearch();
  };

  const openResearch = research => {
    setState(normalizeStoredState(research));
    setShowResearchManager(false);
    setExportStatus(`Investigación ${research.metadata.id} abierta.`);
  };

  const duplicateResearch = research => {
    const duplicate = normalizeStoredState(research);
    duplicate.metadata = {
      ...duplicate.metadata,
      id: `INV-${Date.now().toString().slice(-6)}`,
      title: `${duplicate.metadata.title || 'Investigación'} (copia)`,
      label: 'copia-de-trabajo',
      validation: 'borrador',
      status: 'borrador',
      archivedAt: null,
      updatedAt: new Date().toISOString()
    };
    duplicate.history = [];
    setState(duplicate);
    setShowResearchManager(false);
    setExportStatus('Copia de investigación creada.');
  };

  const archiveResearch = researchId => {
    setInvestigations(current => {
      const next = current.map(item => item.metadata?.id === researchId
        ? { ...item, metadata: { ...item.metadata, archivedAt: new Date().toISOString() } }
        : item);
      persistWorkspace(state.metadata?.id, next);
      return next;
    });
    setExportStatus('Investigación archivada. Puede recuperarse desde el archivo.');
  };

  const restoreResearch = researchId => {
    setInvestigations(current => {
      const next = current.map(item => item.metadata?.id === researchId
        ? { ...item, metadata: { ...item.metadata, archivedAt: null, status: item.metadata.status === 'cerrada' ? 'cerrada' : 'borrador' } }
        : item);
      persistWorkspace(state.metadata?.id, next);
      return next;
    });
    setExportStatus('Investigación recuperada del archivo.');
  };

  const closeResearch = researchId => {
    setInvestigations(current => {
      const next = current.map(item => item.metadata?.id === researchId
        ? { ...item, metadata: { ...item.metadata, status: 'cerrada', validation: 'cerrada', updatedAt: new Date().toISOString() } }
        : item);
      persistWorkspace(state.metadata?.id, next);
      return next;
    });
    if (researchId === state.metadata.id) {
      setState(current => ({ ...current, metadata: { ...current.metadata, status: 'cerrada', validation: 'cerrada', updatedAt: new Date().toISOString() } }));
    }
    setExportStatus('Investigación cerrada.');
  };

  const renameResearch = (researchId, title) => {
    const nextTitle = String(title || '').trim();
    if (!nextTitle) return;
    if (researchId === state.metadata.id) {
      commitState(current => ({
        ...current,
        metadata: { ...current.metadata, title: nextTitle }
      }), 'investigación renombrada');
    } else {
      setInvestigations(current => {
        const next = current.map(item => item.metadata?.id === researchId
          ? { ...item, metadata: { ...item.metadata, title: nextTitle, updatedAt: new Date().toISOString() } }
          : item);
        persistWorkspace(state.metadata?.id, next);
        return next;
      });
    }
    setExportStatus('Nombre de investigación actualizado.');
  };

  const exportPdf = async () => {
    setExportStatus('Preparando PDF...');
    try {
      const reportModel = createReportModel(state, analysis);
      const html = renderReportHtml(reportModel);
      const response = await fetch('/generar-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, datos: reportModel.chartData })
      });
      if (!response.ok) throw new Error('El servidor no pudo generar el PDF.');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${state.metadata.id.toLowerCase()}-analisis.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      commitState(current => current, 'exportación', 'exportada');
      setExportStatus('PDF descargado.');
    } catch (error) {
      setExportStatus(error.message);
    }
  };

  const value = {
    state,
    investigations,
    analysis,
    validation,
    selectedStrategy,
    selectedResult,
    showHelp,
    setShowHelp,
    showResearchManager,
    setShowResearchManager,
    exportStatus,
    setExportStatus,
    updateFactor,
    updateMetadata,
    updateRelationship,
    addRelationship,
    updateQspmScore,
    updateStrategy,
    updateCameAction,
    saveCameAction,
    updateCameCriterion,
    selectStrategy,
    updateSelectionJustification,
    confirmSelection,
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
  };

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>;
}

export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (!context) throw new Error('useAnalysis debe usarse dentro de AnalysisProvider');
  return context;
}
