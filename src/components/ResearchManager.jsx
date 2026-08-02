import { useState } from 'react';
import { X } from 'lucide-react';

export default function ResearchManager({ investigations, activeId, onClose, onNew, onOpen, onDuplicate, onArchive, onRestore, onRename, onCloseResearch }) {
  const [showArchived, setShowArchived] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draftTitle, setDraftTitle] = useState('');
  const visibleInvestigations = investigations.filter(research => Boolean(research.metadata?.archivedAt) === showArchived);
  const startRename = research => {
    setEditingId(research.metadata.id);
    setDraftTitle(research.metadata.title || '');
  };
  const saveRename = event => {
    event.preventDefault();
    onRename(editingId, draftTitle);
    setEditingId(null);
  };
  return (
    <div className="modal-backdrop">
      <dialog open className="research-modal" aria-labelledby="research-title">
        <div className="research-modal-header">
          <div>
            <p className="eyebrow">Archivo de trabajo</p>
            <h2 id="research-title">Investigaciones</h2>
            <p>Abra un expediente, duplíquelo para explorar un escenario o cree uno nuevo.</p>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Cerrar gestor"><X size={17} /></button>
        </div>
        <div className="research-modal-switcher">
          <button className={`button ${!showArchived ? 'button-primary' : 'button-outline'}`} type="button" onClick={() => setShowArchived(false)}>Activas ({investigations.filter(research => !research.metadata?.archivedAt).length})</button>
          <button className={`button ${showArchived ? 'button-primary' : 'button-outline'}`} type="button" onClick={() => setShowArchived(true)}>Archivo ({investigations.filter(research => research.metadata?.archivedAt).length})</button>
        </div>
        <div className="research-list">
          {visibleInvestigations.length === 0 && <p className="empty-state">No hay investigaciones en esta vista.</p>}
          {visibleInvestigations.map(research => (
            <article className={`research-item ${research.metadata.id === activeId ? 'is-active' : ''} ${research.metadata.archivedAt ? 'is-archived' : ''}`} key={research.metadata.id}>
              <div className="research-item-main">
                <span className="research-item-status">{research.metadata.status || 'borrador'}</span>
                {editingId === research.metadata.id
                  ? <form className="research-rename-form" onSubmit={saveRename}><input className="control-input" value={draftTitle} onChange={event => setDraftTitle(event.target.value)} aria-label="Nuevo nombre de investigación" autoFocus /><button className="button button-primary" type="submit">Guardar</button><button className="button button-outline" type="button" onClick={() => setEditingId(null)}>Cancelar</button></form>
                  : <h3>{research.metadata.title || 'Sin título'}</h3>}
                <p>{research.metadata.organization || 'Organización pendiente'} · {research.metadata.unit || 'Unidad pendiente'}</p>
                <code>{research.metadata.id}</code>
              </div>
              <div className="research-item-actions">
                {!research.metadata.archivedAt && <button className="button button-outline" type="button" onClick={() => onOpen(research)}>Abrir</button>}
                {!research.metadata.archivedAt && <button className="button button-quiet-dark" type="button" onClick={() => onDuplicate(research)}>Duplicar</button>}
                <button className="text-button" type="button" onClick={() => startRename(research)}>Renombrar</button>
                {research.metadata.archivedAt
                  ? <button className="text-button" type="button" onClick={() => onRestore(research.metadata.id)}>Recuperar</button>
                  : <>
                    {research.metadata.status !== 'cerrada' && <button className="text-button" type="button" onClick={() => onCloseResearch(research.metadata.id)}>Cerrar</button>}
                    {research.metadata.id !== activeId && <button className="text-button" type="button" onClick={() => onArchive(research.metadata.id)}>Archivar</button>}
                  </>}
              </div>
            </article>
          ))}
        </div>
        <div className="research-modal-footer">
          <button className="button button-primary" type="button" onClick={onNew}><span aria-hidden="true">+</span> Nueva investigación</button>
          <button className="button button-outline" type="button" onClick={onClose}>Cerrar</button>
        </div>
      </dialog>
    </div>
  );
}
