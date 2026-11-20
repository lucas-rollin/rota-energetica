import React from 'react';
import { Info } from 'lucide-react';
import { getSource } from '../../lib/data/sources';
import { openSourceModal } from './SourceModal';

interface SourceRefProps {
  id: string;
  context?: string;
  size?: 'xs' | 'sm';
  prefix?: string;
  className?: string;
}

/**
 * Standardized interactive source citation chip that opens the global SourceModal on click.
 */
export const SourceRef: React.FC<SourceRefProps> = ({
  id,
  context,
  size = 'xs',
  prefix = '',
  className = '',
}) => {
  const source = getSource(id);
  const sizeClasses =
    size === 'sm' ? 'px-2 py-0.5 text-xs leading-tight' : 'px-1.5 py-0.5 text-[10px] leading-none';

  if (!source) {
    return (
      <span
        className={`bg-base-200 text-base-content/60 border-base-300 inline-flex shrink-0 items-center rounded border font-mono whitespace-nowrap ${sizeClasses} ${className}`}
      >
        {prefix}
        {id}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => openSourceModal(id, context)}
      title={`${id} — ${source.name} (${source.publisher}). Clique para ver detalhes da fonte.`}
      aria-label={`Ver detalhes da fonte ${id}: ${source.name}`}
      className={`border-base-300 bg-base-200/75 text-base-content/85 hover:border-primary/60 hover:bg-primary/10 hover:text-primary focus-visible:outline-primary inline-flex shrink-0 cursor-pointer items-center gap-1 rounded border font-mono font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 ${sizeClasses} ${className}`}
    >
      <Info className="h-2.5 w-2.5 shrink-0 opacity-65" aria-hidden="true" />
      <span>
        {prefix}
        {id}
      </span>
    </button>
  );
};
