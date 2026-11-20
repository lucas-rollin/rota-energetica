import React, { useMemo, useState } from 'react';
import type { LocalPollutantsCatalog } from '../../lib/types/catalogs';
import type { AlternativeId, SimulationParameters } from '../../lib/types/parameters';
import { FUEL_THEME } from '../../lib/theme/fuels';
import { formatCurrency, formatNumber } from '../../lib/utils/format';
import { SourceRef } from '../common/SourceRef';

interface EsgDashboardProps {
  parameters: SimulationParameters;
  pollutantsData: LocalPollutantsCatalog;
}

export const EsgDashboard: React.FC<EsgDashboardProps> = ({
  parameters,
  pollutantsData,
}) => {
  const [fleetSize, setFleetSize] = useState<number>(45);
  const [monthlyMileage, setMonthlyMileage] = useState<number>(10000);
  const [targetFuel, setTargetFuel] = useState<'biometano' | 'eletrico' | 'gnv'>('biometano');

  const cbioPrice = parameters.general.cbio_price?.value ?? 102;
  const annualDistance = monthlyMileage * 12;

  // Baseline diesel calculations
  const dieselConsumption = parameters.vehicles.diesel.consumption.value; // km/L
  const dieselCarbonIntensity = parameters.vehicles.diesel.carbon_intensity.value; // gCO2/MJ
  const dieselDensity = parameters.vehicles.diesel.energy_density.value; // MJ/L
  const dieselGPerKm = (dieselDensity * dieselCarbonIntensity) / dieselConsumption; // ~1079 gCO2/km
  const annualDieselEmissionsTonPerTruck = (dieselGPerKm * annualDistance) / 1000000;

  // Selected alternative calculations
  const altVehicle = parameters.vehicles[targetFuel];
  const altConsumption = altVehicle.consumption.value;
  const altDensity = altVehicle.energy_density.value;
  const altCarbonIntensity = altVehicle.carbon_intensity.value;
  const altChargingEff = altVehicle.charging_efficiency?.value ?? 1.0;
  const effectiveAltConsumption = altConsumption * altChargingEff;
  const altGPerKm = (altDensity * altCarbonIntensity) / effectiveAltConsumption;
  const annualAltEmissionsTonPerTruck = (altGPerKm * annualDistance) / 1000000;

  // Savings & Impacts
  const tonsAvoidedPerTruck = Math.max(0, annualDieselEmissionsTonPerTruck - annualAltEmissionsTonPerTruck);
  const totalFleetTonsAvoided = tonsAvoidedPerTruck * fleetSize;
  const totalTreesEquivalent = Math.round(totalFleetTonsAvoided * 6.66);
  const totalCbioRevenue = totalFleetTonsAvoided * cbioPrice;
  const dieselLitersAvoided = (annualDistance / dieselConsumption) * fleetSize;

  // Percentage reduction (positive = reduction vs diesel)
  const reductionPercent = ((annualDieselEmissionsTonPerTruck - annualAltEmissionsTonPerTruck) / annualDieselEmissionsTonPerTruck) * 100;

  // Well-to-Wheel carbon intensities directly from parameters.json
  const dieselCi = parameters.vehicles.diesel.carbon_intensity.value;
  const biometanoCi = parameters.vehicles.biometano.carbon_intensity.value;
  const eletricoCi = parameters.vehicles.eletrico.carbon_intensity.value;
  const gnvCi = parameters.vehicles.gnv.carbon_intensity.value;

  const formatDeltaVsDiesel = (ci: number) => {
    const pct = ((ci - dieselCi) / dieselCi) * 100;
    return `${pct > 0 ? '+' : ''}${formatNumber(pct, 1)}%`;
  };

  // Scope 1, 2, 3 calculations
  const scopeBreakdown = useMemo(() => {
    const dieselScope1 = (annualDistance * (dieselDensity * dieselCi / dieselConsumption) / 1000000) * fleetSize;
    if (targetFuel === 'eletrico') {
      const elecKgPerKwh = (eletricoCi * 3.6) / 1000;
      const scope2 = ((annualDistance / effectiveAltConsumption) * elecKgPerKwh) * fleetSize;
      return {
        scope1: 0,
        scope2: Math.round(scope2),
        scope3: Math.round(dieselScope1 * 0.08),
        reductionScope1: 100,
      };
    } else if (targetFuel === 'biometano') {
      return {
        scope1: Math.round(annualAltEmissionsTonPerTruck * fleetSize * 0.6),
        scope2: 0,
        scope3: Math.round(annualAltEmissionsTonPerTruck * fleetSize * 0.4),
        reductionScope1: Math.round(reductionPercent),
      };
    } else {
      return {
        scope1: Math.round(annualAltEmissionsTonPerTruck * fleetSize),
        scope2: 0,
        scope3: Math.round(dieselScope1 * 0.12),
        reductionScope1: Math.round(reductionPercent),
      };
    }
  }, [targetFuel, fleetSize, annualDistance, effectiveAltConsumption, dieselDensity, dieselConsumption, dieselCi, eletricoCi, annualAltEmissionsTonPerTruck, reductionPercent]);

  return (
    <div className="space-y-8">
      {/* Header Stat Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-base-100 rounded-xl border border-base-200 p-4 shadow-xs">
          <div className="text-xs font-semibold text-base-content/70">Variação de GEE da Frota</div>
          <div
            className={`text-2xl font-black font-mono mt-1 ${
              reductionPercent >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {reductionPercent >= 0 ? `-${formatNumber(reductionPercent, 1)}%` : `+${formatNumber(Math.abs(reductionPercent), 1)}%`}
          </div>
          <div className="text-[11px] text-base-content/60 mt-1">
            vs linha de base Diesel S10 B15
          </div>
        </div>

        <div className="bg-base-100 rounded-xl border border-base-200 p-4 shadow-xs">
          <div className="text-xs font-semibold text-base-content/70">CO₂e Evitado por Ano</div>
          <div className="text-2xl font-black text-base-content font-mono mt-1">
            {formatNumber(totalFleetTonsAvoided, 0)} <span className="text-sm font-normal text-base-content/60">t/ano</span>
          </div>
          <div className="text-[11px] text-base-content/60 mt-1">
            Emissões líquidas Well-to-Wheel
          </div>
        </div>

        <div className="bg-base-100 rounded-xl border border-base-200 p-4 shadow-xs">
          <div className="text-xs font-semibold text-base-content/70">Potencial Receita de CBIOs</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1">
            {formatCurrency(totalCbioRevenue, 0)}
          </div>
          <div className="text-[11px] text-base-content/60 mt-1">
            Cotação média B3 ({formatCurrency(cbioPrice, 0)}/CBIO)
          </div>
        </div>

        <div className="bg-base-100 rounded-xl border border-base-200 p-4 shadow-xs">
          <div className="text-xs font-semibold text-base-content/70">Equivalência Arbórea</div>
          <div className="text-2xl font-black text-primary font-mono mt-1">
            {formatNumber(totalTreesEquivalent, 0)}
          </div>
          <div className="text-[11px] text-base-content/60 mt-1">
            Árvores adultas preservadas/ano
          </div>
        </div>
      </div>

      {/* Interactive Fleet Decarbonization Tuner */}
      <div className="bg-base-100 rounded-xl border border-base-200 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-base-200 pb-4 mb-5">
          <div>
            <h2 className="text-lg font-bold text-base-content tracking-tight">
              Calculadora de Descarbonização e Arbitragem ESG
            </h2>
            <p className="text-xs text-base-content/70 mt-0.5">
              Simule o impacto ambiental da conversão gradual de cavalos mecânicos diesel para alternativas limpas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-base-content/70">Tecnologia adotada:</span>
            <div className="join">
              <button
                type="button"
                onClick={() => setTargetFuel('biometano')}
                className={`join-item btn btn-xs gap-1.5 ${
                  targetFuel === 'biometano'
                    ? FUEL_THEME.biometano.activeButtonClass
                    : 'btn-outline border-base-300'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    targetFuel === 'biometano' ? 'bg-white' : FUEL_THEME.biometano.dotClass
                  }`}
                  aria-hidden="true"
                />
                <span>Biometano (Bio-GNC)</span>
              </button>
              <button
                type="button"
                onClick={() => setTargetFuel('eletrico')}
                className={`join-item btn btn-xs gap-1.5 ${
                  targetFuel === 'eletrico'
                    ? FUEL_THEME.eletrico.activeButtonClass
                    : 'btn-outline border-base-300'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    targetFuel === 'eletrico' ? 'bg-white' : FUEL_THEME.eletrico.dotClass
                  }`}
                  aria-hidden="true"
                />
                <span>Elétrico (BEV)</span>
              </button>
              <button
                type="button"
                onClick={() => setTargetFuel('gnv')}
                className={`join-item btn btn-xs gap-1.5 ${
                  targetFuel === 'gnv'
                    ? FUEL_THEME.gnv.activeButtonClass
                    : 'btn-outline border-base-300'
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    targetFuel === 'gnv' ? 'bg-white' : FUEL_THEME.gnv.dotClass
                  }`}
                  aria-hidden="true"
                />
                <span>Gás Natural (GNV)</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-base-content">Tamanho da Frota Convertida:</span>
                <span className="font-mono font-bold text-primary">{fleetSize} caminhões</span>
              </div>
              <input
                type="range"
                min="1"
                max="250"
                step="1"
                value={fleetSize}
                onChange={(e) => setFleetSize(parseInt(e.target.value, 10))}
                className="range range-xs range-primary w-full"
              />
              <div className="flex justify-between text-[10px] text-base-content/50 mt-1">
                <span>1 veículo (piloto)</span>
                <span>50 un.</span>
                <span>120 un.</span>
                <span>250 un. (grande frota)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-base-content">Quilometragem Média Mensal:</span>
                <span className="font-mono font-bold text-base-content">{formatNumber(monthlyMileage, 0)} km/mês</span>
              </div>
              <input
                type="range"
                min="4000"
                max="18000"
                step="500"
                value={monthlyMileage}
                onChange={(e) => setMonthlyMileage(parseInt(e.target.value, 10))}
                className="range range-xs range-secondary w-full"
              />
              <div className="flex justify-between text-[10px] text-base-content/50 mt-1">
                <span>4.000 km (urbano/regional)</span>
                <span>10.000 km (médio)</span>
                <span>18.000 km (safra/longo curso)</span>
              </div>
            </div>
          </div>

          <div className="bg-base-200/50 rounded-lg p-4 border border-base-300 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-base-content/70">
              Balanço Operacional Anual da Frota
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-base-content/60 text-[11px] block">Diesel fóssil substituído:</span>
                <span className="font-mono font-bold text-base-content">{formatNumber(dieselLitersAvoided, 0)} L/ano</span>
              </div>
              <div>
                <span className="text-base-content/60 text-[11px] block">Créditos CBIO gerados:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {formatNumber(totalFleetTonsAvoided, 0)} CBIOs
                </span>
              </div>
              <div>
                <span className="text-base-content/60 text-[11px] block">Quilômetros limpos rodados:</span>
                <span className="font-mono font-bold text-base-content">
                  {formatNumber((annualDistance * fleetSize) / 1000000, 2)}M km/ano
                </span>
              </div>
              <div>
                <span className="text-base-content/60 text-[11px] block">Impacto Escopo 1 (Combustão):</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  -{scopeBreakdown.reductionScope1}% direto
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lifecycle Waterfall: WtT vs TtW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-base-100 rounded-xl border border-base-200 p-5 shadow-xs">
          <h2 className="text-base font-bold text-base-content tracking-tight mb-1">
            Cascata Poço-ao-Tanque (WtT) e Tanque-à-Roda (TtW)
          </h2>
          <p className="text-xs text-base-content/70 mb-4">
            Intensidade de Carbono de Ciclo de Vida Completo (WtW) em gramas de CO₂ equivalente por megajoule (gCO₂eq/MJ).
          </p>

          <div className="space-y-4">
            {/* Diesel */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className={`font-semibold inline-flex items-center gap-1.5 ${FUEL_THEME.diesel.textClass}`}>
                  <span className={`h-2 w-2 rounded-full ${FUEL_THEME.diesel.dotClass}`} aria-hidden="true" />
                  1. Diesel Comercial B15 (Linha de Base)
                </span>
                <span className="font-mono font-bold text-base-content">
                  {formatNumber(dieselCi, 2)} gCO₂eq/MJ
                </span>
              </div>
              <div className="w-full h-4 bg-base-200 rounded-full flex overflow-hidden">
                <div className={`${FUEL_THEME.diesel.barClass} h-full text-[9px] text-white flex items-center justify-center`} style={{ width: '22%' }} title="Poço ao Tanque: 22%">
                  WtT 22%
                </div>
                <div className={`${FUEL_THEME.diesel.barSecondaryClass} h-full text-[9px] text-white flex items-center justify-center`} style={{ width: '78%' }} title="Tanque à Roda: 78%">
                  TtW 78%
                </div>
              </div>
              <div className="text-[10px] text-base-content/60 mt-1">
                Upstream: refino e transporte fóssil + combustão pesada direta no motor.
              </div>
            </div>

            {/* Biometano */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className={`font-semibold inline-flex items-center gap-1.5 flex-wrap ${FUEL_THEME.biometano.textClass}`}>
                  <span className={`h-2 w-2 rounded-full ${FUEL_THEME.biometano.dotClass}`} aria-hidden="true" />
                  <span>2. Biometano Purificado (Mandato CNPE 4/2026)</span>
                  <SourceRef id="E01" context="Mandato CNPE 4/2026 — Biometano" />
                </span>
                <span className={`font-mono font-bold ${FUEL_THEME.biometano.textClass}`}>
                  {formatNumber(biometanoCi, 2)} gCO₂eq/MJ ({formatDeltaVsDiesel(biometanoCi)})
                </span>
              </div>
              <div className="w-full h-4 bg-base-200 rounded-full flex overflow-hidden">
                <div className={`${FUEL_THEME.biometano.barClass} h-full text-[9px] text-white flex items-center justify-center`} style={{ width: '18%' }} title="Processamento e compressão">
                  WtT 18%
                </div>
                <div className={`${FUEL_THEME.biometano.barSecondaryClass} h-full text-[9px] text-white flex items-center justify-center`} style={{ width: '82%' }} title="Ciclo biogênico neutro">
                  Bio-TtW Neutro
                </div>
              </div>
              <div className="text-[10px] text-base-content/60 mt-1">
                Captura metano fugitivo da biomassa residual; combustão reemite carbono do ciclo biogênico recente.
              </div>
            </div>

            {/* Elétrico */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className={`font-semibold inline-flex items-center gap-1.5 ${FUEL_THEME.eletrico.textClass}`}>
                  <span className={`h-2 w-2 rounded-full ${FUEL_THEME.eletrico.dotClass}`} aria-hidden="true" />
                  3. Caminhão Elétrico Pesado (Matriz SIN Brasil)
                </span>
                <span className={`font-mono font-bold ${FUEL_THEME.eletrico.textClass}`}>
                  {formatNumber(eletricoCi, 2)} gCO₂eq/MJ ({formatDeltaVsDiesel(eletricoCi)})
                </span>
              </div>
              <div className="w-full h-4 bg-base-200 rounded-full flex overflow-hidden">
                <div className={`${FUEL_THEME.eletrico.barClass} h-full text-[9px] text-white flex items-center justify-center`} style={{ width: '100%' }} title="Emissão concentrada na geração e transmissão">
                  WtT 100% (Rede Elétrica SIN)
                </div>
              </div>
              <div className="text-[10px] text-base-content/60 mt-1 flex flex-wrap items-center gap-1">
                <span>Zero emissões de escapamento no ponto de uso; impacto restrito à geração da rede (MCTI/SIRENE)</span>
                <SourceRef id="E02" context="Fator de emissão do SIN (MCTI/SIRENE)" />
                <span>.</span>
              </div>
            </div>

            {/* GNV */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className={`font-semibold inline-flex items-center gap-1.5 ${FUEL_THEME.gnv.textClass}`}>
                  <span className={`h-2 w-2 rounded-full ${FUEL_THEME.gnv.dotClass}`} aria-hidden="true" />
                  4. Gás Natural Veicular Fóssil (GNV)
                </span>
                <span className={`font-mono font-bold ${FUEL_THEME.gnv.textClass}`}>
                  {formatNumber(gnvCi, 2)} gCO₂eq/MJ ({formatDeltaVsDiesel(gnvCi)})
                </span>
              </div>
              <div className="w-full h-4 bg-base-200 rounded-full flex overflow-hidden">
                <div className={`${FUEL_THEME.gnv.barClass} h-full text-[9px] text-slate-950 font-semibold flex items-center justify-center`} style={{ width: '25%' }} title="Extração e distribuição">
                  WtT 25%
                </div>
                <div className={`${FUEL_THEME.gnv.barSecondaryClass} h-full text-[9px] text-white flex items-center justify-center`} style={{ width: '75%' }} title="Combustão">
                  TtW 75%
                </div>
              </div>
              <div className="text-[10px] text-base-content/60 mt-1">
                Combustível de transição fóssil; intensidade regulatória próxima ao diesel por MJ, com expressiva redução de poluentes locais (NOx e MP).
              </div>
            </div>
          </div>
        </div>

        {/* GHG Protocol Scope Attribution */}
        <div className="bg-base-100 rounded-xl border border-base-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-base-content tracking-tight mb-1">
              Rastreabilidade por Escopo (GHG Protocol Brasil)
            </h2>
            <p className="text-xs text-base-content/70 mb-4">
              Atribuição corporativa de inventário de carbono para frotas próprias e transportadores parceiros.
            </p>

            <div className="space-y-3">
              <div className="p-3 bg-base-200/50 rounded-lg border border-base-300">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-base-content">Escopo 1 — Combustão Móvel Direta</span>
                  <span className="font-mono font-bold text-primary">{formatNumber(scopeBreakdown.scope1, 0)} tCO₂e/ano</span>
                </div>
                <p className="text-[11px] text-base-content/70 mt-1">
                  Queima direta de combustível nos cilindros da frota própria. O caminhão elétrico elimina 100% desta linha; o biometano reduz em ~95% devido ao balanço biogênico.
                </p>
              </div>

              <div className="p-3 bg-base-200/50 rounded-lg border border-base-300">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-base-content">Escopo 2 — Eletricidade e Recarga de Bateria</span>
                  <span className="font-mono font-bold text-cyan-600 dark:text-cyan-400">{formatNumber(scopeBreakdown.scope2, 0)} tCO₂e/ano</span>
                </div>
                <p className="text-[11px] text-base-content/70 mt-1">
                  Consumo de eletricidade nas garagens e eletropostos públicos. Aplicável exclusivamente aos BEVs, mensurado pelo fator médio anual do SIN (MCTI).
                </p>
              </div>

              <div className="p-3 bg-base-200/50 rounded-lg border border-base-300">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-base-content">Escopo 3 — Frete Terceirizado e Cadeia Upstream</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{formatNumber(scopeBreakdown.scope3, 0)} tCO₂e/ano</span>
                </div>
                <p className="text-[11px] text-base-content/70 mt-1">
                  Operações de agregados e terceiros contratados. Empresas embarcadoras (agro, bens de consumo) exigem comprovação de redução para metas SBTi e relatórios CDP.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-base-200 flex items-center justify-between gap-2 text-xs text-base-content/60">
            <span>Metodologia: GHG Protocol Brasil &amp; ISO 14040/44</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="badge badge-xs badge-outline">Fator SIN 2024</span>
              <SourceRef id="E02" context="Escopo 2 — Fator SIN (MCTI/SIRENE)" />
            </span>
          </div>
        </div>
      </div>

      {/* Local Air Quality Pollutants (CONAMA P8 / Euro VI) */}
      <div className="bg-base-100 rounded-xl border border-base-200 p-5 shadow-xs">
        <div className="border-b border-base-200 pb-3 mb-4">
          <h2 className="text-base font-bold text-base-content tracking-tight">
            Matriz de Poluentes Locais e Qualidade do Ar (PROCONVE Fase P8 / Euro VI)
          </h2>
          <p className="text-xs text-base-content/70 mt-0.5">
            Avaliação de impacto na saúde pública e conformidade com os limites máximos legais federais (Resolução CONAMA nº 490/2018).
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="table table-xs sm:table-sm w-full">
            <thead>
              <tr className="border-b border-base-200 text-xs font-semibold uppercase text-base-content/70">
                <th>Vetor Energético</th>
                <th className="text-right">CO₂ Fóssil (g/km)</th>
                <th className="text-right">NOx (g/kWh)</th>
                <th className="text-right">MP 2.5 Fuligem (g/kWh)</th>
                <th className="text-right">Ruído (dB)</th>
                <th>Impacto Urbano</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(pollutantsData.powertrains).map(([key, p]) => {
                const isDiesel = key === 'diesel';
                const theme = FUEL_THEME[key as AlternativeId];
                return (
                  <tr key={key} className={`border-b border-base-200/60 ${isDiesel ? 'bg-base-200/30' : ''}`}>
                    <td className="font-bold text-xs">
                      <span className="inline-flex items-center gap-2">
                        {theme && (
                          <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${theme.dotClass}`} aria-hidden="true" />
                        )}
                        <span>{p.label}</span>
                        {isDiesel && <span className="badge badge-xs badge-neutral">Base</span>}
                      </span>
                    </td>
                    <td className="text-right font-mono text-xs">{formatNumber(p.fossil_co2_g_km, 1)}</td>
                    <td className="text-right font-mono text-xs">
                      <span className={p.nox_g_kwh === 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''}>
                        {formatNumber(p.nox_g_kwh, 2)}
                      </span>
                      {p.nox_reduction_percent > 0 && (
                        <span className="block text-[10px] text-emerald-600 dark:text-emerald-400">
                          -{formatNumber(p.nox_reduction_percent, 0)}%
                        </span>
                      )}
                    </td>
                    <td className="text-right font-mono text-xs">
                      <span className={p.pm25_g_kwh === 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : ''}>
                        {formatNumber(p.pm25_g_kwh, 3)}
                      </span>
                      {p.pm_reduction_percent > 0 && (
                        <span className="block text-[10px] text-emerald-600 dark:text-emerald-400">
                          -{formatNumber(p.pm_reduction_percent, 0)}%
                        </span>
                      )}
                    </td>
                    <td className="text-right font-mono text-xs">{formatNumber(p.noise_db, 1)} dB</td>
                    <td className="text-xs text-base-content/80">{p.urban_impact}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-3 text-[11px] text-base-content/60 flex flex-wrap items-center justify-between gap-2">
          <span>Limites legais Conama P8 (ciclo WHTC): NOx ≤ 0,40 g/kWh | Material Particulado ≤ 0,010 g/kWh</span>
          <span className="inline-flex items-center gap-1.5">
            <span>Fonte: CONAMA Res. 490/2018</span>
            <SourceRef id={pollutantsData.source_id} context="Poluentes Locais (PROCONVE P8 / Euro VI)" />
          </span>
        </div>
      </div>
    </div>
  );
};
