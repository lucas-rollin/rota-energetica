import React from 'react';
import { ExternalLink, TriangleAlert } from 'lucide-react';

interface TransparencyDisclaimerProps {
  compact?: boolean;
}

export const METHODOLOGY_LIMITATIONS = [
  {
    id: 1,
    title: '1. Finalidade Educacional',
    body: 'Estimativas comparativas para fins educacionais. Não constituem recomendação de investimento ou projeto de engenharia.',
  },
  {
    id: 2,
    title: '2. Preços Públicos de Referência',
    body: 'Baseados em pesquisas e tarifas oficiais (ANP, ANEEL), podendo divergir de contratos atacadistas e créditos tributários de frotistas.',
  },
  {
    id: 3,
    title: '3. Premissas Editáveis',
    body: 'Valores com selo "Ilustrativa" representam hipóteses de trabalho abertas à calibração pelo usuário, não dados observados.',
  },
  {
    id: 4,
    title: '4. Não-Isolamento Tecnológico',
    body: 'Comparam-se veículos comerciais reais (Scania, Sany) que possuem massas, configurações de eixo e capacidades de carga distintas.',
  },
  {
    id: 5,
    title: '5. Fronteira do TCO (MVP)',
    body: 'Exclui custos de infraestrutura própria de eletroposto/gás, reforços de rede elétrica, financiamento, seguros e impostos sobre propriedade.',
  },
  {
    id: 6,
    title: '6. Emissões Poço à Roda (WtW)',
    body: 'Dependem da fronteira metodológica e dos fatores regulatórios selecionados (CNPE, RenovaBio, MCTI/SIRENE e EPE).',
  },
  {
    id: 7,
    title: '7. Incerteza e Precisão Exibida',
    body: 'A incerteza real dos parâmetros e projeções operacionais pode ser maior do que a precisão numérica exibida nos resultados.',
  },
] as const;

/**
 * Reusable transparency & methodological limitations notice (Methodology §10).
 */
export const TransparencyDisclaimer: React.FC<TransparencyDisclaimerProps> = ({
  compact = true,
}) => {
  const baseUrl = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;

  if (compact) {
    return (
      <details className="bg-base-100 border-base-300/70 group rounded-xl border px-4 py-3">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs select-none">
          <div className="flex items-center gap-2.5">
            <span className="bg-warning/15 text-warning flex h-6 w-6 shrink-0 items-center justify-center rounded-md">
              <TriangleAlert className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="text-base-content/85">
              <strong className="text-base-content font-semibold">
                Limitações metodológicas:
              </strong>{' '}
              estimativas educacionais; exclui infraestrutura, reforço de rede e
              financiamento.
            </span>
          </div>
          <span className="text-primary shrink-0 text-[11px] font-semibold group-open:hidden">
            Detalhes ▾
          </span>
          <span className="text-primary hidden shrink-0 text-[11px] font-semibold group-open:inline">
            Ocultar ▴
          </span>
        </summary>

        <div className="border-base-300/60 mt-3 space-y-3 border-t pt-3">
          <ol className="grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-2 lg:grid-cols-3">
            {METHODOLOGY_LIMITATIONS.map((item) => (
              <li
                key={item.id}
                className="bg-base-200/45 border-base-300/60 rounded-lg border p-2.5"
              >
                <strong className="text-base-content block">{item.title}</strong>
                <span className="text-base-content/75 leading-relaxed">{item.body}</span>
              </li>
            ))}
          </ol>
          <div className="flex justify-end">
            <a
              href={`${baseUrl}fontes`}
              className="link link-primary inline-flex items-center gap-1 text-[11px] font-semibold"
            >
              <span>Consultar fontes completas e licenças</span>
              <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
            </a>
          </div>
        </div>
      </details>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 pt-1 text-xs sm:grid-cols-2 lg:grid-cols-3">
      {METHODOLOGY_LIMITATIONS.map((item) => (
        <div
          key={item.id}
          className="bg-base-200/40 border-base-200 rounded-xl border p-3"
        >
          <span className="text-base-content mb-0.5 block font-bold">{item.title}</span>
          <p className="text-base-content/75 leading-relaxed">{item.body}</p>
        </div>
      ))}
    </div>
  );
};
