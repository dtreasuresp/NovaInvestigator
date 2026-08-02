import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAnalysis } from '../../../state/AnalysisContext.jsx';
import PageHeader from '../../../components/PageHeader.jsx';

export default function ContextPage() {
  const { state, updateMetadata } = useAnalysis();
  const navigate = useNavigate();
  const metadata = state.metadata;
  const fields = [
    { id: 'title', label: 'Título de la investigación', type: 'text', wide: true },
    { id: 'organization', label: 'Organización', type: 'text' },
    { id: 'unit', label: 'Unidad analizada', type: 'text' },
    { id: 'author', label: 'Autor o equipo', type: 'text' },
    { id: 'evaluationDate', label: 'Fecha de evaluación', type: 'date' },
    { id: 'methodologicalVersion', label: 'Versión metodológica', type: 'text' }
  ];

  return (
    <>
      <PageHeader
        eyebrow="Expediente / 00"
        title="Contexto de la investigación"
        description="Identifique el caso antes de ponderar factores. Esta ficha acompaña el análisis y se conserva con el informe exportado."
        action={<span className="section-tag">{metadata.status || 'borrador'}</span>}
      />
      <section className="panel context-panel">
        <div className="context-panel-heading">
          <div>
            <p className="eyebrow">Ficha del expediente</p>
            <h3>Qué se está evaluando</h3>
          </div>
          <span className="context-id">{metadata.id}</span>
        </div>
        <div className="metadata-form">
          {fields.map(field => (
            <label className={field.wide ? 'field-wide' : ''} key={field.id}>
              <span>{field.label}</span>
              <input className="control-input" type={field.type} value={metadata[field.id] || ''} onChange={event => updateMetadata(field.id, event.target.value)} />
            </label>
          ))}
          <label className="field-wide">
            <span>Problema central</span>
            <textarea className="control-input" rows="3" value={metadata.problem || ''} onChange={event => updateMetadata('problem', event.target.value)} placeholder="¿Qué situación requiere una lectura estratégica?" />
          </label>
          <label className="field-wide">
            <span>Objetivo del análisis</span>
            <textarea className="control-input" rows="3" value={metadata.objective || ''} onChange={event => updateMetadata('objective', event.target.value)} placeholder="¿Qué decisión o mejora debe apoyar este estudio?" />
          </label>
          <label className="field-wide">
            <span>Supuestos y observaciones</span>
            <textarea className="control-input" rows="3" value={metadata.assumptions || ''} onChange={event => updateMetadata('assumptions', event.target.value)} placeholder="Registre límites, fuentes, supuestos y notas de trabajo." />
          </label>
        </div>
        <div className="context-footer">
          <span><strong>Guardado local</strong> · última actualización {metadata.updatedAt ? new Date(metadata.updatedAt).toLocaleString('es-CU') : 'pendiente'}</span>
          <button className="button button-primary" type="button" onClick={() => navigate('/app/efi')}>Continuar a factores <ArrowRight size={15} /></button>
        </div>
      </section>
    </>
  );
}
