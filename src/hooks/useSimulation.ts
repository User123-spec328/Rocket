import { useState, useCallback } from 'react';
import { LaunchParameters, SimulationResult, TrajectoryPoint, PlotData, OptimalParameters } from '../types/rocket';

// Physics constants
const GRAVITY = 9.81; // m/s²
const EARTH_RADIUS = 6371000; // meters
const AIR_DENSITY = 1.225; // kg/m³ at sea level
const DRAG_AREA = 10; // m² (approximate cross-sectional area)

export const useSimulation = () => {
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const calculateDragForce = useCallback((velocity: number, altitude: number, dragCoeff: number): number => {
    // Air density decreases with altitude
    const densityRatio = Math.exp(-altitude / 8400); // Scale height approximation
    const density = AIR_DENSITY * densityRatio;
    return 0.5 * density * velocity * velocity * dragCoeff * DRAG_AREA;
  }, []);

  const calculateGravity = useCallback((altitude: number): number => {
    // Gravity decreases with altitude
    const r = EARTH_RADIUS + altitude;
    return GRAVITY * Math.pow(EARTH_RADIUS / r, 2);
  }, []);

  const generateTrajectoryData = useCallback((params: LaunchParameters): {
    trajectoryData: TrajectoryPoint[];
    stage1TrajectoryData: TrajectoryPoint[];
    stage2TrajectoryData: TrajectoryPoint[];
  } => {
    const { rocketSpecs, orbitHeight } = params;
    const targetAltitude = orbitHeight * 1000; // Convert km to meters
    const dt = 0.1; // Time step in seconds
    
    const trajectoryData: TrajectoryPoint[] = [];
    const stage1TrajectoryData: TrajectoryPoint[] = [];
    const stage2TrajectoryData: TrajectoryPoint[] = [];
    
    let time = 0;
    let altitude = 0;
    let velocity = 0;
    let mass = rocketSpecs.mass;
    
    // Stage 1 simulation
    while (time <= rocketSpecs.stage1BurnTime && altitude >= 0) {
      const gravity = calculateGravity(altitude);
      const dragForce = calculateDragForce(velocity, altitude, rocketSpecs.dragCoefficient);
      
      // Mass flow rate calculation using rocket equation
      const massFlowRate = rocketSpecs.stage1Thrust / (rocketSpecs.stage1ISP * GRAVITY);
      mass = Math.max(rocketSpecs.stageSeparationMass, mass - massFlowRate * dt);
      
      // Net force calculation
      const thrustForce = rocketSpecs.stage1Thrust;
      const weightForce = mass * gravity;
      const netForce = thrustForce - weightForce - dragForce;
      
      const acceleration = netForce / mass;
      
      // Update velocity and position using numerical integration
      velocity += acceleration * dt;
      altitude += velocity * dt;
      
      const point: TrajectoryPoint = {
        time,
        altitude: Math.max(0, altitude),
        velocity,
        acceleration,
        thrust: thrustForce,
        mass,
        x: altitude * Math.cos(time * 0.01), // Simple trajectory approximation
        y: altitude * Math.sin(time * 0.01),
        z: altitude,
        stage: 1
      };
      
      trajectoryData.push(point);
      stage1TrajectoryData.push(point);
      
      time += dt;
    }
    
    // Stage separation
    mass = rocketSpecs.stageSeparationMass;
    const stage2StartTime = time;
    
    // Stage 2 simulation
    while (time <= (stage2StartTime + rocketSpecs.stage2BurnTime) && altitude < targetAltitude && altitude >= 0) {
      const gravity = calculateGravity(altitude);
      const dragForce = calculateDragForce(velocity, altitude, rocketSpecs.dragCoefficient);
      
      // Mass flow rate for stage 2
      const massFlowRate = rocketSpecs.stage2Thrust / (rocketSpecs.stage2ISP * GRAVITY);
      mass = Math.max(mass * 0.1, mass - massFlowRate * dt); // Minimum 10% of separation mass
      
      // Net force calculation
      const thrustForce = rocketSpecs.stage2Thrust;
      const weightForce = mass * gravity;
      const netForce = thrustForce - weightForce - dragForce;
      
      const acceleration = netForce / mass;
      
      // Update velocity and position
      velocity += acceleration * dt;
      altitude += velocity * dt;
      
      const point: TrajectoryPoint = {
        time,
        altitude: Math.max(0, altitude),
        velocity,
        acceleration,
        thrust: thrustForce,
        mass,
        x: altitude * Math.cos(time * 0.01),
        y: altitude * Math.sin(time * 0.01),
        z: altitude,
        stage: 2
      };
      
      trajectoryData.push(point);
      stage2TrajectoryData.push(point);
      
      time += dt;
    }
    
    // Coast phase after stage 2 burnout (if target not reached)
    while (altitude < targetAltitude && altitude >= 0 && velocity > 0) {
      const gravity = calculateGravity(altitude);
      const dragForce = calculateDragForce(velocity, altitude, rocketSpecs.dragCoefficient);
      
      const weightForce = mass * gravity;
      const netForce = -weightForce - dragForce;
      const acceleration = netForce / mass;
      
      velocity += acceleration * dt;
      altitude += velocity * dt;
      
      const point: TrajectoryPoint = {
        time,
        altitude: Math.max(0, altitude),
        velocity,
        acceleration,
        thrust: 0,
        mass,
        x: altitude * Math.cos(time * 0.01),
        y: altitude * Math.sin(time * 0.01),
        z: altitude,
        stage: 2
      };
      
      trajectoryData.push(point);
      stage2TrajectoryData.push(point);
      
      time += dt;
    }
    
    return { trajectoryData, stage1TrajectoryData, stage2TrajectoryData };
  }, [calculateDragForce, calculateGravity]);

  const generatePlotData = useCallback((
    trajectoryData: TrajectoryPoint[],
    stage1Data: TrajectoryPoint[],
    stage2Data: TrajectoryPoint[]
  ): PlotData => {
    return {
      altitude: trajectoryData.map(point => ({ 
        time: point.time, 
        value: point.altitude,
        stage: point.stage
      })),
      velocity: trajectoryData.map(point => ({ 
        time: point.time, 
        value: point.velocity,
        stage: point.stage
      })),
      acceleration: trajectoryData.map(point => ({ 
        time: point.time, 
        value: point.acceleration,
        stage: point.stage
      })),
      thrust: trajectoryData.map(point => ({ 
        time: point.time, 
        value: point.thrust,
        stage: point.stage
      })),
      mass: trajectoryData.map(point => ({ 
        time: point.time, 
        value: point.mass,
        stage: point.stage
      })),
      stage1Trajectory: stage1Data.map(point => ({ 
        time: point.time, 
        value: point.altitude 
      })),
      stage2Trajectory: stage2Data.map(point => ({ 
        time: point.time, 
        value: point.altitude 
      }))
    };
  }, []);

  const calculateOptimalParameters = useCallback((
    params: LaunchParameters,
    trajectoryData: TrajectoryPoint[]
  ): OptimalParameters => {
    const { rocketSpecs, orbitHeight } = params;
    const targetAltitude = orbitHeight * 1000;
    
    // Find stage separation point
    const separationPoint = trajectoryData.find(point => point.stage === 2);
    const maxAltitudePoint = trajectoryData.reduce((max, point) => 
      point.altitude > max.altitude ? point : max
    );
    
    // Calculate orbital velocity at target altitude
    const requiredVelocity = Math.sqrt(398600441800000 / (EARTH_RADIUS + targetAltitude));
    
    // Launch angle optimization (simplified)
    const launchAngle = Math.atan2(targetAltitude, EARTH_RADIUS) * 180 / Math.PI;
    
    return {
      requiredVelocity,
      launchAngle,
      stage1OptimalBurnTime: rocketSpecs.stage1BurnTime,
      stage2OptimalBurnTime: rocketSpecs.stage2BurnTime,
      maxAltitude: maxAltitudePoint.altitude,
      totalFlightTime: trajectoryData[trajectoryData.length - 1]?.time || 0,
      stageSeparationTime: separationPoint?.time || rocketSpecs.stage1BurnTime,
      stageSeparationAltitude: separationPoint?.altitude || 0
    };
  }, []);

  const runSimulation = useCallback(async (params: LaunchParameters) => {
    setIsRunning(true);
    setSimulation(null);

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 1500));

    const { trajectoryData, stage1TrajectoryData, stage2TrajectoryData } = generateTrajectoryData(params);
    const plots = generatePlotData(trajectoryData, stage1TrajectoryData, stage2TrajectoryData);
    const optimalParams = calculateOptimalParameters(params, trajectoryData);

    const result: SimulationResult = {
      id: Date.now().toString(),
      status: 'completed',
      trajectoryData,
      stage1TrajectoryData,
      stage2TrajectoryData,
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