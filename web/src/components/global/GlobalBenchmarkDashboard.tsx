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
  const regionKeys: (keyof typeof regions)[] = ['brasil', 'uniao_europeia', 'estados_unidos', 'china'];
  const regionList = regionKeys.map((k) => regions[k]).filter(Boolean) as RegionBenchmark[];

  return (
    <div className="space-y-8">
      {/* 1. TOP MACRO KPI SUMMARY TILES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-base-100 rounded-xl border border-emerald-500/30 p-4 shadow-xs">
          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Leaf className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Matriz Elétrica BR</span>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            86,2%
          </div>
          <p className="text-[11px] text-base-content/70 mt-1">
            Renovável (SIN), contra média de apenas 22% a 45% nas economias do Norte.
          </p>
        </div>

        <div className="bg-base-100 rounded-xl border border-primary/30 p-4 shadow-xs">
          <div className="flex items-center gap-1.5 text-primary text-xs font-bold uppercase tracking-wider mb-1">
            <Globe className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>WtW Biometano BR</span>
          </div>
          <div className="text-2xl font-black text-primary font-mono">
            -18,4 <span className="text-xs font-normal text-base-content/60">g/t.km</span>
          </div>
          <p className="text-[11px] text-base-content/70 mt-1">
            Única rota do benchmark com balanço negativo de carbono (metano evitado).
          </p>
        </div>

        <div className="bg-base-100 rounded-xl border border-emerald-500/30 p-4 shadow-xs">
          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Zap className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Energia Útil Mecânica</span>
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            R$ {formatNumber(regions.brasil.energy_cost_levelized_mwh_eq.biomethane, 0)}{' '}
            <span className="text-xs font-normal text-base-content/60">/MWh-eq</span>
          </div>
          <p className="text-[11px] text-base-content/70 mt-1">
            Biometano no virabrequim supera eletricidade B3 e diesel no Brasil.
          </p>
        </div>

        <div className="bg-base-100 rounded-xl border border-amber-500/30 p-4 shadow-xs">
          <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
            <DollarSign className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Subsídio Direto BR</span>
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 font-mono">
            US$ 0 <span className="text-xs font-normal text-base-content/60">/veículo</span>
          </div>
          <p className="text-[11px] text-base-content/70 mt-1">
            Ao contrário da UE e dos EUA, o Brasil não financia a fundo perdido o sobrepreço.
          </p>
        </div>
      </div>

      {/* 2. SIDE-BY-SIDE MULTIDIMENSIONAL COMPARATIVE MATRIX (PATTERN A) */}
      <div className="bg-base-100 rounded-xl border border-base-200 p-5 shadow-xs">
        <div className="border-b border-base-200 pb-3 mb-4">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wider mb-1">
            <Scale className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Matriz Comparativa Internacional Lado a Lado</span>
          </div>
          <h2 className="text-lg font-bold text-base-content tracking-tight">
            Brasil vs. União Europeia vs. Estados Unidos vs. China
          </h2>
          <p className="text-xs text-base-content/70 mt-0.5">
            Comparativo estrutural das condições macroeconômicas, paridade de insumos, tolerâncias legais de peso e instrumentos de política pública.
          </p>
        </div>

        {/* Responsive Table Matrix */}
        <div className="overflow-x-auto -mx-2 sm:mx-0">
          <table className="table table-xs sm:table-sm w-full border-collapse">
            <thead>
              <tr className="border-b border-base-200 text-xs">
                <th className="w-1/4 bg-base-200/50 py-3 px-3 text-base-content/70 font-semibold uppercase tracking-wider">
                  Dimensão de Análise
                </th>
                {regionList.map((reg) => {
                  const isBrazil = reg.code === 'BR';
                  return (
                    <th
                      key={reg.code}
                      className={`w-[18.75%] py-3 px-3 text-center transition-colors ${
                        isBrazil
                          ? 'bg-primary/10 text-primary border-x-2 border-primary/30 font-black'
                          : 'bg-base-200/20 text-base-content font-bold'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5 text-base">
                        <span>{reg.flag}</span>
                        <span className="text-xs sm:text-sm">{reg.code}</span>
                      </div>
                      <span className="block text-[11px] font-normal text-base-content/70 truncate mt-0.5">
                        {reg.code === 'BR' ? 'Brasil (SIN)' : reg.code === 'EU' ? 'União Europeia' : reg.code === 'US' ? 'Estados Unidos' : 'China'}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-base-200/60 text-xs">
              {/* Row 1: Preço Médio do Diesel */}
              <tr className="hover:bg-base-200/30 transition-colors">
                <td className="font-semibold text-base-content/80 py-2.5 px-3">
                  <div className="flex items-center gap-1.5">
                    <Fuel className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
                    <span>Preço do Diesel na Bomba</span>
                  </div>
                  <span className="text-[10px] text-base-content/50 block">Média nacional (US$/L)</span>
                </td>
                {regionList.map((reg) => (
                  <td
                    key={reg.code}
                    className={`text-center py-2.5 px-3 font-mono font-bold ${
                      reg.code === 'BR' ? 'bg-primary/5 border-x-2 border-primary/30 text-primary' : 'text-base-content'
                    }`}
                  >
                    US$ {formatNumber(reg.diesel_price_usd_per_liter, 2)}
                    <span className="text-[10px] text-base-content/50 block font-sans font-normal">
                      {reg.code === 'BR' ? '~R$ 7,28/L' : reg.code === 'EU' ? 'Alta tributação' : reg.code === 'US' ? 'Baixo imposto' : 'Tabelado'}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Row 2: Eletricidade Comercial/Industrial */}
              <tr className="hover:bg-base-200/30 transition-colors">
                <td className="font-semibold text-base-content/80 py-2.5 px-3">
                  <div className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-cyan-600 shrink-0" aria-hidden="true" />
                    <span>Eletricidade Comercial / Pátio</span>
                  </div>
                  <span className="text-[10px] text-base-content/50 block">Tarifa média fora de ponta (US$/kWh)</span>
                </td>
                {regionList.map((reg) => (
                  <td
                    key={reg.code}
                    className={`text-center py-2.5 px-3 font-mono font-bold ${
                      reg.code === 'BR' ? 'bg-primary/5 border-x-2 border-primary/30 text-primary' : 'text-base-content'
                    }`}
                  >
                    US$ {formatNumber(reg.electricity_price_usd_per_kwh, 2)}
                    <span className="text-[10px] text-base-content/50 block font-sans font-normal">
                      {reg.code === 'BR' ? '~R$ 1,01/kWh' : reg.code === 'EU' ? 'Custo fóssil marginal' : reg.code === 'US' ? 'Gás fóssil abundante' : 'Subsídio industrial'}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Row 3: Subsídio Governamental Direto */}
              <tr className="hover:bg-base-200/30 transition-colors">
                <td className="font-semibold text-base-content/80 py-2.5 px-3">
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-amber-600 shrink-0" aria-hidden="true" />
                    <span>Subsídio Direto de Compra (CAPEX)</span>
                  </div>
                  <span className="text-[10px] text-base-content/50 block">Aporte a fundo perdido por caminhão</span>
                </td>
                {regionList.map((reg) => (
                  <td
                    key={reg.code}
                    className={`text-center py-2.5 px-3 ${
                      reg.code === 'BR' ? 'bg-primary/5 border-x-2 border-primary/30' : ''
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
                    <span className="text-[10px] text-base-content/60 block mt-0.5">
                      {reg.code === 'BR' ? 'Apenas Finame BNDES' : reg.code === 'EU' ? 'Bônus de até €80k' : reg.code === 'US' ? 'IRA §45W Clean Vehicle' : 'Incentivo bateria LFP'}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Row 4: Tolerância na Lei da Balança */}
              <tr className="hover:bg-base-200/30 transition-colors">
                <td className="font-semibold text-base-content/80 py-2.5 px-3">
                  <div className="flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-indigo-600 shrink-0" aria-hidden="true" />
                    <span>Tolerância na Lei da Balança</span>
                  </div>
                  <span className="text-[10px] text-base-content/50 block">Compensação de peso da bateria (PBTC)</span>
                </td>
                {regionList.map((reg) => (
                  <td
                    key={reg.code}
                    className={`text-center py-2.5 px-3 ${
                      reg.code === 'BR' ? 'bg-primary/5 border-x-2 border-primary/30' : ''
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
                    <span className="text-[10px] text-base-content/60 block mt-0.5">
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
                <td className="font-semibold text-base-content/80 py-2.5 px-3">
                  <div className="flex items-center gap-1.5">
                    <Leaf className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden="true" />
                    <span>Matriz Elétrica Renovável</span>
                  </div>
                  <span className="text-[10px] text-base-content/50 block">Participação (%) / Intensidade (g/kWh)</span>
                </td>
                {regionList.map((reg) => (
                  <td
                    key={reg.code}
                    className={`text-center py-2.5 px-3 ${
                      reg.code === 'BR' ? 'bg-primary/5 border-x-2 border-primary/30' : ''
                    }`}
                  >
                    <span className="font-mono font-bold text-xs block text-emerald-600 dark:text-emerald-400">
                      {formatNumber(reg.renewable_grid_share_percent, 1)}% renovável
                    </span>
                    <span className="font-mono text-[11px] text-base-content/70 block mt-0.5">
                      {formatNumber(reg.grid_carbon_intensity_g_kwh, 0)} g CO₂e/kWh
                    </span>
                  </td>
                ))}
              </tr>

              {/* Row 6: Rota Tecnológica Prioritária */}
              <tr className="hover:bg-base-200/30 transition-colors">
                <td className="font-semibold text-base-content/80 py-2.5 px-3">
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden="true" />
                    <span>Direção Tecnológica Dominante</span>
                  </div>
                  <span className="text-[10px] text-base-content/50 block">Foco dos investimentos de infraestrutura</span>
                </td>
                {regionList.map((reg) => (
                  <td
                    key={reg.code}
                    className={`text-center py-2.5 px-3 text-[11px] font-medium leading-tight ${
                      reg.code === 'BR' ? 'bg-primary/5 border-x-2 border-primary/30 text-primary font-bold' : 'text-base-content/85'
                    }`}
                  >
                    {reg.dominant_pathway}
                  </td>
                ))}
              </tr>

              {/* Row 7: Mecanismo Regulatório */}
              <tr className="hover:bg-base-200/30 transition-colors">
                <td className="font-semibold text-base-content/80 py-2.5 px-3">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-600 shrink-0" aria-hidden="true" />
                    <span>Instrumento Regulatório / Carbono</span>
                  </div>
                  <span className="text-[10px] text-base-content/50 block">Marco de precificação e metas de frota</span>
                </td>
                {regionList.map((reg) => (
                  <td
                    key={reg.code}
                    className={`text-center py-2.5 px-3 text-[11px] text-base-content/75 leading-tight ${
                      reg.code === 'BR' ? 'bg-primary/5 border-x-2 border-primary/30' : ''
                    }`}
                  >
                    {reg.regulatory_mechanism}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-3 pt-3 border-t border-base-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-base-content/60">
          <div className="flex flex-wrap items-center gap-1.5">
            <span>Dados compilados de IEA Energy Prices 2024, ANP, Eurostat e ICCT Global Commercial Vehicle Policies.</span>
            {benchmarksData.source_ids?.map((id) => (
              <SourceRef key={id} id={id} context="Comparativo Internacional" />
            ))}
          </div>
          <span className="font-mono">Valores de diesel e eletricidade convertidos pela média de câmbio PPA 2026</span>
        </div>
      </div>

      {/* 3. THE WELL-TO-WHEEL (WtW) PARADOX BAR CHART */}
      <div className="bg-base-100 rounded-xl border border-base-200 p-5 shadow-xs">
        <div className="border-b border-base-200 pb-3 mb-5">
          <div className="badge badge-xs badge-primary mb-1">Análise de Ciclo de Vida Completo</div>
          <h2 className="text-lg font-bold text-base-content tracking-tight">
            O Paradoxo Well-to-Wheel (WtW): Emissões em g CO₂e / t.km
          </h2>
          <p className="text-xs text-base-content/70 mt-0.5">
            Recarregar um caminhão elétrico em países com matriz térmica a carvão/gás (China ou EUA) emite substancialmente mais carbono na cadeia completa do que rodar com biometano de vinhaça no Brasil.
          </p>
        </div>

        <div className="space-y-4 max-w-4xl">
          {/* Brazil Biomethane */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <span>🇧🇷</span> Brasil — Biometano (Vinhaça de Cana / Aterro)
                <span className="badge badge-xs badge-success text-[10px]">Balanço Negativo</span>
              </span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">-18,4 g CO₂e/t.km</span>
            </div>
            <div className="w-full bg-base-200 h-5 rounded-full overflow-hidden flex relative">
              <div className="bg-emerald-500 h-full w-14 flex items-center justify-center text-[10px] text-white font-bold" title="Crédito de metano mitigado">
                -18,4
              </div>
            </div>
            <span className="text-[10px] text-base-content/60 mt-0.5 block">
              Crédito ambiental pela contenção da digestão anaeróbica não controlada no campo (fator de metano evitado RenovaBio).
            </span>
          </div>

          {/* Brazil BEV */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-cyan-700 dark:text-cyan-400 flex items-center gap-1.5">
                <span>🇧🇷</span> Brasil — Caminhão Elétrico Pesado (Rede SIN)
              </span>
              <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">14,2 g CO₂e/t.km</span>
            </div>
            <div className="w-full bg-base-200 h-5 rounded-full overflow-hidden">
              <div className="bg-cyan-500 h-full text-[10px] text-white font-bold flex items-center px-2" style={{ width: '13.6%' }}>
                14,2
              </div>
            </div>
            <span className="text-[10px] text-base-content/60 mt-0.5 block">
              Baixíssimo fator de emissão do Sistema Interligado Nacional (hidrelétrica, eólica e solar dominantes).
            </span>
          </div>

          {/* EU BEV */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-base-content flex items-center gap-1.5">
                <span>🇪🇺</span> União Europeia — BEV Médio (Rede Mix EU-27)
              </span>
              <span className="font-mono font-bold text-base-content">38,6 g CO₂e/t.km</span>
            </div>
            <div className="w-full bg-base-200 h-5 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full text-[10px] text-white font-bold flex items-center px-2" style={{ width: '37.1%' }}>
                38,6
              </div>
            </div>
            <span className="text-[10px] text-base-content/60 mt-0.5 block">
              Mix de energia europeu com presença de gás fóssil e nuclear; emissão 2,7x superior ao BEV recarregado no Brasil.
            </span>
          </div>

          {/* US BEV */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-base-content flex items-center gap-1.5">
                <span>🇺🇸</span> Estados Unidos — BEV Classe 8 (Média US Grid)
              </span>
              <span className="font-mono font-bold text-base-content">62,1 g CO₂e/t.km</span>
            </div>
            <div className="w-full bg-base-200 h-5 rounded-full overflow-hidden">
              <div className="bg-indigo-500 h-full text-[10px] text-white font-bold flex items-center px-2" style={{ width: '59.7%' }}>
                62,1
              </div>
            </div>
            <span className="text-[10px] text-base-content/60 mt-0.5 block">
              Matriz norte-americana com gás fóssil e carvão térmico no Midwest; emissão 4,4x superior à rede brasileira.
            </span>
          </div>

          {/* China BEV */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-base-content flex items-center gap-1.5">
                <span>🇨🇳</span> China — BEV Pesado (Matriz Térmica a Carvão)
              </span>
              <span className="font-mono font-bold text-base-content">81,5 g CO₂e/t.km</span>
            </div>
            <div className="w-full bg-base-200 h-5 rounded-full overflow-hidden">
              <div className="bg-rose-500 h-full text-[10px] text-white font-bold flex items-center px-2" style={{ width: '78.4%' }}>
                81,5
              </div>
            </div>
            <span className="text-[10px] text-base-content/60 mt-0.5 block">
              Forte dependência de usinas térmicas a carvão nas províncias industriais do norte e interior.
            </span>
          </div>

          {/* Diesel Baseline */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-base-content/70 flex items-center gap-1.5">
                <span>🌐</span> Referência Global — Diesel Fóssil (Euro VI / Conama P8)
              </span>
              <span className="font-mono font-bold text-base-content/70">104,0 g CO₂e/t.km (100% Base)</span>
            </div>
            <div className="w-full bg-base-200 h-5 rounded-full overflow-hidden">
              <div className="bg-slate-500 h-full text-[10px] text-white font-bold flex items-center px-2" style={{ width: '100%' }}>
                104,0
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. LEVELIZED CRANKSHAFT ENERGY COST COMPARISON */}
      <div className="bg-base-100 rounded-xl border border-base-200 p-5 shadow-xs">
        <div className="border-b border-base-200 pb-3 mb-4">
          <div className="badge badge-xs badge-neutral mb-1">Paridade Calórica &amp; Eficiência Térmica</div>
          <h2 className="text-base font-bold text-base-content tracking-tight">
            Custo Nivelado de Energia Útil no Virabrequim (R$/MWh-eq)
          </h2>
          <p className="text-xs text-base-content/70 mt-0.5">
            Normalização na ponta mecânica motriz, considerando a eficiência termodinâmica de motores térmicos (~42%) versus conjunto carregador/motor elétrico (~81% rede-eixo).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 bg-emerald-500/5 rounded-xl border border-emerald-500/30 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">🇧🇷 Biometano Brasil</span>
                <span className="badge badge-xs badge-success">Menor Custo BR</span>
              </div>
              <span className="text-[11px] text-base-content/70 block">Gás purificado canalizado / GNC (R$ 4,60/m³)</span>
            </div>
            <div className="mt-3">
              <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-xl">
                R$ {formatNumber(regions.brasil.energy_cost_levelized_mwh_eq.biomethane, 0)}
              </span>
              <span className="text-[10px] text-base-content/60 ml-1">/MWh-eq</span>
            </div>
          </div>

          <div className="p-3.5 bg-cyan-500/5 rounded-xl border border-cyan-500/30 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-cyan-700 dark:text-cyan-400">🇧🇷 Eletricidade B3 (Base Própria)</span>
                <span className="badge badge-xs badge-info">Pátio Próprio</span>
              </div>
              <span className="text-[11px] text-base-content/70 block">Tarifa CELESC com tributos (~R$ 1,01/kWh)</span>
            </div>
            <div className="mt-3">
              <span className="font-mono font-black text-cyan-600 dark:text-cyan-400 text-xl">
                R$ {formatNumber(regions.brasil.energy_cost_levelized_mwh_eq.offpeak_electricity, 0)}
              </span>
              <span className="text-[10px] text-base-content/60 ml-1">/MWh-eq</span>
            </div>
          </div>

          <div className="p-3.5 bg-base-200/50 rounded-xl border border-base-300 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-base-content">🇺🇸 EUA Eletricidade Comercial</span>
                <span className="badge badge-xs badge-ghost">Média US</span>
              </div>
              <span className="text-[11px] text-base-content/70 block">Tarifa comercial média (~US$ 0.13/kWh)</span>
            </div>
            <div className="mt-3">
              <span className="font-mono font-black text-base-content text-xl">
                R$ {formatNumber(regions.estados_unidos.energy_cost_levelized_mwh_eq.commercial_electricity ?? 0, 0)}
              </span>
              <span className="text-[10px] text-base-content/60 ml-1">/MWh-eq</span>
            </div>
          </div>

          <div className="p-3.5 bg-base-200/50 rounded-xl border border-base-300 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-base-content">🇪🇺 Europa Eletrovia MCS</span>
                <span className="badge badge-xs badge-ghost">Alta Potência</span>
              </div>
              <span className="text-[11px] text-base-content/70 block">Carregador rodoviário ultrarrápido 750kW</span>
            </div>
            <div className="mt-3">
              <span className="font-mono font-black text-base-content text-xl">
                R$ {formatNumber(regions.uniao_europeia.energy_cost_levelized_mwh_eq.hpc_electricity ?? 0, 0)}
              </span>
              <span className="text-[10px] text-base-content/60 ml-1">/MWh-eq</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. STRATEGIC SYNTHESIS: POR QUE A ROTA BRASILEIRA É SINGULAR? */}
      <div className="bg-base-100 rounded-xl border border-base-200 p-5 shadow-xs">
        <h2 className="text-base font-bold text-base-content tracking-tight mb-3">
          Síntese Estratégica: Por que a Transição no Brasil segue uma Rota Única?
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-base-200 bg-base-200/30 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              <Leaf className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>1. Agroenergia Dispensa Subsídios Massivos</span>
            </div>
            <p className="text-xs text-base-content/75 leading-relaxed">
              Enquanto Europa e EUA precisam desembolsar de US$ 40 mil a US$ 85 mil por caminhão para viabilizar a transição elétrica a frotistas, o Brasil tem no agronegócio uma fábrica de combustíveis renováveis de baixo custo (biometano de vinhaça e esterco) que compete economicamente com o diesel de forma orgânica.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-base-200 bg-base-200/30 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-400">
              <Scale className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>2. O Gargalo de Carga Útil na Balança (PBTC 74t)</span>
            </div>
            <p className="text-xs text-base-content/75 leading-relaxed">
              O transporte pesado rodoviário brasileiro roda em distâncias continentais (1.500+ km) no limite legal de carga (rodotrens de 9 eixos). Sem tolerância de peso para baterias na legislação do CONTRAN, o caminhão elétrico perde até 2.400 kg de carga paga por viagem, tornando o biometano a alternativa de descarbonização imediata mais viável.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-base-200 bg-base-200/30 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-700 dark:text-cyan-400">
              <Globe className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>3. A Verdade do Ciclo de Vida (Well-to-Wheel)</span>
            </div>
            <p className="text-xs text-base-content/75 leading-relaxed">
              Políticas focadas apenas em escapamento (Tank-to-Wheel) criam distorções ao ignorar que eletricidade gerada a carvão (China) ou gás natural (EUA) transfere o carbono do cano de descarga para a chaminé da usina térmica. A matriz hidrelétrica e solar brasileira confere ao país um diferencial verde incomparável.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
