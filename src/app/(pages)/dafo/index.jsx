import { useState } from 'react';
import { ORIENTATIONS, QUADRANTS, formatNumber, formatPercent, relationStatusForStrength } from '../../../domain.js';
import { useAnalysis } from '../../../state/AnalysisContext.jsx';
import PageHeader from '../../../components/PageHeader.jsx';
import PanelHeading from '../../../components/PanelHeading.jsx';
import Notice from '../../../components/Notice.jsx';
import { ChartDeck } from '../../../components/charts.jsx';
import { QuadrantCard } from '../summary/index.jsx';

export default function DafoPage() {
  const { state, analysis, updateRelationship, addRelationship } = useAnalysis();
  return (
    <DafoView
      analysis={analysis}
      state={state}
      onRelationshipChange={updateRelationship}
      onAddRelationship={addRelationship}
    />
  );
}

function DafoView({ analysis, state, onRelationshipChange, onAddRelationship }) {
  return (
    <>
      <PageHeader eyebrow="Cruce / 04" title="Matriz DAFO y relaciones entre cuadrantes" description="El índice exploratorio muestra potencial. La orientación operativa se calcula únicamente con relaciones evaluadas, fuerza y evidencia." action={<span className="section-tag">{analysis.relations.evaluatedCount} relaciones evaluadas</span>} />
      <section className="dafo-summary-grid">{QUADRANTS.map(quadrant => <QuadrantCard key={quadrant} quadrant={quadrant} rawValue={analysis.dafo[quadrant]} item={analysis.relations.summary[quadrant]} active={quadrant === analysis.relations.dominant} />)}</section>
      <DafoExploratoryMatrix analysis={analysis} />
      <DafoStrategyAnalysis analysis={analysis} />
      <DafoMatrix state={state} analysis={analysis} />
      <ChartDeck analysis={analysis} />
      <section className="panel orientation-panel">
        <div className="orientation-copy"><p className="eyebrow">Orientación sugerida</p><div className="orientation-title"><span className={`quadrant-badge badge-${(analysis.relations.dominant || 'none').toLowerCase()}`}>{analysis.relations.dominant || '—'}</span><h3>{analysis.relations.dominant ? ORIENTATIONS[analysis.relations.dominant].name : 'Sin orientación concluyente'}</h3></div><p>{analysis.relations.dominant ? ORIENTATIONS[analysis.relations.dominant].action : 'Evalúe relaciones con fuerza y evidencia antes de interpretar el cuadrante.'}</p></div>
        <div className="orientation-meta"><span>Confianza</span><strong>{analysis.relations.confidence}</strong><span>Diferencia frente al segundo</span><strong>{formatPercent(analysis.relations.difference)}</strong><span>Cobertura dominante</span><strong>{formatPercent(analysis.relations.coverage)}</strong></div>
      </section>
      {analysis.relations.warnings.length > 0 && <Notice items={analysis.relations.warnings} tone="warning" />}
      <RelationshipComposer state={state} onAdd={onAddRelationship} />
      <section className="panel relation-panel">
        <PanelHeading eyebrow="Mesa de evidencia" title="100 pares internos y externos" detail="Fuerza 0 = sin relación identificada" />
        <div className="table-scroll relation-scroll"><table className="data-table relation-table"><thead><tr><th>Par</th><th>Cuadrante</th><th>Estado</th><th>Fuerza</th><th>Justificación</th><th>Evidencia</th><th>Evaluador</th><th>Fecha</th></tr></thead><tbody>{state.relationships.map(relation => <RelationRow key={relation.id} relation={relation} onChange={onRelationshipChange} />)}</tbody></table></div>
      </section>
    </>
  );
}

const DAFO_MATRIX = {
  FO: { internal: 'F', external: 'O', title: 'Fortalezas + oportunidades', verb: 'Potenciar', tone: 'teal' },
  DO: { internal: 'D', external: 'O', title: 'Debilidades + oportunidades', verb: 'Reorientar', tone: 'amber' },
  FA: { internal: 'F', external: 'A', title: 'Fortalezas + amenazas', verb: 'Proteger', tone: 'blue' },
  DA: { internal: 'D', external: 'A', title: 'Debilidades + amenazas', verb: 'Contener', tone: 'brick' }
};

