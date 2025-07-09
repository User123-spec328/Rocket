export interface RocketSpecifications {
  mass: number;
  stageSeparationMass: number;
  dragCoefficient: number;
  stage1BurnTime: number;
  stage1Thrust: number;
  stage1ISP: number;
  stage2BurnTime: number;
  stage2Thrust: number;
  stage2ISP: number;
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
  stage1TrajectoryData: TrajectoryPoint[];
  stage2TrajectoryData: TrajectoryPoint[];
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
  mass: number;
  x: number;
  y: number;
  z: number;
  stage: 1 | 2;
}

export interface PlotData {
  altitude: DataPoint[];
  velocity: DataPoint[];
  acceleration: DataPoint[];
  thrust: DataPoint[];
  mass: DataPoint[];
  stage1Trajectory: DataPoint[];
  stage2Trajectory: DataPoint[];
}

export interface DataPoint {
  time: number;
  value: number;
  stage?: 1 | 2;
}

export interface OptimalParameters {
  requiredVelocity: number;
  launchAngle: number;
  stage1OptimalBurnTime: number;
  stage2OptimalBurnTime: number;
  maxAltitude: number;
  totalFlightTime: number;
  stageSeparationTime: number;
  stageSeparationAltitude: number;
}