import { useState } from 'react';
import { X } from 'lucide-react';
import { formatNumber } from '../../../domain.js';
import { CAME_LABELS } from '../../constants.js';
import { cloneState } from '../../../state/workspace.js';
import { useAnalysis } from '../../../state/AnalysisContext.jsx';
import PageHeader from '../../../components/PageHeader.jsx';
import PanelHeading from '../../../components/PanelHeading.jsx';
import Notice from '../../../components/Notice.jsx';

export default function CamePage() {
  const { state, analysis, saveCameAction, updateCameCriterion } = useAnalysis();
  return (
    <CameView
      state={state}
      analysis={analysis}
      onActionSave={saveCameAction}
      onCriterionChange={updateCameCriterion}
    />
  );
}

function CameView({ state, analysis, onActionSave, onCriterionChange }) {
  const topActions = [...analysis.came.actions].sort((left, right) => right.priority - left.priority).slice(0, 3);
  const [draft, setDraft] = useState(null);
  const updateDraft = (field, value) => setDraft(current => ({ ...current, [field]: value }));
  const openDraft = (actionId) => {
    const action = analysis.came.actions.find(a => a.id === actionId);
    setDraft(action ? cloneState(action) : null);
  };
  const draftIssues = draft ? [
    !String(draft.action || '').trim() && 'Falta la acción.',
    !String(draft.responsible || '').trim() && 'Falta el responsable.',
    !String(draft.indicator || '').trim() && 'Falta el indicador.',
    !String(draft.baseline || '').trim() && 'Falta la línea base.',
    !String(draft.target || '').trim() && 'Falta la meta.',
    (!draft.startDate || !draft.endDate) && 'Complete las fechas de inicio y fin.',
    draft.startDate && draft.endDate && draft.startDate > draft.endDate && 'La fecha de inicio no puede superar la fecha de fin.'
  ].filter(Boolean) : [];
  const draftFields = [
    ['objective', 'Objetivo', 'text'],
    ['responsible', 'Responsable', 'text'],
    ['participants', 'Participantes', 'text'],
    ['indicator', 'Indicador', 'text'],
    ['baseline', 'Línea base', 'text'],
    ['target', 'Meta', 'text'],
    ['startDate', 'Inicio', 'date'],
    ['endDate', 'Fin', 'date'],
    ['frequency', 'Frecuencia', 'text']
  ];
  return (
    <>
      <PageHeader eyebrow="Acción / 06" title="CAME (Corregir, Afrontar, Mantener, Explotar) operativo" description="Cada factor se convierte en una ficha con responsable, indicador, meta y prioridad multicriterio." action={<span className="section-tag">{analysis.came.actions.length} fichas</span>} />
      <section className="panel criteria-panel"><div><p className="eyebrow">Configuración de prioridad</p><h3>Cinco criterios ponderados</h3><p>La suma de pesos debe ser 1.00. La prioridad se expresa entre 0 y 1.</p></div><div className="criteria-grid">{state.cameCriteria.map(criterion => <label key={criterion.id}><span>{criterion.name}</span><input className="table-input" type="number" min="0" max="1" step="0.05" value={criterion.weight} onChange={event => onCriterionChange(criterion.id, event.target.value)} /></label>)}</div><strong className={analysis.came.valid ? 'criteria-total is-valid' : 'criteria-total is-warning'}>Suma: {formatNumber(analysis.came.weightTotal)}</strong></section>
      {analysis.came.warnings.length > 0 && <Notice items={analysis.came.warnings} tone="warning" />}
      <CameDistribution actions={analysis.came.actions} />
      <section className="panel priority-panel"><PanelHeading eyebrow="Primeras prioridades" title="Acciones que abren el plan" detail="Ordenadas por prioridad" /><div className="priority-list">{topActions.map(action => <div className="priority-row" key={action.id}><code>{action.id}</code><span>{action.action}</span><strong>{formatNumber(action.priority)}</strong><em className={`priority-label priority-${action.category}`}>{priorityLabel(action.category)}</em></div>)}</div></section>
      <section className="panel came-table-panel"><PanelHeading eyebrow="Fichas operativas" title="20 acciones demostrativas" detail="Expandir para revisar trazabilidad" /><div className="table-scroll came-scroll"><table className="data-table came-table"><thead><tr><th>Ficha</th><th>Factor / acción</th><th>Prioridad</th><th>Estado</th><th>Detalle operativo</th></tr></thead><tbody>{analysis.came.actions.map(action => <CameRow key={action.id} action={action} onOpenModal={openDraft} />)}</tbody></table></div></section>
      {draft && <div className="modal-backdrop"><dialog open className="came-modal" aria-labelledby="came-editor-title"><div className="came-modal-header"><div><p className="eyebrow">{draft.id} · {draft.type}</p><h2 id="came-editor-title">Ficha de acción</h2><p>{draft.factor}</p></div><button className="modal-close" type="button" onClick={() => setDraft(null)} aria-label="Cerrar ficha"><X size={17} /></button></div><div className="came-editor-form"><label className="field-wide"><span>Acción</span><textarea className="control-input" rows="3" value={draft.action || ''} onChange={event => updateDraft('action', event.target.value)} /></label>{draftFields.map(([field, label, type]) => <label key={field}><span>{label}</span><input className="control-input" type={type} value={draft[field] || ''} onChange={event => updateDraft(field, event.target.value)} /></label>)}<label><span>Estrategia</span><select className="control-input" value={draft.strategyId || ''} onChange={event => updateDraft('strategyId', event.target.value)}><option value="">Sin estrategia</option>{state.strategies.map(strategy => <option key={strategy.id} value={strategy.id}>{strategy.id} · {strategy.name}</option>)}</select></label><label><span>Estado</span><select className="control-input" value={draft.status || 'propuesta'} onChange={event => updateDraft('status', event.target.value)}><option value="propuesta">Propuesta</option><option value="en curso">En curso</option><option value="completada">Completada</option><option value="pausada">Pausada</option></select></label></div>{draftIssues.length > 0 && <Notice items={draftIssues} tone="warning" />}<div className="came-modal-footer"><button className="button" type="button" onClick={() => setDraft(null)}>Cancelar</button><button className="button button-primary" type="button" disabled={draftIssues.length > 0} onClick={() => { onActionSave(draft); setDraft(null); }}>Guardar ficha</button></div></dialog></div>}
    </>
  );
}

