import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

export default function StageStatus({ status }) {
  if (!status) return null;
  const labels = { ready: <CheckCircle2 size={11} />, warning: <AlertTriangle size={11} />, error: <X size={11} /> };
  return <span className={`stage-status stage-status-${status}`} title={status === 'ready' ? 'Sin pendientes' : 'Requiere revisión'} aria-label={status === 'ready' ? 'Sin pendientes' : 'Requiere revisión'}>{labels[status]}</span>;
}
