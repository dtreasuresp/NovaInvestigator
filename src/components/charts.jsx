import { formatNumber, formatPercent } from '../domain.js';
import PanelHeading from './PanelHeading.jsx';

export function ChartDeck({ analysis }) {
  return (
    <section className="chart-deck">
      <div className="panel chart-panel comparison-chart">
        <PanelHeading eyebrow="Lectura comparativa" title="Capacidad y respuesta" detail="Escala máxima 4.00" />
        <div className="comparison-bars">
          <ChartBar label="EFI · interno" value={analysis.efi.total} max={4} tone="teal" />
          <ChartBar label="EFE · entorno" value={analysis.efe.total} max={4} tone="amber" />
          <ChartBar label="Cobertura dominante" value={analysis.relations.coverage * 4} max={4} tone="brick" valueLabel={formatPercent(analysis.relations.coverage)} />
        </div>
      </div>
      <div className="panel chart-panel radar-panel">
        <PanelHeading eyebrow="Perfil del caso" title="Radar de lectura" detail="Valores normalizados" />
        <RadarChart analysis={analysis} />
      </div>
      <div className="panel chart-panel priority-chart-panel">
        <PanelHeading eyebrow="CAME · prioridad" title="Acciones que abren el plan" detail="Top 5" />
        <PriorityChart actions={analysis.came.actions} />
      </div>
    </section>
  );
}

export function ChartBar({ label, value, max, tone, valueLabel }) {
  const percentage = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return <div className="chart-bar-row"><div className="chart-bar-label"><span>{label}</span><strong>{valueLabel || formatNumber(value)}</strong></div><div className="chart-bar-track"><span className={`chart-bar-fill chart-fill-${tone}`} style={{ width: `${percentage}%` }} /></div></div>;
}

export function RadarChart({ analysis }) {
  const values = [
    analysis.efi.total / 4,
    analysis.efe.total / 4,
    analysis.relations.coverage,
    analysis.qspm.results[0]?.totalTas ? analysis.qspm.results[0].totalTas / 4 : 0,
    analysis.came.actions.length ? Math.min(1, analysis.came.actions.filter(action => action.priority >= 0.5).length / analysis.came.actions.length * 2) : 0
  ];
  const points = [
    [50, 7],
    [92, 38],
    [76, 89],
    [24, 89],
    [8, 38]
  ];
  const polygon = points.map(([x, y], index) => {
    const centerX = 50;
    const centerY = 50;
    const scale = values[index];
    return `${centerX + (x - centerX) * scale}% ${centerY + (y - centerY) * scale}%`;
  }).join(', ');
  const labels = ['EFI', 'EFE', 'Cobertura', 'QSPM', 'CAME'];
  return <div className="radar-wrap"><div className="radar-plot"><span className="radar-ring radar-ring-outer" /><span className="radar-ring radar-ring-inner" /><span className="radar-axis radar-axis-a" /><span className="radar-axis radar-axis-b" /><span className="radar-axis radar-axis-c" /><span className="radar-axis radar-axis-d" /><span className="radar-axis radar-axis-e" /><span className="radar-shape" style={{ clipPath: `polygon(${polygon})` }} />{labels.map((label, index) => <span className={`radar-label radar-label-${index}`} key={label}>{label}</span>)}</div><div className="radar-legend"><span><i className="legend-swatch legend-teal" />Perfil actual</span><small>La forma combina desempeño, cobertura, selección y capacidad de acción.</small></div></div>;
}

export function PriorityChart({ actions }) {
  const topActions = [...actions].sort((left, right) => right.priority - left.priority).slice(0, 5);
  return <div className="priority-chart">{topActions.length > 0 ? topActions.map(action => <div className="priority-chart-row" key={action.id}><div><code>{action.id}</code><span>{action.action}</span></div><ChartBar label="" value={action.priority} max={1} tone={action.category === 'critica' ? 'brick' : action.category === 'alta' ? 'amber' : 'teal'} valueLabel={formatNumber(action.priority)} /></div>) : <p className="empty-chart">Sin acciones priorizadas todavía.</p>}</div>;
}
