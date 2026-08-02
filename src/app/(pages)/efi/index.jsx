import { formatNumber } from '../../../domain.js';
import { TYPE_LABELS } from '../../constants.js';
import { useAnalysis } from '../../../state/AnalysisContext.jsx';
import PageHeader from '../../../components/PageHeader.jsx';

export default function EfiPage() {
  const { state, analysis, updateFactor } = useAnalysis();
  return (
    <FactorView
      title="Matriz EFI (Evaluación de Factores Internos)"
      subtitle="Evaluación de factores internos"
      description="La ponderación expresa la importancia relativa del factor. La calificación mide la respuesta interna en una escala de 1 a 4."
      factors={state.internal}
      total={analysis.efi.total}
      weightTotal={analysis.efi.weightTotal}
      group="internal"
      onChange={updateFactor}
    />
  );
}

export function FactorView({ title, subtitle, description, factors, total, weightTotal, group, onChange }) {
  const grouped = group === 'internal'
    ? { primary: factors.filter(factor => factor.type === 'F'), secondary: factors.filter(factor => factor.type === 'D') }
    : { primary: factors.filter(factor => factor.type === 'O'), secondary: factors.filter(factor => factor.type === 'A') };
  const primaryLabel = group === 'internal' ? 'Fortalezas' : 'Oportunidades';
  const secondaryLabel = group === 'internal' ? 'Debilidades' : 'Amenazas';

  return (
    <>
      <PageHeader eyebrow={`Matriz / ${group === 'internal' ? '02' : '03'}`} title={title} description={description} action={<span className="section-tag">{subtitle}</span>} />
      <div className="method-band">
        <span className="formula-chip">Puntaje = ponderación × calificación</span>
        <span>Pesos: {formatNumber(weightTotal)} · Rango de calificación: 1 a 4</span>
        <strong>{formatNumber(total)}</strong>
      </div>
      <section className="panel factor-panel">
        <div className="table-toolbar">
          <div><strong>{factors.length} factores cargados</strong><span>Los campos se recalculan al editar.</span></div>
          <span className={`weight-status ${Math.abs(weightTotal - 1) < 0.001 ? 'is-valid' : 'is-warning'}`}>{Math.abs(weightTotal - 1) < 0.001 ? 'Pesos válidos' : 'Revisar suma de pesos'}</span>
        </div>
        <div className="table-scroll">
          <table className="data-table factor-table">
            <thead><tr><th>Código</th><th>Factor / evidencia</th><th>Tipo</th><th>Ponderación</th><th>Calificación</th><th>Puntaje</th></tr></thead>
            <tbody>{factors.map(factor => <FactorRow key={factor.id} factor={factor} group={group} onChange={onChange} />)}</tbody>
            <tfoot><tr><td colSpan="3">TOTAL</td><td>{formatNumber(weightTotal)}</td><td>—</td><td>{formatNumber(total)}</td></tr></tfoot>
          </table>
        </div>
      </section>
      <div className="factor-split">
        <FactorList title={primaryLabel} factors={grouped.primary} tone="teal" />
        <FactorList title={secondaryLabel} factors={grouped.secondary} tone="brick" />
      </div>
    </>
  );
}

function FactorRow({ factor, group, onChange }) {
  return (
    <tr>
      <td><code className={`factor-code type-${factor.type.toLowerCase()}`}>{factor.id}</code></td>
      <td><div className="factor-editor"><input className="table-input" value={factor.name || ''} onChange={event => onChange(group, factor.id, 'name', event.target.value)} placeholder="Nombre del factor" aria-label={`Nombre ${factor.id}`} /><details className="factor-details"><summary>{factor.description || factor.evidence ? 'Revisar notas y evidencia' : 'Añadir notas y evidencia'}</summary><div className="factor-detail-grid"><label>Descripción<textarea className="compact-textarea" rows="2" value={factor.description || ''} onChange={event => onChange(group, factor.id, 'description', event.target.value)} placeholder="¿Qué expresa este factor?" /></label><label>Evidencia<textarea className="compact-textarea" rows="2" value={factor.evidence || ''} onChange={event => onChange(group, factor.id, 'evidence', event.target.value)} placeholder="Fuente, entrevista, dato o documento" /></label></div></details></div></td>
      <td><span className={`type-pill type-${factor.type.toLowerCase()}`}>{TYPE_LABELS[factor.type]}</span></td>
      <td><input className="table-input weight-input" type="number" min="0" max="1" step="0.01" value={factor.weight} onChange={event => onChange(group, factor.id, 'weight', event.target.value)} aria-label={`Ponderación ${factor.id}`} /></td>
      <td><select className="table-input" value={factor.rating} onChange={event => onChange(group, factor.id, 'rating', event.target.value)} aria-label={`Calificación ${factor.id}`}><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></td>
      <td className="score-cell">{formatNumber(factor.weight * factor.rating)}</td>
    </tr>
  );
}

function FactorList({ title, factors, tone }) {
  return <section className={`factor-list panel tone-${tone}`}><div className="panel-heading"><h3>{title}</h3><span>{factors.length} elementos</span></div><ul>{factors.map(factor => <li key={factor.id}><code>{factor.id}</code><span>{factor.name}</span><strong>{formatNumber(factor.weight * factor.rating)}</strong></li>)}</ul></section>;
}
