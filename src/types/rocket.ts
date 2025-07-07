export interface RocketSpecifications {
  mass: number;
  thrust: number;
  dragCoefficient: number;
  burnTime: number;
  stageSeparationMass: number;
  isp: number;
}

export interface LaunchParameters {
  latitude: number;
  longitude: number;
  orbitHeight: number;
  rocketSpecs: RocketSpecifications;
}

export interface SimulationResult {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  trajectoryData: TrajectoryPoint[];
  plots: PlotData;
  optimalParams: OptimalParameters;
  timestamp: Date;
}

export interface TrajectoryPoint {
  time: number;
  altitude: number;
  velocity: number;
  acceleration: number;
  thrust: number;
  x: number;
  y: number;
  z: number;
}

export interface PlotData {
  altitude: DataPoint[];
  velocity: DataPoint[];
  acceleration: DataPoint[];
  thrust: DataPoint[];
}

export interface DataPoint {
  time: number;
  value: number;
}

export interface OptimalParameters {
  requiredVelocity: number;
  launchAngle: number;
  optimalBurnTime: number;
  maxAltitude: number;
  totalFlightTime: number;
}