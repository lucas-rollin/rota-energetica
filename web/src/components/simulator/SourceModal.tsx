import React, { useEffect, useRef } from 'react';
import type { SourceItem } from '../../lib/types/sources';

interface SourceModalProps {
  source: SourceItem | null;
  paramLabel?: string;
  onClose: () => void;
}

export const SourceModal: React.FC<SourceModalProps> = ({
  source,
  paramLabel,
  onClose,
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (source) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [source]);

  // Handle native cancel (Esc key)
  const handleCancel = (e: React.SyntheticEvent) => {
    e.preventDefault();
    onClose();
  };

  if (!source) return null;

  const badgeColorClass =
    source.badge === 'Primária'
      ? 'badge-success text-white'
      : source.badge === 'Adaptada'
        ? 'badge-info text-white'
        : 'badge-warning';

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      className="modal modal-bottom sm:modal-middle"
      aria-labelledby="source-dialog-title"
    >
      <div className="modal-box bg-base-100 text-base-content border-base-300 max-w-2xl rounded-2xl border p-6 shadow-2xl">
        <div className="border-base-200 flex items-start justify-between gap-4 border-b pb-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="bg-base-200 text-base-content/80 rounded px-2 py-0.5 font-mono text-xs font-bold">
                {source.id}
              </span>
              <span className={`badge badge-sm font-medium ${badgeColorClass}`}>
                {source.badge}
              </span>
              <span className="text-base-content/60 text-xs font-medium">
                Categoria {source.category}
              </span>
            </div>
            <h3 id="source-dialog-title" className="text-base-content text-xl font-bold">
              {source.name}
            </h3>
            {paramLabel && (
              <p className="text-primary mt-0.5 text-xs font-medium">
                Parâmetro associado: {paramLabel}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-sm btn-circle btn-ghost"
            aria-label="Fechar modal de fonte"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 py-4 text-sm">
          <div>
            <span className="text-base-content/60 mb-1 block text-xs font-semibold tracking-wider uppercase">
              Publicador / Órgão
            </span>
            <p className="text-base-content font-medium">{source.publisher}</p>
          </div>

          <div>
            <span className="text-base-content/60 mb-1 block text-xs font-semibold tracking-wider uppercase">
              Descrição
            </span>
            <p className="text-base-content/90 leading-relaxed">{source.description}</p>
          </div>

          {source.notes && (
            <div className="bg-base-200/50 border-base-200 rounded-lg border p-3">
              <span className="text-base-content/60 mb-1 block text-xs font-semibold tracking-wider uppercase">
                Notas metodológicas
              </span>
              <p className="text-base-content/80 text-xs leading-relaxed">
                {source.notes}
              </p>
            </div>
          )}

          {source.attribution && (
            <div>
              <span className="text-base-content/60 mb-1 block text-xs font-semibold tracking-wider uppercase">
                Texto de Atribuição (LICENSE-DATA §4)
              </span>
              <blockquote className="border-primary bg-primary/5 text-base-content/90 rounded-r border-l-4 py-1 pl-3 font-mono text-xs italic">
                {source.attribution}
              </blockquote>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
            <div>
              <span className="text-base-content/60 mb-1 block text-xs font-semibold tracking-wider uppercase">
                Termos de uso
              </span>
              <p className="text-base-content/80 text-xs">
                {source.terms}
                {source.terms_url && (
                  <>
                    {' · '}
                    <a
                      href={source.terms_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link link-primary inline-flex items-center gap-1"
                    >
                      Ver termos
                      <span aria-hidden="true">↗</span>
                    </a>
                  </>
                )}
              </p>
            </div>

            <div>
              <span className="text-base-content/60 mb-1 block text-xs font-semibold tracking-wider uppercase">
                Link da Fonte Oficial
              </span>
              {source.url ? (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link link-primary inline-flex items-center gap-1 text-xs font-medium break-all"
                >
                  Acessar página oficial
                  <span aria-hidden="true">↗</span>
                </a>
              ) : (
                <span className="text-base-content/50 text-xs italic">
                  Link direto não disponível
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="modal-action border-base-200 border-t pt-3">
          <button type="button" className="btn btn-primary btn-sm px-6" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={onClose}>
          fechar
        </button>
      </form>
    </dialog>
  );
};
