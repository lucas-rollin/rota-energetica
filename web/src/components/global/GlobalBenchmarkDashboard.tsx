import React from 'react';
import { DollarSign, Fuel, Globe, Leaf, Scale, Zap, ShieldCheck } from 'lucide-react';
import type { GlobalBenchmarksCatalog, RegionBenchmark } from '../../lib/types/catalogs';
import type { SimulationParameters } from '../../lib/types/parameters';
import { formatNumber } from '../../lib/utils/format';
import { SourceRef } from '../common/SourceRef';
import { TransparencyDisclaimer } from '../common/TransparencyDisclaimer';

interface GlobalBenchmarkDashboardProps {
  benchmarksData: GlobalBenchmarksCatalog;
  parameters: SimulationParameters;
}

const REFERENCE_DIESEL_THERMAL_EFFICIENCY = 0.42;
const REFERENCE_ELECTRIC_DRIVETRAIN_EFFICIENCY = 0.9;

export const GlobalBenchmarkDashboard: React.FC<GlobalBenchmarkDashboardProps> = ({
  benchmarksData,
  parameters,
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

  const br = regions.brasil;
  const foreignRegions = regionList.filter((r) => r.code !== 'BR');
  const foreignMinRenewable = Math.min(
    ...foreignRegions.map((r) => r.renewable_grid_share_percent)
  );
  const foreignMaxRenewable = Math.max(
    ...foreignRegions.map((r) => r.renewable_grid_share_percent)
  );
  const foreignSubsidies = foreignRegions
    .map((r) => r.capex_subsidy_max_usd)
    .filter((v) => v > 0);
  const minForeignSubsidy = foreignSubsidies.length ? Math.min(...foreignSubsidies) : 0;
  const maxForeignSubsidy = foreignSubsidies.length ? Math.max(...foreignSubsidies) : 0;

  // Dynamic Brazil parameters from parameters.json
  const diesel = parameters.vehicles.diesel;
  const biometano = parameters.vehicles.biometano;
  const eletrico = parameters.vehicles.eletrico;

  const dieselPrice = diesel.energy_price.value;
  const bioPrice = biometano.energy_price.value;
  const elecPrice = eletrico.energy_price.value;
  const bioWtWCnpe = biometano.carbon_intensity.value;
  const payloadPenaltyAbs = Math.abs(eletrico.payload_penalty_kg?.value ?? 2400);

  // Crankshaft mechanical energy cost (R$/MWh-eq) derived consistently from parameters.json MJ/km
  const dieselMjPerKm = diesel.energy_density.value / diesel.consumption.value;
  const bioMjPerKm = biometano.energy_density.value / biometano.consumption.value;
  const bioImpliedEfficiency =
    REFERENCE_DIESEL_THERMAL_EFFICIENCY * (dieselMjPerKm / bioMjPerKm);
  const elecChargingEff = eletrico.charging_efficiency?.value ?? 0.9;
  const elecGridToShaftEff = elecChargingEff * REFERENCE_ELECTRIC_DRIVETRAIN_EFFICIENCY;

  const dieselMwhEq =
    (dieselPrice /
      (diesel.energy_density.value / 3.6) /
      REFERENCE_DIESEL_THERMAL_EFFICIENCY) *
    1000;
  const bioMwhEq =
    (bioPrice / (biometano.energy_density.value / 3.6) / bioImpliedEfficiency) * 1000;
  const elecMwhEq =
    (elecPrice / (eletrico.energy_density.value / 3.6) / elecGridToShaftEff) * 1000;

  const cheapestBrIsElec = elecMwhEq <= bioMwhEq;
  const cheapestBrMwhEq = cheapestBrIsElec ? elecMwhEq : bioMwhEq;

  // Dynamic WtW bar baseline
  const wtwBaseline = br.wtw_emissions_g_co2eq_tkm.diesel_baseline || 104;
  const barWidthPct = (val: number) =>
    `${Math.min(100, Math.max(4, Math.round((Math.abs(val) / wtwBaseline) * 1000) / 10))}%`;

  const brBev = br.wtw_emissions_g_co2eq_tkm.bev_grid;
  const euBev = regions.uniao_europeia.wtw_emissions_g_co2eq_tkm.bev_grid;
  const usBev = regions.estados_unidos.wtw_emissions_g_co2eq_tkm.bev_grid;
  const cnBev = regions.china.wtw_emissions_g_co2eq_tkm.bev_grid;

  const regionShortLabel = (reg: RegionBenchmark) => {
    if (reg.code === 'BR') return 'Brasil (SIN)';
    if (reg.code === 'EU') return 'União Europeia';
    if (reg.code === 'US') return 'Estados Unidos';
    return 'China';
  };

  const formatRatio = (num: number, den: number) =>
    den > 0 ? formatNumber(num / den, 1) : '-';

  return (
    <div className="space-y-8">
      {/* 1. TOP MACRO KPI SUMMARY TILES */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="bg-base-100 rounded-xl border border-emerald-500/30 p-4 shadow-xs">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-bold tracking-wider text-emerald-700 uppercase dark:text-emerald-400">
            <Leaf className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Matriz Elétrica BR</span>
          </div>
          <div className="font-mono text-2xl font-black text-emerald-700 dark:text-emerald-400">
            {formatNumber(br.renewable_grid_share_percent, 1)}%
          </div>
          <p className="text-base-content/75 mt-1 text-[11px]">
            Renovável (SIN), contra faixa de {formatNumber(foreignMinRenewable, 1)}% a{' '}
            {formatNumber(foreignMaxRenewable, 1)}% nas economias comparadas.
          </p>
        </div>

        <div className="bg-base-100 border-primary/30 rounded-xl border p-4 shadow-xs">
          <div className="text-primary mb-1 flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase">
            <Globe className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>WtW Biometano BR</span>
          </div>
          <div className="text-primary font-mono text-2xl font-black">
            {formatNumber(bioWtWCnpe, 2)}{' '}
            <span className="text-base-content/75 text-xs font-normal">gCO₂eq/MJ</span>
          </div>
          <p className="text-base-content/75 mt-1 text-[11px]">
            Mandato CNPE 4/2026 (fronteira padrão WtW); rotas de vinhaça atingem{' '}
            {formatNumber(br.wtw_emissions_g_co2eq_tkm.biomethane_vinasse, 1)} g/t·km com
            crédito de metano evitado.
          </p>
        </div>

        <div className="bg-base-100 rounded-xl border border-emerald-500/30 p-4 shadow-xs">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-bold tracking-wider text-emerald-700 uppercase dark:text-emerald-400">
            <Zap className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Energia Útil Mecânica</span>
          </div>
          <div className="font-mono text-2xl font-black text-emerald-700 dark:text-emerald-400">
            R$ {formatNumber(cheapestBrMwhEq, 0)}{' '}
            <span className="text-base-content/75 text-xs font-normal">/MWh-eq</span>
          </div>
          <p className="text-base-content/75 mt-1 text-[11px]">
            {cheapestBrIsElec
              ? `Eletricidade em garagem (${formatNumber(elecGridToShaftEff * 100, 0)}% rede-eixo) supera biometano e diesel no virabrequim.`
              : `Biometano supera eletricidade e diesel no virabrequim com eficiência de ${formatNumber(bioImpliedEfficiency * 100, 0)}%.`}
          </p>
        </div>

        <div className="bg-base-100 rounded-xl border border-amber-500/30 p-4 shadow-xs">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-bold tracking-wider text-amber-700 uppercase dark:text-amber-400">
            <DollarSign className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Subsídio Direto BR</span>
          </div>
          <div className="font-mono text-2xl font-black text-amber-700 dark:text-amber-400">
            US$ {formatNumber(br.capex_subsidy_max_usd, 0)}{' '}
            <span className="text-base-content/75 text-xs font-normal">/veículo</span>
          </div>
          <p className="text-base-content/75 mt-1 text-[11px]">
            Ao contrário da UE e dos EUA, o Brasil não financia a fundo perdido o
            sobrepreço.
          </p>
        </div>
      </div>

      {/* 2. SIDE-BY-SIDE MULTIDIMENSIONAL COMPARATIVE MATRIX */}
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
                        {regionShortLabel(reg)}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-base-200/60 divide-y text-xs">
              {/* Row 1: Preço Médio do Diesel */}
              <tr className="hover:bg-base-200/30 transition-colors">
                <td className="text-base-content/85 px-3 py-2.5 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <Fuel
                      className="h-3.5 w-3.5 shrink-0 text-slate-500"
                      aria-hidden="true"
                    />
                    <span>Preço do Diesel na Bomba</span>
                  </div>
                  <span className="text-base-content/75 block text-[11px]">
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
                    <span className="text-base-content/75 block font-sans text-[11px] font-normal">
                      {reg.code === 'BR'
                        ? `Ref. SC: R$ ${formatNumber(dieselPrice, 2)}/L`
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
                <td className="text-base-content/85 px-3 py-2.5 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <Zap
                      className="h-3.5 w-3.5 shrink-0 text-cyan-700 dark:text-cyan-400"
                      aria-hidden="true"
                    />
                    <span>Eletricidade Comercial / Pátio</span>
                  </div>
                  <span className="text-base-content/75 block text-[11px]">
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
                    <span className="text-base-content/75 block font-sans text-[11px] font-normal">
                      {reg.code === 'BR'
                        ? `Ref. SC: R$ ${formatNumber(elecPrice, 2)}/kWh`
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
                <td className="text-base-content/85 px-3 py-2.5 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <DollarSign
                      className="h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-400"
                      aria-hidden="true"
                    />
                    <span>Subsídio Direto de Compra (CAPEX)</span>
                  </div>
                  <span className="text-base-content/75 block text-[11px]">
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
                      <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        Até US$ {formatNumber(reg.capex_subsidy_max_usd, 0)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-mono font-bold text-amber-700 dark:text-amber-400">
                        US$ 0
                      </span>
                    )}
                    <span className="text-base-content/75 mt-0.5 block text-[11px] leading-snug">
                      {reg.capex_subsidy_status}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Row 4: Tolerância na Lei da Balança */}
              <tr className="hover:bg-base-200/30 transition-colors">
                <td className="text-base-content/85 px-3 py-2.5 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <Scale
                      className="h-3.5 w-3.5 shrink-0 text-indigo-700 dark:text-indigo-400"
                      aria-hidden="true"
                    />
                    <span>Tolerância na Lei da Balança</span>
                  </div>
                  <span className="text-base-content/75 block text-[11px]">
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
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        +{formatNumber(reg.battery_weight_allowance_kg, 0)} kg
                      </span>
                    ) : reg.code === 'CN' ? (
                      <span className="font-mono font-bold text-cyan-700 dark:text-cyan-400">
                        0 kg (BaaS)
                      </span>
                    ) : (
                      <span className="font-mono font-bold text-rose-700 dark:text-rose-400">
                        0 kg (Sem abono)
                      </span>
                    )}
                    <span className="text-base-content/75 mt-0.5 block text-[11px] leading-snug">
                      {reg.code === 'BR'
                        ? `Perda líquida ~${formatNumber(payloadPenaltyAbs, 0)} kg`
                        : reg.battery_weight_regulation}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Row 5: Matriz Renovável & Intensidade */}
              <tr className="hover:bg-base-200/30 transition-colors">
                <td className="text-base-content/85 px-3 py-2.5 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <Leaf
                      className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-400"
                      aria-hidden="true"
                    />
                    <span>Matriz Elétrica Renovável</span>
                  </div>
                  <span className="text-base-content/75 block text-[11px]">
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
                    <span className="block font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      {formatNumber(reg.renewable_grid_share_percent, 1)}% renovável
                    </span>
                    <span className="text-base-content/75 mt-0.5 block font-mono text-[11px]">
                      {formatNumber(reg.grid_carbon_intensity_g_kwh, 0)} g CO₂e/kWh
                    </span>
                  </td>
                ))}
              </tr>

              {/* Row 6: Rota Tecnológica Prioritária */}
              <tr className="hover:bg-base-200/30 transition-colors">
                <td className="text-base-content/85 px-3 py-2.5 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <Globe
                      className="text-primary h-3.5 w-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span>Direção Tecnológica Dominante</span>
                  </div>
                  <span className="text-base-content/75 block text-[11px]">
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
                <td className="text-base-content/85 px-3 py-2.5 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck
                      className="h-3.5 w-3.5 shrink-0 text-purple-700 dark:text-purple-400"
                      aria-hidden="true"
                    />
                    <span>Instrumento Regulatório / Carbono</span>
                  </div>
                  <span className="text-base-content/75 block text-[11px]">
                    Marco de precificação e metas de frota
                  </span>
                </td>
                {regionList.map((reg) => (
                  <td
                    key={reg.code}
                    className={`text-base-content/80 px-3 py-2.5 text-center text-[11px] leading-tight ${
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

        <div className="border-base-200 text-base-content/75 mt-3 flex flex-col justify-between gap-2 border-t pt-3 text-[11px] sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-1.5">
            <span>
              Dados compilados de IEA, ANP, ANEEL, Eurostat e ICCT Global Commercial
              Vehicle Policies.
            </span>
            {benchmarksData.source_ids?.map((id) => (
              <SourceRef key={id} id={id} context="Comparativo Internacional" />
            ))}
          </div>
          <span className="font-mono">
            Preços internacionais em US$ conforme catálogo global_benchmarks.json
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
            Recarregar um caminhão elétrico em matrizes térmicas (China ou EUA) emite
            substancialmente mais carbono no ciclo completo do que na rede brasileira.
            Para o biometano, separa-se o fator regulatório padrão (CNPE 4/2026:{' '}
            {formatNumber(bioWtWCnpe, 2)} gCO₂eq/MJ) do cenário específico com crédito de
            metano evitado em vinhaça.
          </p>
        </div>

        <div className="max-w-4xl space-y-4">
          {/* Brazil Biomethane (Avoided methane sensitivity) */}
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="flex flex-wrap items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400">
                <span>🇧🇷</span> Brasil — Biometano de Vinhaça (Sensibilidade Metano
                Evitado)
                <span className="badge badge-xs badge-success text-[11px]">
                  Fronteira RenovaBio Vinhaça
                </span>
              </span>
              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                {formatNumber(br.wtw_emissions_g_co2eq_tkm.biomethane_vinasse, 1)} g
                CO₂e/t.km
              </span>
            </div>
            <div className="bg-base-200 relative flex h-5 w-full overflow-hidden rounded-full">
              <div
                className="flex h-full items-center justify-center bg-emerald-700 px-2 text-[11px] font-bold text-white"
                style={{
                  width: barWidthPct(br.wtw_emissions_g_co2eq_tkm.biomethane_vinasse),
                }}
                title="Crédito de metano mitigado (cenário específico de biodigestão)"
              >
                {formatNumber(br.wtw_emissions_g_co2eq_tkm.biomethane_vinasse, 1)}
              </div>
            </div>
            <span className="text-base-content/75 mt-0.5 block text-[11px]">
              Cenário específico com crédito por contenção de metano em vinhaça; no
              simulador principal aplica-se a fronteira padrão do mandato CNPE 4/2026 (
              {formatNumber(bioWtWCnpe, 2)} gCO₂eq/MJ).
            </span>
          </div>

          {/* Brazil BEV */}
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-cyan-700 dark:text-cyan-400">
                <span>🇧🇷</span> Brasil — Caminhão Elétrico Pesado (Rede SIN)
              </span>
              <span className="font-mono font-bold text-cyan-700 dark:text-cyan-400">
                {formatNumber(brBev, 1)} g CO₂e/t.km
              </span>
            </div>
            <div className="bg-base-200 h-5 w-full overflow-hidden rounded-full">
              <div
                className="flex h-full items-center bg-cyan-700 px-2 text-[11px] font-bold text-white"
                style={{ width: barWidthPct(brBev) }}
              >
                {formatNumber(brBev, 1)}
              </div>
            </div>
            <span className="text-base-content/75 mt-0.5 block text-[11px]">
              Baixo fator de emissão do Sistema Interligado Nacional (
              {formatNumber(br.grid_carbon_intensity_g_kwh, 0)} g CO₂e/kWh).
            </span>
          </div>

          {/* EU BEV */}
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-base-content flex items-center gap-1.5 font-semibold">
                <span>🇪🇺</span> União Europeia — BEV Médio (Rede Mix EU-27)
              </span>
              <span className="text-base-content font-mono font-bold">
                {formatNumber(euBev, 1)} g CO₂e/t.km
              </span>
            </div>
            <div className="bg-base-200 h-5 w-full overflow-hidden rounded-full">
              <div
                className="flex h-full items-center bg-blue-700 px-2 text-[11px] font-bold text-white"
                style={{ width: barWidthPct(euBev) }}
              >
                {formatNumber(euBev, 1)}
              </div>
            </div>
            <span className="text-base-content/75 mt-0.5 block text-[11px]">
              Mix europeu (
              {formatNumber(regions.uniao_europeia.grid_carbon_intensity_g_kwh, 0)} g
              CO₂e/kWh); emissão {formatRatio(euBev, brBev)}x superior ao BEV no Brasil.
            </span>
          </div>

          {/* US BEV */}
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-base-content flex items-center gap-1.5 font-semibold">
                <span>🇺🇸</span> Estados Unidos — BEV Classe 8 (Média US Grid)
              </span>
              <span className="text-base-content font-mono font-bold">
                {formatNumber(usBev, 1)} g CO₂e/t.km
              </span>
            </div>
            <div className="bg-base-200 h-5 w-full overflow-hidden rounded-full">
              <div
                className="flex h-full items-center bg-indigo-700 px-2 text-[11px] font-bold text-white"
                style={{ width: barWidthPct(usBev) }}
              >
                {formatNumber(usBev, 1)}
              </div>
            </div>
            <span className="text-base-content/75 mt-0.5 block text-[11px]">
              Matriz norte-americana (
              {formatNumber(regions.estados_unidos.grid_carbon_intensity_g_kwh, 0)} g
              CO₂e/kWh); emissão {formatRatio(usBev, brBev)}x superior à rede brasileira.
            </span>
          </div>

          {/* China BEV */}
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-base-content flex items-center gap-1.5 font-semibold">
                <span>🇨🇳</span> China — BEV Pesado (Matriz Térmica a Carvão)
              </span>
              <span className="text-base-content font-mono font-bold">
                {formatNumber(cnBev, 1)} g CO₂e/t.km
              </span>
            </div>
            <div className="bg-base-200 h-5 w-full overflow-hidden rounded-full">
              <div
                className="flex h-full items-center bg-rose-700 px-2 text-[11px] font-bold text-white"
                style={{ width: barWidthPct(cnBev) }}
              >
                {formatNumber(cnBev, 1)}
              </div>
            </div>
            <span className="text-base-content/75 mt-0.5 block text-[11px]">
              Matriz predominantemente térmica (
              {formatNumber(regions.china.grid_carbon_intensity_g_kwh, 0)} g CO₂e/kWh),{' '}
              {formatRatio(cnBev, brBev)}x superior à rede brasileira.
            </span>
          </div>

          {/* Diesel Baseline */}
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-base-content/75 flex items-center gap-1.5 font-semibold">
                <span>🌐</span> Referência Global — Diesel Fóssil (Euro VI / Conama P8)
              </span>
              <span className="text-base-content/75 font-mono font-bold">
                {formatNumber(wtwBaseline, 1)} g CO₂e/t.km (100% Base)
              </span>
            </div>
            <div className="bg-base-200 h-5 w-full overflow-hidden rounded-full">
              <div
                className="flex h-full items-center bg-slate-700 px-2 text-[11px] font-bold text-white"
                style={{ width: barWidthPct(wtwBaseline) }}
              >
                {formatNumber(wtwBaseline, 1)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. LEVELIZED CRANKSHAFT ENERGY COST COMPARISON */}
      <div className="bg-base-100 border-base-200 rounded-xl border p-5 shadow-xs">
        <div className="border-base-200 mb-4 border-b pb-3">
          <div className="badge badge-xs badge-neutral mb-1">
            Paridade Calórica &amp; Eficiência Consistente com o Simulador
          </div>
          <h2 className="text-base-content text-base font-bold tracking-tight">
            Custo Nivelado de Energia Útil no Virabrequim (R$/MWh-eq)
          </h2>
          <p className="text-base-content/75 mt-0.5 text-xs">
            Calculado diretamente a partir de parameters.json: Diesel a{' '}
            {formatNumber(REFERENCE_DIESEL_THERMAL_EFFICIENCY * 100, 0)}% de eficiência
            térmica ({formatNumber(dieselMjPerKm, 1)} MJ/km), ciclo Otto a gás com
            eficiência implícita de {formatNumber(bioImpliedEfficiency * 100, 1)}% (
            {formatNumber(bioMjPerKm, 1)} MJ/km) e elétrico a{' '}
            {formatNumber(elecGridToShaftEff * 100, 0)}% rede-eixo (recarga{' '}
            {formatNumber(elecChargingEff * 100, 0)}% × trem de força{' '}
            {formatNumber(REFERENCE_ELECTRIC_DRIVETRAIN_EFFICIENCY * 100, 0)}%).
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col justify-between rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3.5">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-700 dark:text-cyan-400">
                  🇧🇷 Eletricidade A4 (Base Própria)
                </span>
                <span
                  className={`badge badge-xs ${cheapestBrIsElec ? 'badge-success' : 'badge-info'}`}
                >
                  {cheapestBrIsElec ? 'Menor Custo BR' : 'Pátio Próprio'}
                </span>
              </div>
              <span className="text-base-content/75 block text-[11px]">
                Tarifa CELESC A4 Verde + tributos (R$ {formatNumber(elecPrice, 2)}/kWh)
              </span>
            </div>
            <div className="mt-3">
              <span className="font-mono text-xl font-black text-cyan-700 dark:text-cyan-400">
                R$ {formatNumber(elecMwhEq, 0)}
              </span>
              <span className="text-base-content/75 ml-1 text-[11px]">/MWh-eq</span>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  🇧🇷 Biometano Brasil
                </span>
                <span
                  className={`badge badge-xs ${!cheapestBrIsElec ? 'badge-success' : 'badge-ghost'}`}
                >
                  {!cheapestBrIsElec
                    ? 'Menor Custo BR'
                    : `Ef. Otto ${formatNumber(bioImpliedEfficiency * 100, 0)}%`}
                </span>
              </div>
              <span className="text-base-content/75 block text-[11px]">
                Referência ilustrativa (R$ {formatNumber(bioPrice, 2)}/m³ ·{' '}
                {formatNumber(biometano.energy_density.value, 0)} MJ/m³)
              </span>
            </div>
            <div className="mt-3">
              <span className="font-mono text-xl font-black text-emerald-700 dark:text-emerald-400">
                R$ {formatNumber(bioMwhEq, 0)}
              </span>
              <span className="text-base-content/75 ml-1 text-[11px]">/MWh-eq</span>
            </div>
          </div>

          <div className="bg-base-200/50 border-base-300 flex flex-col justify-between rounded-xl border p-3.5">
            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-base-content text-xs font-bold">
                  🇧🇷 Diesel B15 Brasil
                </span>
                <span className="badge badge-xs badge-ghost">Referência</span>
              </div>
              <span className="text-base-content/75 block text-[11px]">
                Mediana ANP SC (R$ {formatNumber(dieselPrice, 2)}/L ·{' '}
                {formatNumber(diesel.energy_density.value, 1)} MJ/L)
              </span>
            </div>
            <div className="mt-3">
              <span className="text-base-content font-mono text-xl font-black">
                R$ {formatNumber(dieselMwhEq, 0)}
              </span>
              <span className="text-base-content/75 ml-1 text-[11px]">/MWh-eq</span>
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
              <span className="text-base-content/75 block text-[11px]">
                Carregador rodoviário ultrarrápido (US${' '}
                {formatNumber(regions.uniao_europeia.electricity_price_usd_per_kwh, 2)}
                /kWh ref.)
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
              <span className="text-base-content/75 ml-1 text-[11px]">/MWh-eq</span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. STRATEGIC SYNTHESIS */}
      <div className="bg-base-100 border-base-200 rounded-xl border p-5 shadow-xs">
        <h2 className="text-base-content mb-3 text-base font-bold tracking-tight">
          Síntese Estratégica: Condições Estruturais da Transição no Brasil
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="border-base-200 bg-base-200/30 space-y-1.5 rounded-xl border p-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              <Leaf className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>1. Transição Sem Subsídios Diretos de CAPEX</span>
            </div>
            <p className="text-base-content/75 text-xs leading-relaxed">
              Enquanto mercados como EUA e União Europeia oferecem incentivos diretos de
              US$ {formatNumber(minForeignSubsidy, 0)} a US${' '}
              {formatNumber(maxForeignSubsidy, 0)} por caminhão pesado, o Brasil depende
              da competitividade operacional dos insumos (energia elétrica A4 e biometano)
              para diluir o sobrepreço inicial.
            </p>
          </div>

          <div className="border-base-200 bg-base-200/30 space-y-1.5 rounded-xl border p-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-400">
              <Scale className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>2. O Gargalo de Carga Útil na Balança (PBTC)</span>
            </div>
            <p className="text-base-content/75 text-xs leading-relaxed">
              Em rotas de longo curso no limite legal de peso, sem tolerância de PBTC para
              baterias na legislação vigente, o caminhão elétrico apresenta penalidade
              estimada de ~{formatNumber(payloadPenaltyAbs, 0)} kg de carga útil,
              favorecendo soluções a gás/biometano em operações sensíveis a massa.
            </p>
          </div>

          <div className="border-base-200 bg-base-200/30 space-y-1.5 rounded-xl border p-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-700 dark:text-cyan-400">
              <Globe className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>3. A Verdade do Ciclo de Vida (Well-to-Wheel)</span>
            </div>
            <p className="text-base-content/75 text-xs leading-relaxed">
              Políticas focadas apenas em escapamento ignoram que eletricidade gerada em
              matrizes fósseis transfere emissões para a geração. Com{' '}
              {formatNumber(br.renewable_grid_share_percent, 1)}% de renováveis no SIN,
              tanto a eletrificação quanto o biometano entregam forte abatimento WtW no
              Brasil.
            </p>
          </div>
        </div>
      </div>

      <TransparencyDisclaimer />
    </div>
  );
};
