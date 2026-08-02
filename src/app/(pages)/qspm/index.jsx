import { formatNumber } from '../../../domain.js';
import { useAnalysis } from '../../../state/AnalysisContext.jsx';
import PageHeader from '../../../components/PageHeader.jsx';
import PanelHeading from '../../../components/PanelHeading.jsx';
import Notice from '../../../components/Notice.jsx';

export default function QspmPage() {
  const { state, analysis, updateQspmScore, updateStrategy, selectStrategy, updateSelectionJustification, confirmSelection } = useAnalysis();
  return (
    <QspmView
      state={state}
      analysis={analysis}
      onScoreChange={updateQspmScore}
      onStrategyChange={updateStrategy}
      onSelect={selectStrategy}
      onJustificationChange={updateSelectionJustification}
      onConfirm={confirmSelection}
    />
  );
}

function QspmView({ state, analysis, onScoreChange, onStrategyChange, onSelect, onJustificationChange, onConfirm }) {
  const strategy = state.strategies.find(item => item.id === state.selectedStrategyId);
  return (
    <>
      <PageHeader eyebrow="Selección / 05" title="Matriz QSPM (Matriz de Planificación Estratégica Cuantitativa)" description="La matriz cuantitativa compara alternativas. AS es el atractivo relativo; TAS es el producto entre peso normalizado y AS." action={<span className="section-tag">{analysis.qspm.results.filter(result => result.complete).length}/6 completas</span>} />
      <div className="strategy-grid">{state.strategies.map(item => { const result = analysis.qspm.results.find(entry => entry.strategyId === item.id); return <StrategyCard key={item.id} strategy={item} result={result} selected={item.id === state.selectedStrategyId} onSelect={onSelect} onChange={onStrategyChange} />; })}</div>
      <section className="panel qspm-panel">
        <PanelHeading eyebrow="Comparación completa" title="120 puntuaciones de atractivo" detail="Todos los factores del caso están incluidos" />
        <div className="table-scroll qspm-scroll"><table className="data-table qspm-table"><thead><tr><th>Factor</th><th>Peso QSPM</th>{state.strategies.map(item => <th key={item.id}>{item.id}<br /><small>AS / TAS</small></th>)}</tr></thead><tbody>{analysis.qspm.factors.map(factor => <QspmRow key={factor.id} factor={factor} state={state} normalizedWeight={analysis.qspm.normalizedWeights[factor.id]} onScoreChange={onScoreChange} />)}</tbody><tfoot><tr><td colSpan="2">TAS total</td>{state.strategies.map(item => { const result = analysis.qspm.results.find(entry => entry.strategyId === item.id); return <td key={item.id} className="tas-total">{formatNumber(result?.totalTas)}</td>; })}</tr></tfoot></table></div>
      </section>
      {analysis.qspm.warnings.length > 0 && <Notice items={analysis.qspm.warnings} tone="warning" />}
      <QspmRanking results={analysis.qspm.results} difference={analysis.qspm.topDifference} tie={analysis.qspm.tie} hasWeightedFactors={analysis.qspm.factors.length > 0} />
      <section className="panel selection-panel"><div><p className="eyebrow">Decisión documentada</p><h3>Alternativa seleccionada</h3><p>El ranking orienta; la selección requiere criterio y justificación del equipo.</p></div><div className="selection-controls"><select className="control-input" value={state.selectedStrategyId || ''} onChange={event => onSelect(event.target.value)}><option value="">Seleccione una alternativa</option>{state.strategies.map(item => <option key={item.id} value={item.id}>{item.id} · {item.name}</option>)}</select><textarea className="control-input" rows="3" value={state.selectionJustification} onChange={event => onJustificationChange(event.target.value)} placeholder="Justifique la selección..." /><button className="button button-primary" type="button" onClick={onConfirm}>Confirmar selección</button></div></section>
      {strategy && <div className="selected-banner"><strong>{strategy.id}</strong><span>{strategy.name}</span><small>{strategy.description}</small></div>}
    </>
  );
}

function QspmRow({ factor, state, normalizedWeight, onScoreChange }) {
  return <tr><td><code>{factor.id}</code><strong>{factor.name}</strong></td><td>{Number(normalizedWeight).toFixed(4)}</td>{state.strategies.map(strategy => { const score = state.qspmScores[strategy.id]?.[factor.id] ?? ''; return <td key={strategy.id} className="qspm-score-cell"><div><input className="table-input as-input" type="number" min="1" max="4" step="1" value={score} onChange={event => onScoreChange(strategy.id, factor.id, event.target.value)} aria-label={`AS ${strategy.id} ${factor.id}`} /><span>{formatNumber((Number(normalizedWeight) || 0) * (Number(score) || 0))}</span></div></td>; })}</tr>;
}

function StrategyCard({ strategy, result, selected, onSelect, onChange }) {
  return <article className={`strategy-card ${selected ? 'is-selected' : ''}`}><button className="strategy-select" type="button" onClick={() => onSelect(strategy.id)}><div><span className={`quadrant-badge compact badge-${strategy.quadrant.toLowerCase()}`}>{strategy.quadrant}</span><code>{strategy.id}</code></div><h3>{strategy.name}</h3><p>{strategy.description || 'Añada una descripción operativa.'}</p><footer><strong>TAS {formatNumber(result?.totalTas)}</strong><span>{result?.evaluated}/{result?.evaluated + result?.pending || 0} factores</span></footer></button><details className="strategy-editor"><summary>Editar alternativa</summary><div className="detail-grid"><label>Nombre<input className="table-input" value={strategy.name || ''} onChange={event => onChange(strategy.id, 'name', event.target.value)} /></label><label>Cuadrante<select className="table-input" value={strategy.quadrant || 'DO'} onChange={event => onChange(strategy.id, 'quadrant', event.target.value)}><option value="FO">FO · Ofensiva</option><option value="DO">DO · Adaptativa</option><option value="FA">FA · Defensiva</option><option value="DA">DA · Supervivencia</option></select></label><label className="field-wide">Descripción<textarea className="compact-textarea" rows="2" value={strategy.description || ''} onChange={event => onChange(strategy.id, 'description', event.target.value)} /></label><label className="field-wide">Factores relacionados<input className="table-input" value={(strategy.relatedFactors || []).join(', ')} onChange={event => onChange(strategy.id, 'relatedFactors', event.target.value)} placeholder="Ej.: D-08, O-01" /></label><label className="field-wide">Observaciones<textarea className="compact-textarea" rows="2" value={strategy.observations || ''} onChange={event => onChange(strategy.id, 'observations', event.target.value)} placeholder="Criterio, supuesto o condición de la alternativa" /></label></div></details></article>;
}

function QspmRanking({ results, difference, tie, hasWeightedFactors }) {
  const detail = !hasWeightedFactors ? 'Sin factores ponderados' : tie ? 'Empate en primer lugar' : `Diferencia líder / segundo ${formatNumber(difference)}`;
  return <section className="panel qspm-ranking"><PanelHeading eyebrow="Ranking QSPM" title="Orden de atractivo total" detail={detail} /><ol>{results.map((result, index) => <li key={result.strategyId} className={hasWeightedFactors && index === 0 ? 'is-leader' : ''}><span>{index + 1}</span><code>{result.strategyId}</code><strong>{result.name}</strong><b>{formatNumber(result.totalTas)}</b><small>{result.complete ? 'Completa' : hasWeightedFactors ? `${result.pending} pendientes` : 'Sin factores'}</small></li>)}</ol></section>;
}
