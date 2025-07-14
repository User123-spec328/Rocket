import { Engine, EngineDatabase } from '../types/engine';

// Calculate thrust using the formula: Thrust = (Fuel Mass / Burn Time) * 9.81 * ISP
const calculateThrust = (fuelMass: number, burnTime: number, isp: number): number => {
  return (fuelMass / burnTime) * 9.81 * isp;
};

export const ENGINES_DATABASE: EngineDatabase = {
  // Stage 1 Engines
  'merlin-1d': {
    id: 'merlin-1d',
    name: 'Merlin 1D',
    stage: 1,
    isp: 282,
    burnTime: 162,
    fuelMass: 418054, // Fuel mass for stage 1
    engineType: 'Sea Level',
    thrust: calculateThrust(418054, 162, 282),
    description: 'SpaceX Falcon 9/Heavy first stage engine'
  },
  'raptor-sl': {
    id: 'raptor-sl',
    name: 'Raptor Sea Level',
    stage: 1,
    isp: 330,
    burnTime: 180,
    fuelMass: 450000,
    engineType: 'Sea Level',
    thrust: calculateThrust(450000, 180, 330),
    description: 'SpaceX Starship/Super Heavy sea level engine'
  },
  'rs-25': {
    id: 'rs-25',
    name: 'RS-25 (SSME)',
    stage: 1,
    isp: 366,
    burnTime: 480,
    fuelMass: 600000,
    engineType: 'Sea Level',
    thrust: calculateThrust(600000, 480, 366),
    description: 'Space Shuttle Main Engine'
  },

  // Stage 2 Engines
  'merlin-1d-vac': {
    id: 'merlin-1d-vac',
    name: 'Merlin 1D Vacuum',
    stage: 2,
    isp: 348,
    burnTime: 397,
    fuelMass: 107000, // Fuel mass for stage 2
    engineType: 'Vacuum',
    thrust: calculateThrust(107000, 397, 348),
    description: 'SpaceX Falcon 9/Heavy second stage vacuum engine'
  },
  'raptor-vac': {
    id: 'raptor-vac',
    name: 'Raptor Vacuum',
    stage: 2,
    isp: 380,
    burnTime: 350,
    fuelMass: 120000,
    engineType: 'Vacuum',
    thrust: calculateThrust(120000, 350, 380),
    description: 'SpaceX Starship vacuum-optimized engine'
  },
  'rl10': {
    id: 'rl10',
    name: 'RL10',
    stage: 2,
    isp: 450,
    burnTime: 700,
    fuelMass: 80000,
    engineType: 'Vacuum',
    thrust: calculateThrust(80000, 700, 450),
    description: 'Aerojet Rocketdyne upper stage engine'
  }
};

export const getEnginesByStage = (stage: 1 | 2): Engine[] => {
  return Object.values(ENGINES_DATABASE).filter(engine => engine.stage === stage);
};

export const getEngineById = (id: string): Engine | null => {
  return ENGINES_DATABASE[id] || null;
};