function DafoMatrix({ state, analysis }) {
  return (
    <section className="panel dafo-matrix-panel">
      <PanelHeading eyebrow="Matriz visual" title="Mapa de cruces estratégicos" detail="Los tres vínculos de mayor contribución aparecen primero" />
      <div className="dafo-matrix">
        {QUADRANTS.map(quadrant => {
          const config = DAFO_MATRIX[quadrant];
          const item = analysis.relations.summary[quadrant];
          const internalFactors = state.internal.filter(factor => factor.type === config.internal);
          const externalFactors = state.external.filter(factor => factor.type === config.external);
          return (
            <article className={`dafo-cell dafo-cell-${config.tone} ${analysis.relations.dominant === quadrant ? 'is-dominant' : ''}`} key={quadrant}>
              <div className="dafo-cell-header">
                <span className={`quadrant-badge badge-${quadrant.toLowerCase()}`}>{quadrant}</span>
                <div><strong>{config.title}</strong><small>{config.verb} · índice {formatNumber(item.index)}</small></div>
              </div>
              <div className="dafo-factor-columns">
                <FactorStack label={config.internal === 'F' ? 'Fortalezas' : 'Debilidades'} factors={internalFactors} />
                <FactorStack label={config.external === 'O' ? 'Oportunidades' : 'Amenazas'} factors={externalFactors} />
              </div>
              <div className="dafo-cell-relations">
                <span className="eyebrow">Vínculos destacados</span>
                {item.mainRelations.length > 0
                  ? item.mainRelations.map(relation => <div className="dafo-relation" key={relation.id}><code>{relation.internalId} + {relation.externalId}</code><span>{formatNumber(relation.contribution)} aporte</span></div>)
                  : <p>Sin relaciones evaluadas.</p>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function DafoExploratoryMatrix({ analysis }) {
  const matrix = analysis.dafo.matrix;
  const renderRows = rows => rows.map(row => (
    <tr className={`dafo-exploratory-row dafo-row-${row.type.toLowerCase()}`} key={row.factorId}>
      <td><code>{row.factorId}</code><strong>{row.factorName || 'Factor sin describir'}</strong></td>
      <td className="dafo-weight-cell">{formatNumber(row.weight)}</td>
      {row.opportunityCells.map(cell => <td className={`dafo-exploratory-cell ${exploratoryCellTone(cell.value)}`} key={cell.factorId}>{Number(cell.value).toFixed(4)}</td>)}
      <td className="dafo-subtotal-cell">{formatNumber(row.opportunityTotal)}</td>
      {row.threatCells.map(cell => <td className={`dafo-exploratory-cell ${exploratoryCellTone(cell.value)}`} key={cell.factorId}>{Number(cell.value).toFixed(4)}</td>)}
      <td className="dafo-subtotal-cell">{formatNumber(row.threatTotal)}</td>
      <td className="dafo-total-cell">{formatNumber(row.total)}</td>
    </tr>
  ));

  return (
    <section className="panel dafo-exploratory-panel">
      <PanelHeading eyebrow="Análisis legacy integrado" title="Matriz de cruzamiento completa" detail="Puntaje interno × puntaje externo" />
      <p className="dafo-exploratory-intro">Cada celda cruza el puntaje EFI del factor interno con el puntaje EFE del factor externo. Los subtotales conservan la lectura exploratoria clásica: FO, FA, DO y DA.</p>
      <div className="table-scroll dafo-exploratory-scroll">
        <table className="data-table dafo-exploratory-table">
          <thead>
            <tr>
              <th rowSpan={2}>Factor</th>
              <th rowSpan={2}>Pond.</th>
              <th colSpan={matrix.opportunities.length}>Oportunidades</th>
              <th rowSpan={2}>Subtotal</th>
              <th colSpan={matrix.threats.length}>Amenazas</th>
              <th rowSpan={2}>Subtotal</th>
              <th rowSpan={2}>Total</th>
            </tr>
            <tr>
              {matrix.opportunities.map(factor => <th title={factor.name} key={factor.id}><code>{factor.id}</code><small>{factor.name}</small></th>)}
              {matrix.threats.map(factor => <th title={factor.name} key={factor.id}><code>{factor.id}</code><small>{factor.name}</small></th>)}
            </tr>
          </thead>
          <tbody>
            {renderRows(matrix.strengthRows)}
            <DafoExploratorySubtotal label="Subtotal fortalezas" rows={matrix.strengthRows} opportunityQuadrant="FO" threatQuadrant="FA" matrix={matrix} />
            {renderRows(matrix.weaknessRows)}
            <DafoExploratorySubtotal label="Subtotal debilidades" rows={matrix.weaknessRows} opportunityQuadrant="DO" threatQuadrant="DA" matrix={matrix} />
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DafoExploratorySubtotal({ label, rows, opportunityQuadrant, threatQuadrant, matrix }) {
  const opportunityTotal = rows.reduce((total, row) => total + row.opportunityTotal, 0);
  const threatTotal = rows.reduce((total, row) => total + row.threatTotal, 0);
  return (
    <tr className="dafo-exploratory-subtotal">
      <td colSpan={2}><strong>{label}</strong></td>
      <td colSpan={matrix.opportunities.length} />
      <td className="dafo-subtotal-cell">{opportunityQuadrant} · {formatNumber(opportunityTotal)}</td>
      <td colSpan={matrix.threats.length} />
      <td className="dafo-subtotal-cell">{threatQuadrant} · {formatNumber(threatTotal)}</td>
      <td className="dafo-total-cell">{formatNumber(opportunityTotal + threatTotal)}</td>
    </tr>
  );
}

function exploratoryCellTone(value) {
  if (value <= 0.1) return 'dafo-cell-low';
  if (value <= 0.2) return 'dafo-cell-medium-low';
  if (value <= 0.3) return 'dafo-cell-medium';
  return 'dafo-cell-high';
}

function DafoStrategyAnalysis({ analysis }) {
  const topFactorNames = factors => [...factors]
    .sort((left, right) => right.score - left.score)
    .slice(0, 2)
    .map(factor => factor.name || factor.id);
  const factorText = factors => topFactorNames(factors).join(' y ') || 'los factores principales';
  const strengths = factorText(analysis.efi.strengths);
  const weaknesses = factorText(analysis.efi.weaknesses);
  const opportunities = factorText(analysis.efe.opportunities);
  const threats = factorText(analysis.efe.threats);
  const narratives = {
    FO: {
      heading: '¿Por qué es ofensiva?',
      explanation: `Con fortalezas como ${strengths} se pueden aprovechar oportunidades como ${opportunities}.`,
      analysis: `La puntuación FO (${formatNumber(analysis.dafo.FO)}) representa el potencial combinado de fortalezas y oportunidades; no valida por sí sola una relación.`,
      recommendation: 'Enfocar recursos en iniciativas que capitalicen las capacidades internas para capturar las oportunidades disponibles.'
    },
    FA: {
      heading: '¿Por qué es defensiva?',
      explanation: `Las fortalezas ${strengths} pueden proteger a la organización frente a amenazas como ${threats}.`,
      analysis: `La puntuación FA (${formatNumber(analysis.dafo.FA)}) indica el potencial de utilizar fortalezas como barrera protectora ante el entorno.`,
      recommendation: 'Identificar qué fortalezas son más efectivas para contener cada amenaza prioritaria.'
    },
    DO: {
      heading: '¿Por qué es adaptativa?',
      explanation: `Es necesario corregir debilidades como ${weaknesses} para aprovechar oportunidades como ${opportunities}.`,
      analysis: `La puntuación DO (${formatNumber(analysis.dafo.DO)}) refleja el potencial de desarrollo cuando se reducen las limitaciones internas.`,
      recommendation: 'Priorizar un plan de mejora para las debilidades críticas antes de comprometer nuevas iniciativas de aprovechamiento.'
    },
    DA: {
      heading: '¿Por qué es de supervivencia?',
      explanation: `La organización debe reducir debilidades como ${weaknesses} para mitigar amenazas como ${threats}.`,
      analysis: `La puntuación DA (${formatNumber(analysis.dafo.DA)}) representa el potencial de exposición conjunta a debilidades y amenazas.`,
      recommendation: 'Reducir vulnerabilidades críticas y establecer medidas de contingencia para limitar la exposición.'
    }
  };

  return (
    <section className="panel dafo-strategy-panel">
      <PanelHeading eyebrow="Análisis estratégico" title="Justificación de cada cuadrante" detail="Lectura exploratoria, no selección automática" />
      <p className="dafo-exploratory-intro">La orientación operativa actual es <strong>{analysis.relations.dominant || 'sin orientación concluyente'}</strong>. La puntuación exploratoria ayuda a interpretar el potencial; la recomendación final requiere relaciones evaluadas, evidencia y comparación QSPM.</p>
      <div className="dafo-strategy-grid">
        {QUADRANTS.map(quadrant => {
          const narrative = narratives[quadrant];
          return (
            <article className={`dafo-strategy-card dafo-strategy-${quadrant.toLowerCase()}`} key={quadrant}>
              <div className="dafo-strategy-card-header">
                <span className={`quadrant-badge badge-${quadrant.toLowerCase()}`}>{quadrant}</span>
                <div><strong>{ORIENTATIONS[quadrant].name}</strong><small>Índice exploratorio {formatNumber(analysis.dafo[quadrant])}</small></div>
              </div>
              <p><strong>{narrative.heading}</strong></p>
              <p>{narrative.explanation}</p>
              <p><strong>Análisis:</strong> {narrative.analysis}</p>
              <p><strong>Recomendación:</strong> {narrative.recommendation}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function FactorStack({ label, factors }) {
  return <div className="factor-stack"><span>{label}</span><ul>{factors.slice(0, 4).map(factor => <li key={factor.id}><code>{factor.id}</code><strong>{factor.name || 'Factor sin describir'}</strong></li>)}</ul><small>{factors.length} factores en este eje</small></div>;
}

function RelationshipComposer({ state, onAdd }) {
  const [internalId, setInternalId] = useState(state.internal[0]?.id || '');
  const [externalId, setExternalId] = useState(state.external[0]?.id || '');
  const exists = state.relationships.some(relation => relation.internalId === internalId && relation.externalId === externalId);
  const internalFactor = state.internal.find(factor => factor.id === internalId);
  const externalFactor = state.external.find(factor => factor.id === externalId);
  return (
    <section className="panel relation-composer">
      <div><p className="eyebrow">Nuevo vínculo</p><h3>Añadir un par relevante</h3><p>Seleccione un factor interno y uno externo para abrir una evaluación pendiente.</p></div>
      <div className="relation-composer-controls">
        <label><span>Factor interno</span><select className="control-input" value={internalId} onChange={event => setInternalId(event.target.value)}>{state.internal.map(factor => <option value={factor.id} key={factor.id}>{factor.id} · {factor.name || 'Sin describir'}</option>)}</select></label>
        <span className="relation-plus" aria-hidden="true">+</span>
        <label><span>Factor externo</span><select className="control-input" value={externalId} onChange={event => setExternalId(event.target.value)}>{state.external.map(factor => <option value={factor.id} key={factor.id}>{factor.id} · {factor.name || 'Sin describir'}</option>)}</select></label>
        <button className="button button-primary" type="button" disabled={!internalFactor || !externalFactor || exists} onClick={() => onAdd(internalId, externalId)}>{exists ? 'Par ya añadido' : 'Añadir par'}</button>
      </div>
    </section>
  );
}

function RelationRow({ relation, onChange }) {
  const status = relation.status || relationStatusForStrength(relation.strength);
  return <tr><td><code>{relation.internalId} + {relation.externalId}</code></td><td><span className={`quadrant-badge compact badge-${relation.quadrant.toLowerCase()}`}>{relation.quadrant}</span></td><td><span className={`relation-status relation-status-${status.replace(/\s+/g, '-')}`}>{status}</span></td><td><select className="table-input force-input" value={relation.strength ?? ''} onChange={event => onChange(relation.id, 'strength', event.target.value)} aria-label={`Fuerza ${relation.internalId} ${relation.externalId}`}><option value="">Pendiente</option><option value="0">0 · Sin relación</option><option value="1">1 · Débil</option><option value="2">2 · Moderada</option><option value="3">3 · Fuerte</option></select></td><td><textarea className="compact-textarea" rows="3" value={relation.justification || ''} onChange={event => onChange(relation.id, 'justification', event.target.value)} placeholder="Por qué existe o no existe el vínculo" /></td><td><textarea className="compact-textarea" rows="3" value={relation.evidence || ''} onChange={event => onChange(relation.id, 'evidence', event.target.value)} placeholder="Fuente o evidencia" /></td><td><input className="table-input" value={relation.evaluator || ''} onChange={event => onChange(relation.id, 'evaluator', event.target.value)} placeholder="Evaluador" /></td><td><input className="table-input" type="date" value={relation.date || ''} onChange={event => onChange(relation.id, 'date', event.target.value)} aria-label={`Fecha ${relation.internalId} ${relation.externalId}`} /></td></tr>;
}
