import React, { useMemo, useState } from 'react';
import { calculateFleetEsg } from '../../lib/calc/esg';
import { useSharedSimulationParams } from '../../lib/calc/paramsStore';
import type { LocalPollutantsCatalog } from '../../lib/types/catalogs';
import type { AlternativeId, SimulationParameters } from '../../lib/types/parameters';
import { FUEL_THEME } from '../../lib/theme/fuels';
import { formatCurrency, formatNumber } from '../../lib/utils/format';
import { SourceRef } from '../common/SourceRef';
import { TransparencyDisclaimer } from '../common/TransparencyDisclaimer';

interface EsgDashboardProps {
  parameters: SimulationParameters;
  pollutantsData: LocalPollutantsCatalog;
  showDisclaimer?: boolean;
}

export const EsgDashboard: React.FC<EsgDashboardProps> = ({
  parameters,
  pollutantsData,
  showDisclaimer = true,
}) => {
  const liveParameters = useSharedSimulationParams(parameters);
  const [fleetSize, setFleetSize] = useState<number>(45);
  const [monthlyMileage, setMonthlyMileage] = useState<number>(10000);
  const [targetFuel, setTargetFuel] = useState<'biometano' | 'eletrico' | 'gnv'>(
    'biometano'
  );
  const [showCbioSensitivity, setShowCbioSensitivity] = useState<boolean>(false);

  const cbioPrice = liveParameters.general.cbio_price?.value ?? 102;

  const esg = useMemo(
    () =>
      calculateFleetEsg({
        parameters: liveParameters,
        targetFuel,
        fleetSize,
        monthlyMileage,
      }),
    [liveParameters, targetFuel, fleetSize, monthlyMileage]
  );

  const {
    annualDistanceKm,
    annualAltTon,
    tonsAvoided,
    reductionPercent,
    dieselLitersAvoided,
    scope1Ton,
    scope2Ton,
    scope3Ton,
    reductionScope1Percent,
  } = esg;

  // Under RenovaBio, CBIOs are issued to biofuel producers (not fleet operators),
  // and BEVs / fossil GNV do not generate CBIOs.
  const hypotheticalCbioRevenue =
    showCbioSensitivity && targetFuel === 'biometano' ? tonsAvoided * cbioPrice : 0;

  // Well-to-Wheel carbon intensities directly from parameters.json
  const dieselCi = liveParameters.vehicles.diesel.carbon_intensity.value;
  const biometanoCi = liveParameters.vehicles.biometano.carbon_intensity.value;
  const eletricoCi = liveParameters.vehicles.eletrico.carbon_intensity.value;
  const gnvCi = liveParameters.vehicles.gnv.carbon_intensity.value;
  const maxCi = Math.max(dieselCi, biometanoCi, eletricoCi, gnvCi, 1);

  const formatDeltaVsDiesel = (ci: number) => {
    const pct = ((ci - dieselCi) / dieselCi) * 100;
    return `${pct > 0 ? '+' : ''}${formatNumber(pct, 1)}%`;
  };

  const formatSignedReduction = (pct: number) => {
    const rounded = Math.round(pct);
    if (rounded > 0) return `-${rounded}%`;
    if (rounded < 0) return `+${Math.abs(rounded)}%`;
    return '0%';
  };

  return (
    <div className="space-y-5">
      {/* Header Stat Overview */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="bg-base-100 border-base-300/70 rounded-xl border p-3.5">
          <div className="text-base-content/70 text-xs font-semibold">
            Variação GEE (WtW)
          </div>
          <div
            className={`mt-1 font-mono text-2xl font-black ${
              reductionPercent >= 0 ? 'text-success' : 'text-warning'
            }`}
          >
            {reductionPercent >= 0
              ? `-${formatNumber(reductionPercent, 1)}%`
              : `+${formatNumber(Math.abs(reductionPercent), 1)}%`}
          </div>
          <div className="text-base-content/65 mt-0.5 text-[11px]">vs. Diesel B15</div>
        </div>

        <div className="bg-base-100 border-base-300/70 rounded-xl border p-3.5">
          <div className="text-base-content/70 text-xs font-semibold">CO₂e Evitado</div>
          <div className="text-base-content mt-1 font-mono text-2xl font-black">
            {formatNumber(tonsAvoided, 0)}{' '}
            <span className="text-base-content/65 text-xs font-normal">t/ano</span>
          </div>
          <div className="text-base-content/65 mt-0.5 text-[11px]">Líquido WtW</div>
        </div>

        <div className="bg-base-100 border-base-300/70 rounded-xl border p-3.5">
          <div className="text-base-content/70 text-xs font-semibold">
            Emissão da Frota
          </div>
          <div className="text-base-content mt-1 font-mono text-2xl font-black">
            {formatNumber(annualAltTon, 0)}{' '}
            <span className="text-base-content/65 text-xs font-normal">tCO₂e/ano</span>
          </div>
          <div className="text-base-content/65 mt-0.5 text-[11px]">
            {formatNumber(esg.altEmissionsGPerKm, 0)} gCO₂eq/km por veículo
          </div>
        </div>

        <div className="bg-base-100 border-base-300/70 rounded-xl border p-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-base-content/70 text-xs font-semibold">
              CBIO (Hipotético)
            </span>
            <input
              type="checkbox"
              className="toggle toggle-xs toggle-primary"
              checked={showCbioSensitivity}
              onChange={(e) => setShowCbioSensitivity(e.target.checked)}
              aria-label="Incluir sensibilidade hipotética de CBIOs"
            />
          </div>
          <div
            className={`mt-1 font-mono text-2xl font-black ${
              showCbioSensitivity && hypotheticalCbioRevenue > 0
                ? 'text-success'
                : 'text-base-content/55'
            }`}
          >
            {showCbioSensitivity
              ? formatCurrency(hypotheticalCbioRevenue, 0)
              : 'Desativado'}
          </div>
          <div className="text-base-content/65 mt-0.5 text-[11px]">
            {showCbioSensitivity
              ? targetFuel === 'biometano'
                ? `${formatCurrency(cbioPrice, 0)}/CBIO · emitido ao produtor`
                : 'Apenas biocombustíveis (RenovaBio)'
              : 'Pertence ao produtor de biocombustível'}
          </div>
        </div>
      </div>

      {/* Interactive Fleet Decarbonization Tuner */}
      <div className="bg-base-100 border-base-300/70 rounded-xl border p-4">
        <div className="border-base-300/60 mb-4 flex flex-wrap items-center justify-between gap-3 border-b pb-3">
          <span className="text-base-content text-sm font-bold">
            Simulação de Frota Convertida
          </span>

          <div className="join">
            {(
              [
                { id: 'biometano', label: 'Biometano' },
                { id: 'eletrico', label: 'Elétrico (BEV)' },
                { id: 'gnv', label: 'GNV' },
              ] as const
            ).map((opt) => {
              const isActive = targetFuel === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTargetFuel(opt.id)}
                  className={`join-item btn btn-xs gap-1.5 ${
                    isActive
                      ? FUEL_THEME[opt.id].activeButtonClass
                      : 'btn-outline border-base-300'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isActive ? 'bg-white' : FUEL_THEME[opt.id].dotClass
                    }`}
                    aria-hidden="true"
                  />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 items-center gap-5 md:grid-cols-2">
          <div className="space-y-3.5">
            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-base-content font-semibold">Frota convertida</span>
                <span className="text-primary font-mono font-bold">
                  {fleetSize} caminhões
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="250"
                step="1"
                value={fleetSize}
                onChange={(e) => setFleetSize(parseInt(e.target.value, 10))}
                className="range range-xs range-primary w-full"
                aria-label="Tamanho da frota convertida"
              />
            </div>

            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-base-content font-semibold">
                  Rodagem média mensal
                </span>
                <span className="text-base-content font-mono font-bold">
                  {formatNumber(monthlyMileage, 0)} km/mês
                </span>
              </div>
              <input
                type="range"
                min="4000"
                max="18000"
                step="500"
                value={monthlyMileage}
                onChange={(e) => setMonthlyMileage(parseInt(e.target.value, 10))}
                className="range range-xs range-primary w-full"
                aria-label="Quilometragem média mensal"
              />
            </div>
          </div>

          <div className="bg-base-200/50 border-base-300/70 grid grid-cols-2 gap-3 rounded-lg border p-3.5 text-xs">
            <div>
              <span className="text-base-content/65 block text-[11px]">
                Diesel substituído
              </span>
              <span className="text-base-content font-mono font-bold">
                {formatNumber(dieselLitersAvoided, 0)} L/ano
              </span>
            </div>
            <div>
              <span className="text-base-content/65 block text-[11px]">
                Emissões evitadas (WtW)
              </span>
              <span
                className={`font-mono font-bold ${
                  tonsAvoided >= 0 ? 'text-success' : 'text-warning'
                }`}
              >
                {formatNumber(tonsAvoided, 0)} tCO₂e/ano
              </span>
            </div>
            <div>
              <span className="text-base-content/65 block text-[11px]">
                Distância total
              </span>
              <span className="text-base-content font-mono font-bold">
                {formatNumber((annualDistanceKm * fleetSize) / 1000000, 2)}M km/ano
              </span>
            </div>
            <div>
              <span className="text-base-content/65 block text-[11px]">
                Escopo 1 (direto)
              </span>
              <span
                className={`font-mono font-bold ${
                  reductionScope1Percent >= 0 ? 'text-success' : 'text-warning'
                }`}
              >
                {formatSignedReduction(reductionScope1Percent)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Lifecycle Waterfall & GHG Protocol Scopes */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="bg-base-100 border-base-300/70 rounded-xl border p-4">
          <h3 className="text-base-content mb-3.5 text-sm font-bold">
            Intensidade de Carbono WtW (gCO₂eq/MJ)
          </h3>

          <div className="space-y-3.5">
            {/* Diesel */}
            <div>
              <div className="mb-1 flex justify-between gap-2 text-xs">
                <span
                  className={`inline-flex items-center gap-1.5 font-semibold ${FUEL_THEME.diesel.textClass}`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${FUEL_THEME.diesel.dotClass}`}
                    aria-hidden="true"
                  />
                  Diesel B15 (Base)
                </span>
                <span className="text-base-content font-mono font-bold">
                  {formatNumber(dieselCi, 2)}
                </span>
              </div>
              <div className="bg-base-200 flex h-5 w-full overflow-hidden rounded-full">
                <div
                  className={`${FUEL_THEME.diesel.barClass} ${FUEL_THEME.diesel.barTextClass} flex h-full items-center justify-center px-2 text-[11px] font-semibold`}
                  style={{ width: `${Math.round((dieselCi / maxCi) * 100)}%` }}
                >
                  {formatNumber(dieselCi, 1)} gCO₂eq/MJ
                </div>
              </div>
            </div>

            {/* Biometano */}
            <div>
              <div className="mb-1 flex justify-between gap-2 text-xs">
                <span
                  className={`inline-flex flex-wrap items-center gap-1.5 font-semibold ${FUEL_THEME.biometano.textClass}`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${FUEL_THEME.biometano.dotClass}`}
                    aria-hidden="true"
                  />
                  <span>Biometano (CNPE 4/2026)</span>
                  <SourceRef id="E01" context="Mandato CNPE 4/2026 — Biometano" />
                </span>
                <span className={`font-mono font-bold ${FUEL_THEME.biometano.textClass}`}>
                  {formatNumber(biometanoCi, 2)} ({formatDeltaVsDiesel(biometanoCi)})
                </span>
              </div>
              <div className="bg-base-200 flex h-5 w-full overflow-hidden rounded-full">
                <div
                  className={`${FUEL_THEME.biometano.barClass} ${FUEL_THEME.biometano.barTextClass} flex h-full items-center justify-center px-2 text-[11px] font-semibold`}
                  style={{
                    width: `${Math.max(10, Math.round((biometanoCi / maxCi) * 100))}%`,
                  }}
                >
                  {formatNumber(biometanoCi, 1)}
                </div>
              </div>
            </div>

            {/* Elétrico */}
            <div>
              <div className="mb-1 flex justify-between gap-2 text-xs">
                <span
                  className={`inline-flex flex-wrap items-center gap-1.5 font-semibold ${FUEL_THEME.eletrico.textClass}`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${FUEL_THEME.eletrico.dotClass}`}
                    aria-hidden="true"
                  />
                  <span>Elétrico (SIN Brasil)</span>
                  <SourceRef id="E02" context="Fator de emissão do SIN (MCTI/SIRENE)" />
                </span>
                <span className={`font-mono font-bold ${FUEL_THEME.eletrico.textClass}`}>
                  {formatNumber(eletricoCi, 2)} ({formatDeltaVsDiesel(eletricoCi)})
                </span>
              </div>
              <div className="bg-base-200 flex h-5 w-full overflow-hidden rounded-full">
                <div
                  className={`${FUEL_THEME.eletrico.barClass} ${FUEL_THEME.eletrico.barTextClass} flex h-full items-center justify-center px-2 text-[11px] font-semibold`}
                  style={{
                    width: `${Math.max(12, Math.round((eletricoCi / maxCi) * 100))}%`,
                  }}
                >
                  {formatNumber(eletricoCi, 1)}
                </div>
              </div>
            </div>

            {/* GNV */}
            <div>
              <div className="mb-1 flex justify-between gap-2 text-xs">
                <span
                  className={`inline-flex items-center gap-1.5 font-semibold ${FUEL_THEME.gnv.textClass}`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${FUEL_THEME.gnv.dotClass}`}
                    aria-hidden="true"
                  />
                  GNV (Gás Natural Fóssil)
                </span>
                <span className={`font-mono font-bold ${FUEL_THEME.gnv.textClass}`}>
                  {formatNumber(gnvCi, 2)} ({formatDeltaVsDiesel(gnvCi)})
                </span>
              </div>
              <div className="bg-base-200 flex h-5 w-full overflow-hidden rounded-full">
                <div
                  className={`${FUEL_THEME.gnv.barClass} ${FUEL_THEME.gnv.barTextClass} flex h-full items-center justify-center px-2 text-[11px] font-semibold`}
                  style={{ width: `${Math.round((gnvCi / maxCi) * 100)}%` }}
                >
                  {formatNumber(gnvCi, 1)} gCO₂eq/MJ
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* GHG Protocol Scope Attribution */}
        <div className="bg-base-100 border-base-300/70 flex flex-col justify-between rounded-xl border p-4">
          <div>
            <h3 className="text-base-content mb-3.5 text-sm font-bold">
              Inventário por Escopo (GHG Protocol Brasil)
            </h3>

            <div className="space-y-2.5">
              <div className="bg-base-200/50 border-base-300/70 rounded-lg border p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-base-content font-semibold">
                    Escopo 1 · Combustão Direta
                  </span>
                  <span className="text-base-content font-mono font-bold">
                    {formatNumber(scope1Ton, 0)} tCO₂e/ano
                  </span>
                </div>
                <p className="text-base-content/65 mt-0.5 text-[11px]">
                  Emissões fósseis diretas no escapamento (biometano e BEV zeram esta
                  parcela).
                </p>
              </div>

              <div className="bg-base-200/50 border-base-300/70 rounded-lg border p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-base-content font-semibold">
                    Escopo 2 · Eletricidade (SIN)
                  </span>
                  <span className="text-base-content font-mono font-bold">
                    {formatNumber(scope2Ton, 0)} tCO₂e/ano
                  </span>
                </div>
                <p className="text-base-content/65 mt-0.5 text-[11px]">
                  Consumo elétrico de recarga (BEV), pelo fator médio do SIN.
                </p>
              </div>

              <div className="bg-base-200/50 border-base-300/70 rounded-lg border p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-base-content font-semibold">
                    Escopo 3 · Cadeia Upstream (WtT)
                  </span>
                  <span className="text-base-content font-mono font-bold">
                    {formatNumber(scope3Ton, 0)} tCO₂e/ano
                  </span>
                </div>
                <p className="text-base-content/65 mt-0.5 text-[11px]">
                  Processamento, compressão e entrega do biocombustível.
                </p>
              </div>
            </div>
          </div>

          <div className="border-base-300/60 text-base-content/70 mt-3 flex items-center justify-between gap-2 border-t pt-2.5 text-[11px]">
            <span>GHG Protocol Brasil &amp; ISO 14040/44</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="badge badge-xs badge-outline">SIN 2024</span>
              <SourceRef id="E02" context="Escopo 2 — Fator SIN (MCTI/SIRENE)" />
            </span>
          </div>
        </div>
      </div>

      {/* Local Air Quality Pollutants (CONAMA P8 / Euro VI) */}
      <div className="bg-base-100 border-base-300/70 rounded-xl border p-4">
        <div className="border-base-300/60 mb-3 flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
          <h3 className="text-base-content text-sm font-bold">
            Poluentes Locais (PROCONVE P8 / Euro VI)
          </h3>
          <span className="text-base-content/70 inline-flex items-center gap-1.5 text-[11px]">
            <span>CONAMA 490/2018</span>
            <SourceRef
              id={pollutantsData.source_id}
              context="Poluentes Locais (PROCONVE P8 / Euro VI)"
            />
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="table-xs sm:table-sm table w-full">
            <thead>
              <tr className="border-base-300/70 text-base-content/70 border-b text-xs font-semibold uppercase">
                <th>Vetor Energético</th>
                <th className="text-right">CO₂ Fóssil (g/km)</th>
                <th className="text-right">NOx (g/kWh)</th>
                <th className="text-right">MP 2.5 (g/kWh)</th>
                <th className="text-right">Ruído</th>
                <th>Impacto Urbano</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(pollutantsData.powertrains).map(([key, p]) => {
                const isDiesel = key === 'diesel';
                const theme = FUEL_THEME[key as AlternativeId];
                return (
                  <tr
                    key={key}
                    className={`border-base-300/50 border-b ${isDiesel ? 'bg-base-200/35' : ''}`}
                  >
                    <td className="text-xs font-bold">
                      <span className="inline-flex items-center gap-2">
                        {theme && (
                          <span
                            className={`h-2.5 w-2.5 shrink-0 rounded-full ${theme.dotClass}`}
                            aria-hidden="true"
                          />
                        )}
                        <span>{p.label}</span>
                        {isDiesel && (
                          <span className="badge badge-xs badge-ghost">Base</span>
                        )}
                      </span>
                    </td>
                    <td className="text-right font-mono text-xs">
                      {formatNumber(p.fossil_co2_g_km, 1)}
                    </td>
                    <td className="text-right font-mono text-xs">
                      <span className={p.nox_g_kwh === 0 ? 'text-success font-bold' : ''}>
                        {formatNumber(p.nox_g_kwh, 2)}
                      </span>
                      {p.nox_reduction_percent > 0 && (
                        <span className="text-success block text-[11px]">
                          -{formatNumber(p.nox_reduction_percent, 0)}%
                        </span>
                      )}
                    </td>
                    <td className="text-right font-mono text-xs">
                      <span
                        className={p.pm25_g_kwh === 0 ? 'text-success font-bold' : ''}
                      >
                        {formatNumber(p.pm25_g_kwh, 3)}
                      </span>
                      {p.pm_reduction_percent > 0 && (
                        <span className="text-success block text-[11px]">
                          -{formatNumber(p.pm_reduction_percent, 0)}%
                        </span>
                      )}
                    </td>
                    <td className="text-right font-mono text-xs">
                      {formatNumber(p.noise_db, 1)} dB
                    </td>
                    <td className="text-base-content/80 text-xs">{p.urban_impact}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="text-base-content/65 mt-2.5 text-[11px]">
          Limites P8 (WHTC): NOx ≤ 0,40 g/kWh · MP ≤ 0,010 g/kWh
        </div>
      </div>

      {showDisclaimer && <TransparencyDisclaimer />}
    </div>
  );
};
