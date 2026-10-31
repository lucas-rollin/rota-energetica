export interface EmissionsResult {
  /** Effective carbon intensity of energy source (gCO₂eq/MJ) */
  effectiveCarbonIntensity: number;
  /** Energy consumption per kilometer (MJ/km) */
  energyMjPerKm: number;
  /** Greenhouse gas emissions per kilometer (gCO₂eq/km) */
  emissionsGPerKm: number;
  /** Total annual emissions (tCO₂eq/year) */
  annualEmissionsTon: number;
  /** Fossil vs biogenic decomposition for blended Diesel B */
  dieselBreakdown?: {
    fossilShare: number;
    biodieselShare: number;
    fossilIntensity: number;
    biodieselIntensity: number;
    fossilEmissionsGPerKm: number;
    biodieselEmissionsGPerKm: number;
  };
}

export interface CalculateEmissionsParams {
  /** Energy density or lower heating value (PCI, MJ/L, MJ/m³, or MJ/kWh) */
  energyDensity: number;
  /** Effective fuel economy (km/unit, factoring in charging efficiency for EV) */
  effectiveConsumption: number;
  /** Stated carbon intensity (gCO₂eq/MJ) */
  carbonIntensity: number;
  /** Average annual driving distance (km/year) */
  annualDistanceKm: number;
  /** Flag indicating Diesel B to compute weighted fossil/biodiesel blend */
  isDiesel?: boolean;
  /** Biodiesel blend mandate fraction (decimal fraction, e.g. 0.15) */
  biodieselBlend?: number;
  /** Well-to-wheel carbon intensity of fossil diesel (gCO₂eq/MJ) */
  dieselFossilCarbonIntensity?: number;
  /** Well-to-wheel carbon intensity of biodiesel (gCO₂eq/MJ) */
  biodieselCarbonIntensity?: number;
}

/**
 * Calculates weighted carbon intensity for commercial Diesel B blend:
 * I_dieselB = (1 - b) × I_fossil + b × I_biodiesel
 */
export function calculateDieselBBlendIntensity(
  biodieselBlend: number,
  fossilIntensity: number,
  biodieselIntensity: number
): number {
  return (1 - biodieselBlend) * fossilIntensity + biodieselBlend * biodieselIntensity;
}

/**
 * Calculates specific energy consumption and well-to-wheel emissions
 * according to methodology §5.2.
 */
export function calculateEmissions(params: CalculateEmissionsParams): EmissionsResult {
  const {
    energyDensity,
    effectiveConsumption,
    carbonIntensity,
    annualDistanceKm,
    isDiesel = false,
    biodieselBlend,
    dieselFossilCarbonIntensity,
    biodieselCarbonIntensity,
  } = params;

  if (effectiveConsumption <= 0) {
    throw new Error(
      `Effective consumption must be positive (received: ${effectiveConsumption})`
    );
  }

  // Energy consumption per km: MJ/km = LHV / C_effective
  const energyMjPerKm = energyDensity / effectiveConsumption;

  let effectiveCarbonIntensity = carbonIntensity;
  let dieselBreakdown: EmissionsResult['dieselBreakdown'] | undefined;

  if (
    isDiesel &&
    biodieselBlend !== undefined &&
    dieselFossilCarbonIntensity !== undefined &&
    biodieselCarbonIntensity !== undefined
  ) {
    effectiveCarbonIntensity = calculateDieselBBlendIntensity(
      biodieselBlend,
      dieselFossilCarbonIntensity,
      biodieselCarbonIntensity
    );

    const fossilShare = 1 - biodieselBlend;
    const biodieselShare = biodieselBlend;
    const fossilIntensity = fossilShare * dieselFossilCarbonIntensity;
    const biodieselIntensity = biodieselShare * biodieselCarbonIntensity;

    dieselBreakdown = {
      fossilShare,
      biodieselShare,
      fossilIntensity,
      biodieselIntensity,
      fossilEmissionsGPerKm: energyMjPerKm * fossilIntensity,
      biodieselEmissionsGPerKm: energyMjPerKm * biodieselIntensity,
    };
  }

  // Emissions per km: gCO₂eq/km = MJ/km × gCO₂eq/MJ
  const emissionsGPerKm = energyMjPerKm * effectiveCarbonIntensity;

  // Annual emissions: tCO₂eq/year = (D × gCO₂eq/km) / 1,000,000
  const annualEmissionsTon = (annualDistanceKm * emissionsGPerKm) / 1_000_000;

  return {
    effectiveCarbonIntensity,
    energyMjPerKm,
    emissionsGPerKm,
    annualEmissionsTon,
    dieselBreakdown,
  };
}
