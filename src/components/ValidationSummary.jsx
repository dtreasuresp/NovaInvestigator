import { ArrowRight } from 'lucide-react';
import StageStatus from './StageStatus.jsx';

export default function ValidationSummary({ validation, onNavigate }) {
  const labels = { context: 'Contexto', efi: 'EFI', efe: 'EFE', dafo: 'DAFO', qspm: 'QSPM', came: 'CAME' };
  const headline = validation.complete
    ? 'Expediente completo'
    : validation.errors > 0
      ? `${validation.errors} errores pendientes`
      : `${validation.warnings} revisiones pendientes`;
  return (
    <section className="validation-summary" aria-label="Estado de validación">
      <div className="validation-summary-heading"><span className="eyebrow">Control de calidad</span><strong>{headline}</strong></div>
      <div className="validation-stage-list">
        {Object.entries(labels).map(([stage, label]) => <button className={`validation-stage validation-stage-${validation.stageStatus[stage]}`} type="button" key={stage} onClick={() => onNavigate(stage)}><span>{label}</span><StageStatus status={validation.stageStatus[stage]} /></button>)}
      </div>
      {!validation.complete && <p className="validation-summary-note">Primera revisión: {validation.issues[0]?.message}</p>}
      <div className="validation-trazabilidad">
        <span className="note-label">Cadena de trazabilidad</span>
        <strong className="trace-chain-inline"><span>D-08</span><ArrowRight size={10} /><span>DO</span><ArrowRight size={10} /><span>EST-DO-01</span></strong>
        <span className="trace-chain-inline"><ArrowRight size={10} /> ACC-D-08</span>
      </div>
    </section>
  );
}
