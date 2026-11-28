import React from 'react';
import { DollarSign, Fuel, Globe, Leaf, Scale, Zap, ShieldCheck } from 'lucide-react';
import { useSharedSimulationParams } from '../../lib/calc/paramsStore';
import { FUEL_THEME } from '../../lib/theme/fuels';
import type { GlobalBenchmarksCatalog, RegionBenchmark } from '../../lib/types/catalogs';
import type { SimulationParameters } from '../../lib/types/parameters';
import { formatNumber } from '../../lib/utils/format';
import { SourceRef } from '../common/SourceRef';
import { TransparencyDisclaimer } from '../common/TransparencyDisclaimer';

interface GlobalBenchmarkDashboardProps {
  benchmarksData: GlobalBenchmarksCatalog;
  parameters: SimulationParameters;
  showDisclaimer?: boolean;
}

const REFERENCE_DIESEL_THERMAL_EFFICIENCY = 0.42;
const REFERENCE_ELECTRIC_DRIVETRAIN_EFFICIENCY = 0.9;

export const GlobalBenchmarkDashboard: React.FC<GlobalBenchmarkDashboardProps> = ({
  benchmarksData,
  parameters,
  showDisclaimer = true,
}) => {
  const liveParameters = useSharedSimulationParams(parameters);
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

  // Dynamic Brazil parameters from live simulator state / parameters.json
  const diesel = liveParameters.vehicles.diesel;
  const biometano = liveParameters.vehicles.biometano;
  const eletrico = liveParameters.vehicles.eletrico;

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
  const cheapestFuelTheme = cheapestBrIsElec ? FUEL_THEME.eletrico : FUEL_THEME.biometano;

  // Dynamic WtW bar baseline
  const wtwBaseline = br.wtw_emissions_g_co2eq_tkm.diesel_baseline || 104;
  const barWidthPct = (val: number) =>
    `${Math.min(100, Math.max(5, Math.round((Math.abs(val) / wtwBaseline) * 1000) / 10))}%`;

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

  return (
    <div className="space-y-5">
      {/* 1. TOP MACRO KPI SUMMARY TILES */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="bg-base-100 border-base-300/70 rounded-xl border p-3.5">
          <div className="text-base-content/70 mb-1 flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase">
            <Leaf className="text-primary h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Matriz Elétrica BR</span>
          </div>
          <div className="text-base-content font-mono text-2xl font-black">
            {formatNumber(br.renewable_grid_share_percent, 1)}%
          </div>
          <p className="text-base-content/65 mt-0.5 text-[11px]">
            Renovável vs. {formatNumber(foreignMinRenewable, 0)}–
            {formatNumber(foreignMaxRenewable, 0)}% exterior
          </p>
        </div>

        <div className="bg-base-100 border-base-300/70 rounded-xl border p-3.5">
          <div className="text-base-content/70 mb-1 flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase">
            <Globe
              className={`h-3.5 w-3.5 shrink-0 ${FUEL_THEME.biometano.iconClass}`}
              aria-hidden="true"
            />
            <span>WtW Biometano</span>
          </div>
          <div
            className={`font-mono text-2xl font-black ${FUEL_THEME.biometano.textClass}`}
          >
            {formatNumber(bioWtWCnpe, 2)}{' '}
            <span className="text-base-content/65 text-xs font-normal">g/MJ</span>
          </div>
          <p className="text-base-content/65 mt-0.5 text-[11px]">
            CNPE 4/2026 (vinhaça:{' '}
            {formatNumber(br.wtw_emissions_g_co2eq_tkm.biomethane_vinasse, 1)} g/t·km)
          </p>
        </div>

        <div className="bg-base-100 border-base-300/70 rounded-xl border p-3.5">
          <div className="text-base-content/70 mb-1 flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase">
            <Zap
              className={`h-3.5 w-3.5 shrink-0 ${cheapestFuelTheme.iconClass}`}
              aria-hidden="true"
            />
            <span>Menor Custo Eixo BR</span>
          </div>
          <div className={`font-mono text-2xl font-black ${cheapestFuelTheme.textClass}`}>
            R$ {formatNumber(cheapestBrMwhEq, 0)}{' '}
            <span className="text-base-content/65 text-xs font-normal">/MWh-eq</span>
          </div>
          <p className="text-base-content/65 mt-0.5 text-[11px]">
            {cheapestBrIsElec ? 'Eletricidade A4 (pátio)' : 'Biometano Brasil'}
          </p>
        </div>

        <div className="bg-base-100 border-base-300/70 rounded-xl border p-3.5">
          <div className="text-base-content/70 mb-1 flex items-center gap-1.5 text-[11px] font-bold tracking-wider uppercase">
            <DollarSign
              className="text-base-content/60 h-3.5 w-3.5 shrink-0"
              aria-hidden="true"
            />
            <span>Subsídio CAPEX BR</span>
          </div>
          <div className="text-base-content font-mono text-2xl font-black">
            US$ {formatNumber(br.capex_subsidy_max_usd, 0)}
          </div>
          <p className="text-base-content/65 mt-0.5 text-[11px]">
            Sem aporte direto a fundo perdido
          </p>
        </div>
      </div>

      {/* 2. SIDE-BY-SIDE MULTIDIMENSIONAL COMPARATIVE MATRIX */}
      <div className="bg-base-100 border-base-300/70 rounded-xl border p-4">
        <div className="-mx-1 overflow-x-auto sm:mx-0">
          <table className="table-xs sm:table-sm table w-full border-collapse">
            <thead>
              <tr className="border-base-300/70 border-b text-xs">
                <th className="bg-base-200/50 text-base-content/70 w-1/4 px-3 py-2.5 font-semibold tracking-wider uppercase">
                  Dimensão
                </th>
                {regionList.map((reg) => {
                  const isBrazil = reg.code === 'BR';
                  return (
                    <th
                      key={reg.code}
                      className={`w-[18.75%] px-3 py-2.5 text-center ${
                        isBrazil
                          ? 'bg-primary/10 text-primary border-primary/30 border-x font-black'
                          : 'bg-base-200/20 text-base-content font-bold'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1.5 text-sm">
                        <span>{reg.flag}</span>
                        <span className="text-xs sm:text-sm">{reg.code}</span>
                      </div>
                      <span className="text-base-content/65 block truncate text-[11px] font-normal">
                        {regionShortLabel(reg)}
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-base-300/50 divide-y text-xs">
              {/* Row 1: Preço Médio do Diesel */}
              <tr className="hover:bg-base-200/30 transition-colors">
                <td className="text-base-content/85 px-3 py-2 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <Fuel
                      className={`h-3.5 w-3.5 shrink-0 ${FUEL_THEME.diesel.iconClass}`}
                      aria-hidden="true"
                    />
                    <span>Diesel na Bomba (US$/L)</span>
                  </div>
                </td>
                {regionList.map((reg) => (
                  <td
                    key={reg.code}
                    className={`px-3 py-2 text-center font-mono font-bold ${
                      reg.code === 'BR'
                        ? 'bg-primary/5 border-primary/30 text-primary border-x'
                        : 'text-base-content'
                    }`}
                  >
                    US$ {formatNumber(reg.diesel_price_usd_per_liter, 2)}
                    <span className="text-base-content/65 block font-sans text-[11px] font-normal">
                      {reg.code === 'BR'
                        ? `SC: R$ ${formatNumber(dieselPrice, 2)}/L`
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
                <td className="text-base-content/85 px-3 py-2 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <Zap
                      className={`h-3.5 w-3.5 shrink-0 ${FUEL_THEME.eletrico.iconClass}`}
                      aria-hidden="true"
                    />
                    <span>Eletricidade Pátio (US$/kWh)</span>
                  </div>
                </td>
                {regionList.map((reg) => (
                  <td
                    key={reg.code}
                    className={`px-3 py-2 text-center font-mono font-bold ${
                      reg.code === 'BR'
                        ? 'bg-primary/5 border-primary/30 text-primary border-x'
                        : 'text-base-content'
                    }`}
                  >
                    US$ {formatNumber(reg.electricity_price_usd_per_kwh, 2)}
                    <span className="text-base-content/65 block font-sans text-[11px] font-normal">
                      {reg.code === 'BR'
                        ? `SC: R$ ${formatNumber(elecPrice, 2)}/kWh`
                        : reg.code === 'EU'
                          ? 'Custo marginal fóssil'
                          : reg.code === 'US'
                            ? 'Gás abundante'
                            : 'Tarifa industrial'}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Row 3: Subsídio Governamental Direto */}
              <tr className="hover:bg-base-200/30 transition-colors">
                <td className="text-base-content/85 px-3 py-2 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <DollarSign
                      className="text-base-content/55 h-3.5 w-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span>Subsídio CAPEX</span>
                  </div>
                </td>
                {regionList.map((reg) => (
                  <td
                    key={reg.code}
                    className={`px-3 py-2 text-center ${
                      reg.code === 'BR' ? 'bg-primary/5 border-primary/30 border-x' : ''
                    }`}
                  >
                    {reg.capex_subsidy_max_usd > 0 ? (
                      <span className="text-success font-mono font-bold">
                        Até US$ {formatNumber(reg.capex_subsidy_max_usd, 0)}
                      </span>
                    ) : (
                      <span className="text-base-content/70 font-mono font-bold">
                        US$ 0
                      </span>
                    )}
                    <span className="text-base-content/65 mt-0.5 block text-[11px] leading-snug">
                      {reg.capex_subsidy_status}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Row 4: Tolerância na Lei da Balança */}
              <tr className="hover:bg-base-200/30 transition-colors">
                <td className="text-base-content/85 px-3 py-2 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <Scale
                      className="text-base-content/55 h-3.5 w-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span>Tolerância PBTC (Bateria)</span>
                  </div>
                </td>
                {regionList.map((reg) => (
                  <td
                    key={reg.code}
                    className={`px-3 py-2 text-center ${
                      reg.code === 'BR' ? 'bg-primary/5 border-primary/30 border-x' : ''
                    }`}
                  >
                    {reg.battery_weight_allowance_kg > 0 ? (
                      <span className="text-success font-mono font-bold">
                        +{formatNumber(reg.battery_weight_allowance_kg, 0)} kg
                      </span>
                    ) : reg.code === 'CN' ? (
                      <span className="text-base-content font-mono font-bold">
                        0 kg (BaaS)
                      </span>
                    ) : (
                      <span className="text-error font-mono font-bold">
                        0 kg (Sem abono)
                      </span>
                    )}
                    <span className="text-base-content/65 mt-0.5 block text-[11px] leading-snug">
                      {reg.code === 'BR'
                        ? `Perda ~${formatNumber(payloadPenaltyAbs, 0)} kg`
                        : reg.battery_weight_regulation}
                    </span>
                  </td>
                ))}
              </tr>

              {/* Row 5: Matriz Renovável & Intensidade */}
              <tr className="hover:bg-base-200/30 transition-colors">
                <td className="text-base-content/85 px-3 py-2 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <Leaf
                      className="text-base-content/55 h-3.5 w-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span>Matriz Renovável</span>
                  </div>
                </td>
                {regionList.map((reg) => (
                  <td
                    key={reg.code}
                    className={`px-3 py-2 text-center ${
                      reg.code === 'BR' ? 'bg-primary/5 border-primary/30 border-x' : ''
                    }`}
                  >
                    <span className="text-base-content block font-mono text-xs font-bold">
                      {formatNumber(reg.renewable_grid_share_percent, 1)}%
                    </span>
                    <span className="text-base-content/65 block font-mono text-[11px]">
                      {formatNumber(reg.grid_carbon_intensity_g_kwh, 0)} g/kWh
                    </span>
                  </td>
                ))}
              </tr>

              {/* Row 6: Rota Tecnológica Prioritária */}
              <tr className="hover:bg-base-200/30 transition-colors">
                <td className="text-base-content/85 px-3 py-2 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <Globe
                      className="text-base-content/55 h-3.5 w-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span>Direção Dominante</span>
                  </div>
                </td>
                {regionList.map((reg) => (
                  <td
                    key={reg.code}
                    className={`px-3 py-2 text-center text-[11px] leading-tight font-medium ${
                      reg.code === 'BR'
                        ? 'bg-primary/5 border-primary/30 text-primary border-x font-bold'
                        : 'text-base-content/80'
                    }`}
                  >
                    {reg.dominant_pathway}
                  </td>
                ))}
              </tr>

              {/* Row 7: Mecanismo Regulatório */}
              <tr className="hover:bg-base-200/30 transition-colors">
                <td className="text-base-content/85 px-3 py-2 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck
                      className="text-base-content/55 h-3.5 w-3.5 shrink-0"
                      aria-hidden="true"
                    />
                    <span>Marco Regulatório</span>
                  </div>
                </td>
                {regionList.map((reg) => (
                  <td
                    key={reg.code}
                    className={`text-base-content/80 px-3 py-2 text-center text-[11px] leading-tight ${
                      reg.code === 'BR' ? 'bg-primary/5 border-primary/30 border-x' : ''
                    }`}
                  >
                    {reg.regulatory_mechanism}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="border-base-300/60 text-base-content/65 mt-3 flex flex-wrap items-center gap-1.5 border-t pt-2.5 text-[11px]">
          <span>Fontes: IEA, ANP, ANEEL, Eurostat e ICCT</span>
          {benchmarksData.source_ids?.map((id) => (
            <SourceRef key={id} id={id} context="Comparativo Internacional" />
          ))}
        </div>
      </div>

      {/* 3. WELL-TO-WHEEL PARADOX + CRANKSHAFT ENERGY COST */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* WtW Bar Chart */}
        <div className="bg-base-100 border-base-300/70 rounded-xl border p-4 lg:col-span-7">
          <h3 className="text-base-content mb-3.5 text-sm font-bold">
            Emissões WtW por Matriz Elétrica (g CO₂e / t·km)
          </h3>

          <div className="space-y-3">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span className={`font-semibold ${FUEL_THEME.biometano.textClass}`}>
                  🇧🇷 Biometano Vinhaça (metano evitado)
                </span>
                <span className={`font-mono font-bold ${FUEL_THEME.biometano.textClass}`}>
                  {formatNumber(br.wtw_emissions_g_co2eq_tkm.biomethane_vinasse, 1)}
                </span>
              </div>
              <div className="bg-base-200 flex h-4.5 w-full overflow-hidden rounded-full">
                <div
                  className={`${FUEL_THEME.biometano.barClass} ${FUEL_THEME.biometano.barTextClass} flex h-full items-center px-2 text-[11px] font-bold`}
                  style={{
                    width: barWidthPct(br.wtw_emissions_g_co2eq_tkm.biomethane_vinasse),
                  }}
                >
                  {formatNumber(br.wtw_emissions_g_co2eq_tkm.biomethane_vinasse, 1)}
                </div>
              </div>
            </div>

            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span className={`font-semibold ${FUEL_THEME.eletrico.textClass}`}>
                  🇧🇷 Brasil · BEV (SIN · {formatNumber(br.grid_carbon_intensity_g_kwh, 0)}{' '}
                  g/kWh)
                </span>
                <span className={`font-mono font-bold ${FUEL_THEME.eletrico.textClass}`}>
                  {formatNumber(brBev, 1)}
                </span>
              </div>
              <div className="bg-base-200 h-4.5 w-full overflow-hidden rounded-full">
                <div
                  className={`${FUEL_THEME.eletrico.barClass} ${FUEL_THEME.eletrico.barTextClass} flex h-full items-center px-2 text-[11px] font-bold`}
                  style={{ width: barWidthPct(brBev) }}
                >
                  {formatNumber(brBev, 1)}
                </div>
              </div>
            </div>

            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-base-content font-semibold">
                  🇪🇺 União Europeia · BEV (
                  {formatNumber(regions.uniao_europeia.grid_carbon_intensity_g_kwh, 0)}{' '}
                  g/kWh)
                </span>
                <span className="text-base-content font-mono font-bold">
                  {formatNumber(euBev, 1)}
                </span>
              </div>
              <div className="bg-base-200 h-4.5 w-full overflow-hidden rounded-full">
                <div
                  className="bg-base-content/50 text-base-100 flex h-full items-center px-2 text-[11px] font-bold"
                  style={{ width: barWidthPct(euBev) }}
                >
                  {formatNumber(euBev, 1)}
                </div>
              </div>
            </div>

            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-base-content font-semibold">
                  🇺🇸 Estados Unidos · BEV (
                  {formatNumber(regions.estados_unidos.grid_carbon_intensity_g_kwh, 0)}{' '}
                  g/kWh)
                </span>
                <span className="text-base-content font-mono font-bold">
                  {formatNumber(usBev, 1)}
                </span>
              </div>
              <div className="bg-base-200 h-4.5 w-full overflow-hidden rounded-full">
                <div
                  className="bg-base-content/65 text-base-100 flex h-full items-center px-2 text-[11px] font-bold"
                  style={{ width: barWidthPct(usBev) }}
                >
                  {formatNumber(usBev, 1)}
                </div>
              </div>
            </div>

            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-base-content font-semibold">
                  🇨🇳 China · BEV (
                  {formatNumber(regions.china.grid_carbon_intensity_g_kwh, 0)} g/kWh)
                </span>
                <span className="text-base-content font-mono font-bold">
                  {formatNumber(cnBev, 1)}
                </span>
              </div>
              <div className="bg-base-200 h-4.5 w-full overflow-hidden rounded-full">
                <div
                  className="bg-base-content/80 text-base-100 flex h-full items-center px-2 text-[11px] font-bold"
                  style={{ width: barWidthPct(cnBev) }}
                >
                  {formatNumber(cnBev, 1)}
                </div>
              </div>
            </div>

            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span className={`font-semibold ${FUEL_THEME.diesel.textClass}`}>
                  🌐 Diesel Fóssil (Base 100%)
                </span>
                <span className={`font-mono font-bold ${FUEL_THEME.diesel.textClass}`}>
                  {formatNumber(wtwBaseline, 1)}
                </span>
              </div>
              <div className="bg-base-200 h-4.5 w-full overflow-hidden rounded-full">
                <div
                  className={`${FUEL_THEME.diesel.barClass} ${FUEL_THEME.diesel.barTextClass} flex h-full items-center px-2 text-[11px] font-bold`}
                  style={{ width: barWidthPct(wtwBaseline) }}
                >
                  {formatNumber(wtwBaseline, 1)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Crankshaft Energy Cost */}
        <div className="bg-base-100 border-base-300/70 flex flex-col justify-between rounded-xl border p-4 lg:col-span-5">
          <div>
            <h3 className="text-base-content text-sm font-bold">
              Custo no Virabrequim (R$/MWh-eq)
            </h3>
            <p className="text-base-content/65 mt-0.5 mb-3 text-[11px]">
              Eficiência: Diesel{' '}
              {formatNumber(REFERENCE_DIESEL_THERMAL_EFFICIENCY * 100, 0)}% · Otto gás{' '}
              {formatNumber(bioImpliedEfficiency * 100, 0)}% · BEV{' '}
              {formatNumber(elecGridToShaftEff * 100, 0)}%
            </p>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <div
                className={`rounded-lg border p-3 ${FUEL_THEME.eletrico.surfaceCardClass}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-xs font-bold ${FUEL_THEME.eletrico.textClass}`}>
                    🇧🇷 Eletricidade A4
                  </span>
                  {cheapestBrIsElec && (
                    <span className="badge badge-xs badge-success">Menor BR</span>
                  )}
                </div>
                <div
                  className={`mt-1.5 font-mono text-lg font-black ${FUEL_THEME.eletrico.textClass}`}
                >
                  R$ {formatNumber(elecMwhEq, 0)}
                </div>
                <span className="text-base-content/65 text-[11px]">
                  R$ {formatNumber(elecPrice, 2)}/kWh
                </span>
              </div>

              <div
                className={`rounded-lg border p-3 ${FUEL_THEME.biometano.surfaceCardClass}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className={`text-xs font-bold ${FUEL_THEME.biometano.textClass}`}>
                    🇧🇷 Biometano BR
                  </span>
                  {!cheapestBrIsElec && (
                    <span className="badge badge-xs badge-success">Menor BR</span>
                  )}
                </div>
                <div
                  className={`mt-1.5 font-mono text-lg font-black ${FUEL_THEME.biometano.textClass}`}
                >
                  R$ {formatNumber(bioMwhEq, 0)}
                </div>
                <span className="text-base-content/65 text-[11px]">
                  R$ {formatNumber(bioPrice, 2)}/m³
                </span>
              </div>

              <div
                className={`rounded-lg border p-3 ${FUEL_THEME.diesel.surfaceCardClass}`}
              >
                <span className={`text-xs font-bold ${FUEL_THEME.diesel.textClass}`}>
                  🇧🇷 Diesel B15
                </span>
                <div
                  className={`mt-1.5 font-mono text-lg font-black ${FUEL_THEME.diesel.textClass}`}
                >
                  R$ {formatNumber(dieselMwhEq, 0)}
                </div>
                <span className="text-base-content/65 text-[11px]">
                  R$ {formatNumber(dieselPrice, 2)}/L
                </span>
              </div>

              <div className="bg-base-200/50 border-base-300/70 rounded-lg border p-3">
                <span className="text-base-content text-xs font-bold">🇪🇺 Europa MCS</span>
                <div className="text-base-content mt-1.5 font-mono text-lg font-black">
                  R${' '}
                  {formatNumber(
                    regions.uniao_europeia.energy_cost_levelized_mwh_eq.hpc_electricity ??
                      0,
                    0
                  )}
                </div>
                <span className="text-base-content/65 text-[11px]">
                  US${' '}
                  {formatNumber(regions.uniao_europeia.electricity_price_usd_per_kwh, 2)}
                  /kWh
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showDisclaimer && <TransparencyDisclaimer />}
    </div>
  );
};