function CameDistribution({ actions }) {
  const totals = Object.fromEntries(Object.keys(CAME_LABELS).map(type => [type, actions.filter(action => action.type === type).reduce((total, action) => total + action.priority, 0)]));
  const counts = Object.fromEntries(Object.keys(CAME_LABELS).map(type => [type, actions.filter(action => action.type === type).length]));
  const maximum = Math.max(1, ...Object.values(totals));
  return <section className="panel came-distribution"><PanelHeading eyebrow="Distribución de prioridades" title="Peso acumulado por tipo CAME" detail="Suma de prioridades normalizadas" /><div className="came-distribution-grid">{Object.entries(CAME_LABELS).map(([type, label]) => <div className="came-distribution-item" key={type}><div><span className={`came-type came-${type.toLowerCase()}`}>{type}</span><strong>{label}</strong><small>{counts[type]} acciones</small><b>{formatNumber(totals[type])}</b></div><div className="chart-bar-track"><span className={`chart-bar-fill chart-fill-${type === 'C' ? 'brick' : type === 'A' ? 'blue' : type === 'M' ? 'teal' : 'amber'}`} style={{ width: `${(totals[type] / maximum) * 100}%` }} /></div></div>)}</div></section>;
}

function CameRow({ action, onOpenModal }) {
  const statusLabel = { propuesta: 'Propuesta', 'en curso': 'En curso', completada: 'Completada', pausada: 'Pausada' };
  return <tr><td><div className="ficha-id"><code>{action.id}</code><span className={`came-type came-${action.type.toLowerCase()}`}>{action.type}</span></div></td><td><div className="factor-header"><strong>{action.factorId}</strong><span className="came-factor-name">{action.factor}</span></div><span className="action-text">{action.action}</span></td><td><strong className="priority-number">{formatNumber(action.priority)}</strong><span className={`priority-label priority-${action.category}`}>{priorityLabel(action.category)}</span></td><td><span className="table-status">{statusLabel[action.status] || action.status}</span></td><td><button className="button button-quiet-dark" type="button" onClick={() => onOpenModal(action.id)}>Ver ficha</button></td></tr>;
}

function priorityLabel(category) {
  return { critica: 'Crítica', alta: 'Alta', media: 'Media', baja: 'Baja' }[category] || 'Baja';
}
