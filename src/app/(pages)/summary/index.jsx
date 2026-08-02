import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ORIENTATIONS, QUADRANTS, formatNumber, formatPercent } from '../../../domain.js';
import { useAnalysis } from '../../../state/AnalysisContext.jsx';
import PageHeader from '../../../components/PageHeader.jsx';
import PanelHeading from '../../../components/PanelHeading.jsx';
import { ChartDeck } from '../../../components/charts.jsx';

export default function SummaryPage() {
  const { state, analysis, selectedStrategy, selectedResult } = useAnalysis();
  const navigate = useNavigate();
  const dominant = analysis.relations.dominant;
  const dominantInfo = dominant ? ORIENTATIONS[dominant] : null;
  const traceRelation = state.relationships.find(relation => relation.internalId === 'D-08' && relation.externalId === 'O-01');
  const traceAction = analysis.came.actions.find(action => action.id === 'ACC-D-08');

  return (
    <>
      <PageHeader
        eyebrow="Lectura ejecutiva / 01"
        title={state.metadata.title}
        description="Una mesa de trabajo para convertir factores ponderados en decisiones justificadas y acciones verificables."
        action={<span className="demo-badge">{state.metadata.label}</span>}
      />

      <section className="hero-strip">
        <div className="hero-copy">
          <span className="hero-kicker">Hipótesis de trabajo</span>
          <h3>La debilidad de integración limita una oportunidad de modernización.</h3>
          <p>El escenario sugiere una orientación DO. La lectura es operativa, no una decisión automática: relaciones, QSPM y CAME deben revisarse con la evidencia institucional.</p>
        </div>
        <div className="hero-signal">
          <span>Orientación sugerida</span>
          <strong className="signal-value">{dominant || '—'}</strong>
          <small>{dominantInfo ? `${dominantInfo.name} · ${dominantInfo.subtitle}` : 'Sin base suficiente'}</small>
        </div>
      </section>

      <div className="metric-grid">
        <MetricCard label="EFI" value={formatNumber(analysis.efi.total)} note="Capacidad interna" tone="teal" onClick={() => navigate('/app/efi')} />
        <MetricCard label="EFE" value={formatNumber(analysis.efe.total)} note="Respuesta al entorno" tone="amber" onClick={() => navigate('/app/efe')} />
        <MetricCard label="Relaciones" value={`${analysis.relations.evaluatedCount}/100`} note={`${formatPercent(analysis.relations.coverage)} de cobertura`} tone="brick" onClick={() => navigate('/app/dafo')} />
        <MetricCard label="Acciones CAME" value={analysis.came.actions.length} note={`${analysis.came.actions.filter(action => action.category === 'critica').length} críticas`} tone="ink" onClick={() => navigate('/app/came')} />
      </div>

      <div className="overview-columns">
        <section className="panel trace-panel">
          <PanelHeading eyebrow="Trazabilidad prioritaria" title="Del factor a la acción" detail="Cadena demostrativa" />
          <div className="trace-chain">
            <TraceNode code="D-08" label="Debilidad" text="Falta de integración de procesos" tone="brick" />
            <span className="trace-link" aria-hidden="true"><ArrowRight size={19} /></span>
            <TraceNode code="DO" label="Orientación" text="Reorientar y desarrollar" tone="amber" />
            <span className="trace-link" aria-hidden="true"><ArrowRight size={19} /></span>
            <TraceNode code="EST-DO-01" label="Estrategia" text={selectedStrategy?.name || 'Sin selección'} tone="teal" />
            <span className="trace-link" aria-hidden="true"><ArrowRight size={19} /></span>
            <TraceNode code="ACC-D-08" label="Acción" text={traceAction?.action || 'Sin ficha'} tone="ink" />
          </div>
          <div className="trace-evidence">
            <span className="evidence-label">Relación D-08 + O-01</span>
            <p>{traceRelation?.justification}</p>
            <small>{traceRelation?.evidence} · Evaluador: {traceRelation?.evaluator} · {traceRelation?.date}</small>
          </div>
        </section>

        <section className="panel decision-panel">
          <PanelHeading eyebrow="Decisión pendiente" title="Selección QSPM" detail={selectedResult ? `TAS ${formatNumber(selectedResult.totalTas)}` : 'Sin alternativa'} />
          <div className="decision-main">
            <span className="decision-code">{selectedStrategy?.id || '—'}</span>
            <h3>{selectedStrategy?.name || 'Seleccione una alternativa'}</h3>
            <p>{state.selectionJustification || 'La selección requiere una justificación explícita.'}</p>
          </div>
          <button className="button button-outline button-wide" type="button" onClick={() => navigate('/app/qspm')}>Revisar alternativas <ArrowRight size={15} /></button>
        </section>
      </div>

      <section className="panel quadrant-panel">
        <PanelHeading eyebrow="DAFO relacional" title="Intensidad por cuadrante" detail={`Confianza ${analysis.relations.confidence}`} />
        <div className="quadrant-overview">
          {QUADRANTS.map(quadrant => {
            const item = analysis.relations.summary[quadrant];
            return <QuadrantBar key={quadrant} quadrant={quadrant} value={item.index} coverage={item.coverage} active={quadrant === dominant} />;
          })}
        </div>
      </section>
      <ChartDeck analysis={analysis} />
    </>
  );
}

export function MetricCard({ label, value, note, tone, onClick }) {
  return <button className={`metric-card metric-${tone}`} type="button" onClick={onClick}><span>{label}</span><strong>{value}</strong><small>{note}</small><i aria-hidden="true"><ArrowUpRight size={16} /></i></button>;
}

export function TraceNode({ code, label, text, tone }) {
  return <div className={`trace-node trace-${tone}`}><code>{code}</code><span>{label}</span><strong>{text}</strong></div>;
}

export function QuadrantBar({ quadrant, value, coverage, active }) {
  return <div className={`quadrant-bar-row ${active ? 'is-active' : ''}`}><span className={`quadrant-badge compact badge-${quadrant.toLowerCase()}`}>{quadrant}</span><div className="quadrant-bar-track"><span className={`quadrant-bar-fill fill-${quadrant.toLowerCase()}`} style={{ width: `${Math.max(4, Math.min(100, value * 100))}%` }} /></div><strong>{formatNumber(value)}</strong><small>{formatPercent(coverage)}</small></div>;
}

export function QuadrantCard({ quadrant, rawValue, item, active }) {
  return <article className={`quadrant-card ${active ? 'is-active' : ''}`}><div className="quadrant-card-top"><span className={`quadrant-badge badge-${quadrant.toLowerCase()}`}>{quadrant}</span><small>{active ? 'Dominante' : ORIENTATIONS[quadrant].name}</small></div><strong>{formatNumber(item.index)}</strong><p>Índice relacional · {formatNumber(rawValue)} exploratorio</p><span>{item.evaluated}/{item.available} pares · {formatPercent(item.coverage)} cobertura</span></article>;
}
