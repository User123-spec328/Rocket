export interface Engine {
  id: string;
  name: string;
  stage: 1 | 2;
  isp: number;
  burnTime: number;
  fuelMass: number;
  engineType: 'Sea Level' | 'Vacuum' | 'Hybrid';
  thrust: number;
  description?: string;
}

export interface EngineDatabase {
  [key: string]: Engine;
}