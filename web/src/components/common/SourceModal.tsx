import React, { useEffect, useRef, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { getSource } from '../../lib/data/sources';
import type { SourceItem } from '../../lib/types/sources';

export const OPEN_SOURCE_MODAL_EVENT = 'rota:open-source';

export interface OpenSourceModalDetail {
  sourceId: string;
  contextLabel?: string;
}

/**
 * Dispatches a global browser event to open the source metadata modal for a catalog ID.
 */
export function openSourceModal(sourceId: string, contextLabel?: string): boolean {
  const source = getSource(sourceId);
  if (!source) return false;

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<OpenSourceModalDetail>(OPEN_SOURCE_MODAL_EVENT, {
        detail: { sourceId, contextLabel },
      })
    );
  }
  return true;
}

interface SourceModalProps {
  source: SourceItem | null;
  contextLabel?: string;
  onClose: () => void;
}

/**
 * Accessible native dialog displaying provenance, methodology, license, and links for a data source.
 */
export const SourceModal: React.FC<SourceModalProps> = ({
  source,
  contextLabel,
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
    } else if (dialog.open) {
      dialog.close();
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
      ? 'badge-success'
      : source.badge === 'Adaptada'
        ? 'badge-info'
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
            {contextLabel && (
              <p className="text-primary mt-0.5 text-xs font-medium">
                Referência: {contextLabel}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-sm btn-circle btn-ghost"
            aria-label="Fechar modal de fonte"
          >
            <X className="h-4 w-4" aria-hidden="true" />
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
                Texto de Atribuição (LICENSE-DATA)
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
                      <span>Ver termos</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
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
                  <span>Acessar página oficial</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
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

/**
 * Page-level listener island mounted once in Layout.astro so any SourceRef button can open SourceModal.
 */
export const GlobalSourceModal: React.FC = () => {
  const [modalState, setModalState] = useState<{
    source: SourceItem;
    contextLabel?: string;
  } | null>(null);

  useEffect(() => {
    const handleOpen = (event: Event) => {
      const customEvent = event as CustomEvent<OpenSourceModalDetail>;
      const detail = customEvent.detail;
      if (!detail?.sourceId) return;

      const source = getSource(detail.sourceId);
      if (source) {
        setModalState({
          source,
          contextLabel: detail.contextLabel,
        });
      }
    };

    window.addEventListener(OPEN_SOURCE_MODAL_EVENT, handleOpen);
    return () => {
      window.removeEventListener(OPEN_SOURCE_MODAL_EVENT, handleOpen);
    };
  }, []);

  return (
    <SourceModal
      source={modalState?.source ?? null}
      contextLabel={modalState?.contextLabel}
      onClose={() => setModalState(null)}
    />
  );
};
