import { useState, useCallback } from 'react';
import { LaunchParameters, SimulationResult, TrajectoryPoint, PlotData, OptimalParameters } from '../types/rocket';

// Mock simulation engine
export const useSimulation = () => {
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const generateTrajectoryData = useCallback((params: LaunchParameters): TrajectoryPoint[] => {
    const data: TrajectoryPoint[] = [];
    const { rocketSpecs, orbitHeight } = params;
    const totalTime = rocketSpecs.burnTime + 200; // Total simulation time
    
    for (let t = 0; t <= totalTime; t += 0.5) {
      const altitude = t <= rocketSpecs.burnTime 
        ? (rocketSpecs.thrust / rocketSpecs.mass) * 0.5 * t * t
        : Math.max(0, ((rocketSpecs.thrust / rocketSpecs.mass) * 0.5 * rocketSpecs.burnTime * rocketSpecs.burnTime) + 
          (rocketSpecs.thrust / rocketSpecs.mass * rocketSpecs.burnTime * (t - rocketSpecs.burnTime)) - 
          (4.9 * Math.pow(t - rocketSpecs.burnTime, 2)));
      
      const velocity = t <= rocketSpecs.burnTime
        ? (rocketSpecs.thrust / rocketSpecs.mass) * t
        : Math.max(0, (rocketSpecs.thrust / rocketSpecs.mass * rocketSpecs.burnTime) - 9.8 * (t - rocketSpecs.burnTime));
      
      const acceleration = t <= rocketSpecs.burnTime
        ? rocketSpecs.thrust / rocketSpecs.mass
        : -9.8;
      
      const thrust = t <= rocketSpecs.burnTime ? rocketSpecs.thrust : 0;
      
      data.push({
        time: t,
        altitude: Math.max(0, altitude),
        velocity: velocity,
        acceleration: acceleration,
        thrust: thrust,
        x: altitude * Math.cos(t * 0.1),
        y: altitude * Math.sin(t * 0.1),
        z: altitude
      });
    }
    
    return data;
  }, []);

  const generatePlotData = useCallback((trajectoryData: TrajectoryPoint[]): PlotData => {
    return {
      altitude: trajectoryData.map(point => ({ time: point.time, value: point.altitude })),
      velocity: trajectoryData.map(point => ({ time: point.time, value: point.velocity })),
      acceleration: trajectoryData.map(point => ({ time: point.time, value: point.acceleration })),
      thrust: trajectoryData.map(point => ({ time: point.time, value: point.thrust }))
    };
  }, []);

  const calculateOptimalParameters = useCallback((params: LaunchParameters): OptimalParameters => {
    const { rocketSpecs, orbitHeight } = params;
    const requiredVelocity = Math.sqrt(398600.4418 / (6371 + orbitHeight));
    const launchAngle = Math.atan2(orbitHeight, 6371) * 180 / Math.PI;
    const optimalBurnTime = requiredVelocity / (rocketSpecs.thrust / rocketSpecs.mass);
    const maxAltitude = orbitHeight * 1000;
    const totalFlightTime = optimalBurnTime + Math.sqrt(2 * maxAltitude / 9.8);

    return {
      requiredVelocity,
      launchAngle,
      optimalBurnTime,
      maxAltitude,
      totalFlightTime
    };
  }, []);

  const runSimulation = useCallback(async (params: LaunchParameters) => {
    setIsRunning(true);
    setSimulation(null);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const trajectoryData = generateTrajectoryData(params);
    const plots = generatePlotData(trajectoryData);
    const optimalParams = calculateOptimalParameters(params);

    const result: SimulationResult = {
      id: Date.now().toString(),
      status: 'completed',
      trajectoryData,
      plots,
      optimalParams,
      timestamp: new Date()
    };

    setSimulation(result);
    setIsRunning(false);
  }, [generateTrajectoryData, generatePlotData, calculateOptimalParameters]);

  return {
    simulation,
    isRunning,
    runSimulation
  };
};