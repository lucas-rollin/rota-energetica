import React, { useEffect, useState } from 'react';
import { BarChart2, Table } from 'lucide-react';
import { useDebouncedValue } from '../../../lib/utils/useDebouncedValue';

export interface ChartTableData {
  headers: string[];
  rows: (string | number)[][];
}

interface ChartContainerProps {
  id: string;
  title: string;
  subtitle?: string;
  caption?: string;
  summaryText: string;
  sourceAttribution?: React.ReactNode;
  tableData: ChartTableData;
  controls?: React.ReactNode;
  children: React.ReactNode;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  id,
  title,
  subtitle,
  caption,
  summaryText,
  sourceAttribution,
  tableData,
  controls,
  children,
}) => {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const liveSummaryText = useDebouncedValue(summaryText, 600);

  // Trigger resize when switching from table back to chart
  useEffect(() => {
    if (viewMode === 'chart') {
      const timer = setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [viewMode]);

  return (
    <div
      className="card bg-base-100 border-base-300/70 overflow-hidden rounded-xl border"
      role="region"
      aria-labelledby={`${id}-heading`}
    >
      {/* Header with Title and Controls */}
      <div className="border-base-300/60 bg-base-200/35 flex flex-col justify-between gap-2.5 border-b px-4 py-3 sm:flex-row sm:items-center">
        <div>
          <h3
            id={`${id}-heading`}
            className="text-base-content text-sm font-bold sm:text-base"
          >
            {title}
          </h3>
          {subtitle && <p className="text-base-content/70 mt-0.5 text-xs">{subtitle}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {controls}

          {/* Toggle View Mode (Gráfico vs Tabela) */}
          <div className="join" role="group" aria-label="Modo de visualização dos dados">
            <button
              type="button"
              className={`join-item btn btn-xs gap-1.5 ${
                viewMode === 'chart' ? 'btn-primary' : 'btn-ghost text-base-content/70'
              }`}
              onClick={() => setViewMode('chart')}
              aria-pressed={viewMode === 'chart'}
              aria-label="Ver como gráfico interativo"
            >
              <BarChart2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Gráfico</span>
            </button>
            <button
              type="button"
              className={`join-item btn btn-xs gap-1.5 ${
                viewMode === 'table' ? 'btn-primary' : 'btn-ghost text-base-content/70'
              }`}
              onClick={() => setViewMode('table')}
              aria-pressed={viewMode === 'table'}
              aria-label="Ver dados em tabela acessível"
            >
              <Table className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Tabela</span>
            </button>
          </div>
        </div>
      </div>

      {/* Screen reader summary (debounced during rapid slider drags) */}
      <div className="sr-only" aria-live="polite">
        {liveSummaryText}
      </div>

      {/* Body: Chart and Table both maintained in DOM to preserve ECharts state */}
      <div className="p-3.5 sm:p-4">
        <div className={viewMode === 'chart' ? 'block' : 'hidden'}>
          <div className="w-full">{children}</div>
          {caption && <p className="text-base-content/75 mt-2.5 text-xs">{caption}</p>}
        </div>

        <div className={viewMode === 'table' ? 'block' : 'hidden'}>
          <div className="overflow-x-auto">
            <table className="table-zebra table-sm table w-full text-left text-xs">
              <caption className="sr-only">
                {title} - Tabela de dados equivalentes
              </caption>
              <thead>
                <tr className="border-base-300 border-b">
                  {tableData.headers.map((h, i) => (
                    <th key={i} scope="col" className="text-base-content font-bold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableData.rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-base-200/50">
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className={
                          cIdx === 0
                            ? 'text-base-content font-medium'
                            : 'text-base-content/90 font-mono'
                        }
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {sourceAttribution && (
          <div className="border-base-200/80 text-base-content/70 mt-3 flex flex-wrap items-center gap-1.5 border-t pt-2.5 text-[11px]">
            {sourceAttribution}
          </div>
        )}
      </div>
    </div>
  );
};
