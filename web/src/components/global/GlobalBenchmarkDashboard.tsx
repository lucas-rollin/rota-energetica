import React from 'react';
import { DollarSign, Fuel, Globe, Leaf, Scale, Zap, ShieldCheck } from 'lucide-react';
import type { GlobalBenchmarksCatalog, RegionBenchmark } from '../../lib/types/catalogs';
import { formatNumber } from '../../lib/utils/format';
import { SourceRef } from '../common/SourceRef';

interface GlobalBenchmarkDashboardProps {
  benchmarksData: GlobalBenchmarksCatalog;
}

export const GlobalBenchmarkDashboard: React.FC<GlobalBenchmarkDashboardProps> = ({
  benchmarksData,
}) => {
  const regions = benchmarksData.regions;
  const regionKeys: (keyof typeof regions)[] = [
    'brasil',
    'uniao_europeia',
    'estados_unidos',
    'china',
  ];
  const regionList = regionKeys
    .map((k) => regions[k])
    .filter(Boolean) as RegionBenchmark[];

  return (
    <div className="space-y-8">
      {/* 1. TOP MACRO KPI SUMMARY TILES */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="bg-base-100 rounded-xl border border-emerald-500/30 p-4 shadow-xs">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-bold tracking-wider text-emerald-700 uppercase dark:text-emerald-400">
            <Leaf className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Matriz Elétrica BR</span>
          </div>
          <div className="font-mono text-2xl font-black text-emerald-600 dark:text-emerald-400">
            86,2%
          </div>
          <p className="text-base-content/70 mt-1 text-[11px]">
            Renovável (SIN), contra média de apenas 22% a 45% nas economias do Norte.
          </p>
        </div>

        <div className="bg-base-100 border-primary/30 rounded-xl border p-4 shadow-xs">
          <div className="text-primary mb-1 flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase">
            <Globe className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>WtW Biometano BR</span>
          </div>
          <div className="text-primary font-mono text-2xl font-black">
            -18,4 <span className="text-base-content/60 text-xs font-normal">g/t.km</span>
          </div>
          <p className="text-base-content/70 mt-1 text-[11px]">
            Única rota do benchmark com balanço negativo de carbono (metano evitado).
          </p>
        </div>

        <div className="bg-base-100 rounded-xl border border-emerald-500/30 p-4 shadow-xs">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-bold tracking-wider text-emerald-700 uppercase dark:text-emerald-400">
            <Zap className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Energia Útil Mecânica</span>
          </div>
          <div className="font-mono text-2xl font-black text-emerald-600 dark:text-emerald-400">
            R$ {formatNumber(regions.brasil.energy_cost_levelized_mwh_eq.biomethane, 0)}{' '}
            <span className="text-base-content/60 text-xs font-normal">/MWh-eq</span>
          </div>
          <p className="text-base-content/70 mt-1 text-[11px]">
            Biometano no virabrequim supera eletricidade B3 e diesel no Brasil.
          </p>
        </div>

        <div className="bg-base-100 rounded-xl border border-amber-500/30 p-4 shadow-xs">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-bold tracking-wider text-amber-700 uppercase dark:text-amber-400">
            <DollarSign className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Subsídio Direto BR</span>
          </div>
          <div className="font-mono text-2xl font-black text-amber-600 dark:text-amber-400">
            US$ 0{' '}
            <span className="text-base-content/60 text-xs font-normal">/veículo</span>
          </div>
          <p className="text-base-content/70 mt-1 text-[11px]">
            Ao contrário da UE e dos EUA, o Brasil não financia a fundo perdido o
            sobrepreço.
          </p>
        </div>
      </div>

      {/* 2. SIDE-BY-SIDE MULTIDIMENSIONAL COMPARATIVE MATRIX (PATTERN A) */}
      <div className="bg-base-100 border-base-200 rounded-xl border p-5 shadow-xs">
        <div className="border-base-200 mb-4 border-b pb-3">
          <div className="bg-primary/10 text-primary mb-1 inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-[11px] font-bold tracking-wider uppercase">
            <Scale className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Matriz Comparativa Internacional Lado a Lado</span>
          </div>
          <h2 className="text-base-content text-lg font-bold tracking-tight">
            Brasil vs. União Europeia vs. Estados Unidos vs. China
          </h2>
          <p className="text-base-content/70 mt-0.5 text-xs">
            Comparativo estrutural das condições macroeconômicas, paridade de insumos,
            tolerâncias legais de peso e instrumentos de política pública.
          </p>
        </div>

        {/* Responsive Table Matrix */}
        <div className="-mx-2 overflow-x-auto sm:mx-0">
          <table className="table-xs sm:table-sm table w-full border-collapse">
            <thead>
              <tr className="border-base-200 border-b text-xs">
                <th className="bg-base-200/50 text-base-content/70 w-1/4 px-3 py-3 font-semibold tracking-wider uppercase">
                  Dimensão de Análise
                </th>
                {regionList.map((reg) => {
                  const isBrazil = reg.code === 'BR';
                  return (
                    <th
                      key={reg.code}
                      className={`w-[18.75%] px-3 py-3 text-center transition-colors ${
                        isBrazil
                          ? 'bg-primary/10 text-primary border-primary/30 border-x-2 font-black'
                          : 'bg-base-200/20 text-base-content font-bold'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5 text-base">
                        <span>{reg.flag}</span>
                        <span className="text-xs sm:text-sm">{reg.code}</span>
                      </div>
                      <span className="text-base-content/70 mt-0.5 block truncate text-[11px] font-normal">
                        {reg.code === 'BR'
                          ? 'Brasil (SIN)'
                          : reg.code === 'EU'
                            ? 'União Europeia'
                            : reg.code === 'US'
                              ? 'Estados Unidos'
                              : 'China'}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-base-200/60 divide-y text-xs">
              {/* Row 1: Preço Médio do Diesel */}
              <tr className="hover:bg-base-200/30 transition-colors">
                <td className="text-base-content/80 px-3 py-2.5 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <Fuel
                      className="h-3.5 w-3.5 shrink-0 text-slate-500"
                      aria-hidden="true"
                    />
                    <span>Preço do Diesel na Bomba</span>
                  </div>
                  <span className="text-base-content/50 block text-[10px]">
                    Média nacional (US$/L)
                  </span>
                </td>
                {regionList.map((reg) => (
                  <td
                    key={reg.code}
                    className={`px-3 py-2.5 text-center font-mono font-bold ${
                      reg.code === 'BR'
                        ? 'bg-primary/5 border-primary/30 text-primary border-x-2'
                        : 'text-base-content'
                    }`}
                  >
                    US$ {formatNumber(reg.diesel_price_usd_per_liter, 2)}
                    <span className="text-base-content/50 block font-sans text-[10px] font-normal">
                      {reg.code === 'BR'
                        ? '~R$ 7,28/L'
                        : reg.code === 'EU'
                          ? 'Alta tributação'
                          : reg.code === 'US'
                            ? 'Baixo imposto'
                            : 'Tabelado'}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Row 2: Eletricidade Comercial/Industrial */}
              <tr className="hover:bg-base-200/30 transition-colors">
                <td className="text-base-content/80 px-3 py-2.5 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <Zap
                      className="h-3.5 w-3.5 shrink-0 text-cyan-600"
                      aria-hidden="true"
                    />
                    <span>Eletricidade Comercial / Pátio</span>
                  </div>
                  <span className="text-base-content/50 block text-[10px]">
                    Tarifa média fora de ponta (US$/kWh)
                  </span>
                </td>
                {regionList.map((reg) => (
                  <td
                    key={reg.code}
                    className={`px-3 py-2.5 text-center font-mono font-bold ${
                      reg.code === 'BR'
                        ? 'bg-primary/5 border-primary/30 text-primary border-x-2'
                        : 'text-base-content'
                    }`}
                  >
                    US$ {formatNumber(reg.electricity_price_usd_per_kwh, 2)}
                    <span className="text-base-content/50 block font-sans text-[10px] font-normal">
                      {reg.code === 'BR'
                        ? '~R$ 1,01/kWh'
                        : reg.code === 'EU'
                          ? 'Custo fóssil marginal'
                          : reg.code === 'US'
                            ? 'Gás fóssil abundante'
                            : 'Subsídio industrial'}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Row 3: Subsídio Governamental Direto */}
              <tr className="hover:bg-base-200/30 transition-colors">
                <td className="text-base-content/80 px-3 py-2.5 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <DollarSign
                      className="h-3.5 w-3.5 shrink-0 text-amber-600"
                      aria-hidden="true"
                    />
                    <span>Subsídio Direto de Compra (CAPEX)</span>
                  </div>
                  <span className="text-base-content/50 block text-[10px]">
                    Aporte a fundo perdido por caminhão
                  </span>
                </td>
                {regionList.map((reg) => (
                  <td
                    key={reg.code}
                    className={`px-3 py-2.5 text-center ${
                      reg.code === 'BR' ? 'bg-primary/5 border-primary/30 border-x-2' : ''
                    }`}
                  >
                    {reg.capex_subsidy_max_usd > 0 ? (
                      <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        Até US$ {formatNumber(reg.capex_subsidy_max_usd, 0)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-mono font-bold text-amber-600 dark:text-amber-400">
                        US$ 0
                      </span>
                    )}
                    <span className="text-base-content/60 mt-0.5 block text-[10px]">
                      {reg.code === 'BR'
                        ? 'Apenas Finame BNDES'
                        : reg.code === 'EU'
                          ? 'Bônus de até €80k'
                          : reg.code === 'US'
                            ? 'IRA §45W Clean Vehicle'
                            : 'Incentivo bateria LFP'}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Row 4: Tolerância na Lei da Balança */}
              <tr className="hover:bg-base-200/30 transition-colors">
                <td className="text-base-content/80 px-3 py-2.5 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <Scale
                      className="h-3.5 w-3.5 shrink-0 text-indigo-600"
                      aria-hidden="true"
                    />
                    <span>Tolerância na Lei da Balança</span>
                  </div>
                  <span className="text-base-content/50 block text-[10px]">
                    Compensação de peso da bateria (PBTC)
                  </span>
                </td>
                {regionList.map((reg) => (
                  <td
                    key={reg.code}
                    className={`px-3 py-2.5 text-center ${
                      reg.code === 'BR' ? 'bg-primary/5 border-primary/30 border-x-2' : ''
                    }`}
                  >
                    {reg.battery_weight_allowance_kg > 0 ? (
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        +{formatNumber(reg.battery_weight_allowance_kg, 0)} kg
                      </span>
                    ) : reg.code === 'CN' ? (
                      <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                        0 kg (BaaS)
                      </span>
                    ) : (
                      <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                        0 kg (Sem abono)
                      </span>
                    )}
                    <span className="text-base-content/60 mt-0.5 block text-[10px]">
                      {reg.code === 'BR'
                        ? 'Perda líquida ~2.400 kg'
                        : reg.code === 'EU'
                          ? 'Diretiva 96/53/EC'
                          : reg.code === 'US'
                            ? 'FAST Act (+2.000 lbs)'
                            : 'Troca rápida (BaaS)'}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Row 5: Matriz Renovável & Intensidade */}
              <tr className="hover:bg-base-200/30 transition-colors">
                <td className="text-base-content/80 px-3 py-2.5 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <Leaf
                      className="h-3.5 w-3.5 shrink-0 text-emerald-600"
                      aria-hidden="true"
                    />
                    <span>Matriz Elétrica Renovável</span>
                  </div>
                  <span className="text-base-content/50 block text-[10px]">
                    Participação (%) / Intensidade (g/kWh)
                  </span>
                </td>
                {regionList.map((reg) => (
                  <td
                    key={reg.code}
                    className={`px-3 py-2.5 text-center ${
                      reg.code === 'BR' ? 'bg-primary/5 border-primary/30 border-x-2' : ''
                    }`}
                  >
                    <span className="block font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {formatNumber(reg.renewable_grid_share_percent, 1)}% renovável
                    </span>
                    <span className="text-base-content/70 mt-0.5 block font-mono text-[11px]">
                      {formatNumber(reg.grid_carbon_intensity_g_kwh, 0)} g CO₂e/kWh
                    </span>
                  </td>
                ))}
              </tr>

              {/* Row 6: Rota Tecnológica Prioritária */}
              <tr className="hover:bg-base-200/30 transition-colors">
                <td className="text-base-content/80 px-3 py-2.5 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <Globe
                      className="text-primary h-3.5 w-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span>Direção Tecnológica Dominante</span>
                  </div>
                  <span className="text-base-content/50 block text-[10px]">
                    Foco dos investimentos de infraestrutura
                  </span>
                </td>
                {regionList.map((reg) => (
                  <td
                    key={reg.code}
                    className={`px-3 py-2.5 text-center text-[11px] leading-tight font-medium ${
                      reg.code === 'BR'
                        ? 'bg-primary/5 border-primary/30 text-primary border-x-2 font-bold'
                        : 'text-base-content/85'
                    }`}
                  >
                    {reg.dominant_pathway}
                  </td>
                ))}
              </tr>

              {/* Row 7: Mecanismo Regulatório */}
              <tr className="hover:bg-base-200/30 transition-colors">
                <td className="text-base-content/80 px-3 py-2.5 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck
                      className="h-3.5 w-3.5 shrink-0 text-purple-600"
                      aria-hidden="true"
                    />
                    <span>Instrumento Regulatório / Carbono</span>
                  </div>
                  <span className="text-base-content/50 block text-[10px]">
                    Marco de precificação e metas de frota
                  </span>
                </td>
                {regionList.map((reg) => (
                  <td
                    key={reg.code}
                    className={`text-base-content/75 px-3 py-2.5 text-center text-[11px] leading-tight ${
                      reg.code === 'BR' ? 'bg-primary/5 border-primary/30 border-x-2' : ''
                    }`}
                  >
                    {reg.regulatory_mechanism}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="border-base-200 text-base-content/60 mt-3 flex flex-col justify-between gap-2 border-t pt-3 text-[11px] sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-1.5">
            <span>
              Dados compilados de IEA Energy Prices 2024, ANP, Eurostat e ICCT Global
              Commercial Vehicle Policies.
            </span>
            {benchmarksData.source_ids?.map((id) => (
              <SourceRef key={id} id={id} context="Comparativo Internacional" />
            ))}
          </div>
          <span className="font-mono">
            Valores de diesel e eletricidade convertidos pela média de câmbio PPA 2026
          </span>
        </div>
      </div>

      {/* 3. THE WELL-TO-WHEEL (WtW) PARADOX BAR CHART */}
      <div className="bg-base-100 border-base-200 rounded-xl border p-5 shadow-xs">
        <div className="border-base-200 mb-5 border-b pb-3">
          <div className="badge badge-xs badge-primary mb-1">
            Análise de Ciclo de Vida Completo
          </div>
          <h2 className="text-base-content text-lg font-bold tracking-tight">
            O Paradoxo Well-to-Wheel (WtW): Emissões em g CO₂e / t.km
          </h2>
          <p className="text-base-content/70 mt-0.5 text-xs">
            Recarregar um caminhão elétrico em países com matriz térmica a carvão/gás
            (China ou EUA) emite substancialmente mais carbono na cadeia completa do que
            rodar com biometano de vinhaça no Brasil.
          </p>
        </div>

        <div className="max-w-4xl space-y-4">
          {/* Brazil Biomethane */}
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                <span>🇧🇷</span> Brasil — Biometano (Vinhaça de Cana / Aterro)
                <span className="badge badge-xs badge-success text-[10px]">
                  Balanço Negativo
                </span>
              </span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                -18,4 g CO₂e/t.km
              </span>
            </div>
            <div className="bg-base-200 relative flex h-5 w-full overflow-hidden rounded-full">
              <div
                className="flex h-full w-14 items-center justify-center bg-emerald-500 text-[10px] font-bold text-white"
                title="Crédito de metano mitigado"
              >
                -18,4
              </div>
            </div>
            <span className="text-base-content/60 mt-0.5 block text-[10px]">
              Crédito ambiental pela contenção da digestão anaeróbica não controlada no
              campo (fator de metano evitado RenovaBio).
            </span>
          </div>

          {/* Brazil BEV */}
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-cyan-700 dark:text-cyan-400">
                <span>🇧🇷</span> Brasil — Caminhão Elétrico Pesado (Rede SIN)
              </span>
              <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">
                14,2 g CO₂e/t.km
              </span>
            </div>
            <div className="bg-base-200 h-5 w-full overflow-hidden rounded-full">
              <div
                className="flex h-full items-center bg-cyan-500 px-2 text-[10px] font-bold text-white"
                style={{ width: '13.6%' }}
              >
                14,2
              </div>
            </div>
            <span className="text-base-content/60 mt-0.5 block text-[10px]">
              Baixíssimo fator de emissão do Sistema Interligado Nacional (hidrelétrica,
              eólica e solar dominantes).
            </span>
          </div>

          {/* EU BEV */}
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-base-content flex items-center gap-1.5 font-semibold">
                <span>🇪🇺</span> União Europeia — BEV Médio (Rede Mix EU-27)
              </span>
              <span className="text-base-content font-mono font-bold">
                38,6 g CO₂e/t.km
              </span>
            </div>
            <div className="bg-base-200 h-5 w-full overflow-hidden rounded-full">
              <div
                className="flex h-full items-center bg-blue-500 px-2 text-[10px] font-bold text-white"
                style={{ width: '37.1%' }}
              >
                38,6
              </div>
            </div>
            <span className="text-base-content/60 mt-0.5 block text-[10px]">
              Mix de energia europeu com presença de gás fóssil e nuclear; emissão 2,7x
              superior ao BEV recarregado no Brasil.
            </span>
          </div>

          {/* US BEV */}
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-base-content flex items-center gap-1.5 font-semibold">
                <span>🇺🇸</span> Estados Unidos — BEV Classe 8 (Média US Grid)
              </span>
              <span className="text-base-content font-mono font-bold">
                62,1 g CO₂e/t.km
              </span>
            </div>
            <div className="bg-base-200 h-5 w-full overflow-hidden rounded-full">
              <div
                className="flex h-full items-center bg-indigo-500 px-2 text-[10px] font-bold text-white"
                style={{ width: '59.7%' }}
              >
                62,1
              </div>
            </div>
            <span className="text-base-content/60 mt-0.5 block text-[10px]">
              Matriz norte-americana com gás fóssil e carvão térmico no Midwest; emissão
              4,4x superior à rede brasileira.
            </span>
          </div>

          {/* China BEV */}
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-base-content flex items-center gap-1.5 font-semibold">
                <span>🇨🇳</span> China — BEV Pesado (Matriz Térmica a Carvão)
              </span>
              <span className="text-base-content font-mono font-bold">
                81,5 g CO₂e/t.km
              </span>
            </div>
            <div className="bg-base-200 h-5 w-full overflow-hidden rounded-full">
              <div
                className="flex h-full items-center bg-rose-500 px-2 text-[10px] font-bold text-white"
                style={{ width: '78.4%' }}
              >
                81,5
              </div>
            </div>
            <span className="text-base-content/60 mt-0.5 block text-[10px]">
              Forte dependência de usinas térmicas a carvão nas províncias industriais do
              norte e interior.
            </span>
          </div>

          {/* Diesel Baseline */}
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-base-content/70 flex items-center gap-1.5 font-semibold">
                <span>🌐</span> Referência Global — Diesel Fóssil (Euro VI / Conama P8)
              </span>
              <span className="text-base-content/70 font-mono font-bold">
                104,0 g CO₂e/t.km (100% Base)
              </span>
            </div>
            <div className="bg-base-200 h-5 w-full overflow-hidden rounded-full">
              <div
                className="flex h-full items-center bg-slate-500 px-2 text-[10px] font-bold text-white"
                style={{ width: '100%' }}
              >
                104,0
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. LEVELIZED CRANKSHAFT ENERGY COST COMPARISON */}
      <div className="bg-base-100 border-base-200 rounded-xl border p-5 shadow-xs">
        <div className="border-base-200 mb-4 border-b pb-3">
          <div className="badge badge-xs badge-neutral mb-1">
            Paridade Calórica &amp; Eficiência Térmica
          </div>
          <h2 className="text-base-content text-base font-bold tracking-tight">
            Custo Nivelado de Energia Útil no Virabrequim (R$/MWh-eq)
          </h2>
          <p className="text-base-content/70 mt-0.5 text-xs">
            Normalização na ponta mecânica motriz, considerando a eficiência termodinâmica
            de motores térmicos (~42%) versus conjunto carregador/motor elétrico (~81%
            rede-eixo).
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  🇧🇷 Biometano Brasil
                </span>
                <span className="badge badge-xs badge-success">Menor Custo BR</span>
              </div>
              <span className="text-base-content/70 block text-[11px]">
                Gás purificado canalizado / GNC (R$ 4,60/m³)
              </span>
            </div>
            <div className="mt-3">
              <span className="font-mono text-xl font-black text-emerald-600 dark:text-emerald-400">
                R${' '}
                {formatNumber(regions.brasil.energy_cost_levelized_mwh_eq.biomethane, 0)}
              </span>
              <span className="text-base-content/60 ml-1 text-[10px]">/MWh-eq</span>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3.5">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-700 dark:text-cyan-400">
                  🇧🇷 Eletricidade B3 (Base Própria)
                </span>
                <span className="badge badge-xs badge-info">Pátio Próprio</span>
              </div>
              <span className="text-base-content/70 block text-[11px]">
                Tarifa CELESC com tributos (~R$ 1,01/kWh)
              </span>
            </div>
            <div className="mt-3">
              <span className="font-mono text-xl font-black text-cyan-600 dark:text-cyan-400">
                R${' '}
                {formatNumber(
                  regions.brasil.energy_cost_levelized_mwh_eq.offpeak_electricity,
                  0
                )}
              </span>
              <span className="text-base-content/60 ml-1 text-[10px]">/MWh-eq</span>
            </div>
          </div>

          <div className="bg-base-200/50 border-base-300 flex flex-col justify-between rounded-xl border p-3.5">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-base-content text-xs font-bold">
                  🇺🇸 EUA Eletricidade Comercial
                </span>
                <span className="badge badge-xs badge-ghost">Média US</span>
              </div>
              <span className="text-base-content/70 block text-[11px]">
                Tarifa comercial média (~US$ 0.13/kWh)
              </span>
            </div>
            <div className="mt-3">
              <span className="text-base-content font-mono text-xl font-black">
                R${' '}
                {formatNumber(
                  regions.estados_unidos.energy_cost_levelized_mwh_eq
                    .commercial_electricity ?? 0,
                  0
                )}
              </span>
              <span className="text-base-content/60 ml-1 text-[10px]">/MWh-eq</span>
            </div>
          </div>

          <div className="bg-base-200/50 border-base-300 flex flex-col justify-between rounded-xl border p-3.5">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-base-content text-xs font-bold">
                  🇪🇺 Europa Eletrovia MCS
                </span>
                <span className="badge badge-xs badge-ghost">Alta Potência</span>
              </div>
              <span className="text-base-content/70 block text-[11px]">
                Carregador rodoviário ultrarrápido 750kW
              </span>
            </div>
            <div className="mt-3">
              <span className="text-base-content font-mono text-xl font-black">
                R${' '}
                {formatNumber(
                  regions.uniao_europeia.energy_cost_levelized_mwh_eq.hpc_electricity ??
                    0,
                  0
                )}
              </span>
              <span className="text-base-content/60 ml-1 text-[10px]">/MWh-eq</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. STRATEGIC SYNTHESIS: POR QUE A ROTA BRASILEIRA É SINGULAR? */}
      <div className="bg-base-100 border-base-200 rounded-xl border p-5 shadow-xs">
        <h2 className="text-base-content mb-3 text-base font-bold tracking-tight">
          Síntese Estratégica: Por que a Transição no Brasil segue uma Rota Única?
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="border-base-200 bg-base-200/30 space-y-1.5 rounded-xl border p-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              <Leaf className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>1. Agroenergia Dispensa Subsídios Massivos</span>
            </div>
            <p className="text-base-content/75 text-xs leading-relaxed">
              Enquanto Europa e EUA precisam desembolsar de US$ 40 mil a US$ 85 mil por
              caminhão para viabilizar a transição elétrica a frotistas, o Brasil tem no
              agronegócio uma fábrica de combustíveis renováveis de baixo custo (biometano
              de vinhaça e esterco) que compete economicamente com o diesel de forma
              orgânica.
            </p>
          </div>

          <div className="border-base-200 bg-base-200/30 space-y-1.5 rounded-xl border p-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-400">
              <Scale className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>2. O Gargalo de Carga Útil na Balança (PBTC 74t)</span>
            </div>
            <p className="text-base-content/75 text-xs leading-relaxed">
              O transporte pesado rodoviário brasileiro roda em distâncias continentais
              (1.500+ km) no limite legal de carga (rodotrens de 9 eixos). Sem tolerância
              de peso para baterias na legislação do CONTRAN, o caminhão elétrico perde
              até 2.400 kg de carga paga por viagem, tornando o biometano a alternativa de
              descarbonização imediata mais viável.
            </p>
          </div>

          <div className="border-base-200 bg-base-200/30 space-y-1.5 rounded-xl border p-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-700 dark:text-cyan-400">
              <Globe className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>3. A Verdade do Ciclo de Vida (Well-to-Wheel)</span>
            </div>
            <p className="text-base-content/75 text-xs leading-relaxed">
              Políticas focadas apenas em escapamento (Tank-to-Wheel) criam distorções ao
              ignorar que eletricidade gerada a carvão (China) ou gás natural (EUA)
              transfere o carbono do cano de descarga para a chaminé da usina térmica. A
              matriz hidrelétrica e solar brasileira confere ao país um diferencial verde
              incomparável.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
