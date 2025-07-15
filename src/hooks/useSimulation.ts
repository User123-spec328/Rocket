import { useState, useCallback } from 'react';
import { LaunchParameters, SimulationResult, TrajectoryPoint, PlotData, OptimalParameters } from '../types/rocket';

// Physics constants (real-world values)
const GRAVITY_SEA_LEVEL = 9.80665; // m/s² (standard gravity)
const EARTH_RADIUS = 6371000; // meters
const EARTH_MASS = 5.972e24; // kg
const G = 6.67430e-11; // m³/kg/s² (gravitational constant)
const AIR_DENSITY_SEA_LEVEL = 1.225; // kg/m³
const SCALE_HEIGHT = 8400; // meters (atmospheric scale height)
const DRAG_AREA = 10; // m² (approximate cross-sectional area)

// Atmospheric model
const getAtmosphericDensity = (altitude: number): number => {
  if (altitude < 0) return AIR_DENSITY_SEA_LEVEL;
  if (altitude > 100000) return 0; // Above Karman line
  return AIR_DENSITY_SEA_LEVEL * Math.exp(-altitude / SCALE_HEIGHT);
};

// Gravitational acceleration at altitude
const getGravity = (altitude: number): number => {
  const r = EARTH_RADIUS + altitude;
  return G * EARTH_MASS / (r * r);
};

// Drag force calculation
const getDragForce = (velocity: number, altitude: number, dragCoeff: number): number => {
  const density = getAtmosphericDensity(altitude);
  return 0.5 * density * velocity * velocity * dragCoeff * DRAG_AREA;
};

// State vector for RK4 integration
interface StateVector {
  altitude: number;
  velocity: number;
  mass: number;
  time: number;
}

// Derivative function for rocket dynamics
const getRocketDerivatives = (
  state: StateVector,
  thrust: number,
  isp: number,
  dragCoeff: number,
  isEngineOn: boolean
): StateVector => {
  const { altitude, velocity, mass } = state;
  
  // Forces
  const gravity = getGravity(altitude);
  const dragForce = velocity > 0 ? getDragForce(velocity, altitude, dragCoeff) : 0;
  const thrustForce = isEngineOn ? thrust : 0;
  
  // Mass flow rate (rocket equation)
  const massFlowRate = isEngineOn ? thrust / (isp * GRAVITY_SEA_LEVEL) : 0;
  
  // Net acceleration
  const netForce = thrustForce - mass * gravity - dragForce;
  const acceleration = mass > 0 ? netForce / mass : 0;
  
  return {
    altitude: velocity, // dh/dt = v
    velocity: acceleration, // dv/dt = a
    mass: -massFlowRate, // dm/dt = -mdot
    time: 1 // dt/dt = 1
  };
};

// 4th Order Runge-Kutta integration step
const rk4Step = (
  state: StateVector,
  dt: number,
  thrust: number,
  isp: number,
  dragCoeff: number,
  isEngineOn: boolean
): StateVector => {
  // k1
  const k1 = getRocketDerivatives(state, thrust, isp, dragCoeff, isEngineOn);
  
  // k2
  const state2: StateVector = {
    altitude: state.altitude + 0.5 * dt * k1.altitude,
    velocity: state.velocity + 0.5 * dt * k1.velocity,
    mass: state.mass + 0.5 * dt * k1.mass,
    time: state.time + 0.5 * dt
  };
  const k2 = getRocketDerivatives(state2, thrust, isp, dragCoeff, isEngineOn);
  
  // k3
  const state3: StateVector = {
    altitude: state.altitude + 0.5 * dt * k2.altitude,
    velocity: state.velocity + 0.5 * dt * k2.velocity,
    mass: state.mass + 0.5 * dt * k2.mass,
    time: state.time + 0.5 * dt
  };
  const k3 = getRocketDerivatives(state3, thrust, isp, dragCoeff, isEngineOn);
  
  // k4
  const state4: StateVector = {
    altitude: state.altitude + dt * k3.altitude,
    velocity: state.velocity + dt * k3.velocity,
    mass: state.mass + dt * k3.mass,
    time: state.time + dt
  };
  const k4 = getRocketDerivatives(state4, thrust, isp, dragCoeff, isEngineOn);
  
  // Final integration
  return {
    altitude: state.altitude + (dt / 6) * (k1.altitude + 2 * k2.altitude + 2 * k3.altitude + k4.altitude),
    velocity: state.velocity + (dt / 6) * (k1.velocity + 2 * k2.velocity + 2 * k3.velocity + k4.velocity),
    mass: state.mass + (dt / 6) * (k1.mass + 2 * k2.mass + 2 * k3.mass + k4.mass),
    time: state.time + dt
  };
};

export const useSimulation = () => {
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateTrajectoryData = useCallback((params: LaunchParameters): {
    trajectoryData: TrajectoryPoint[];
    stage1TrajectoryData: TrajectoryPoint[];
    stage2TrajectoryData: TrajectoryPoint[];
  } => {
    const { rocketSpecs, orbitHeight } = params;
    const targetAltitude = orbitHeight * 1000; // Convert km to meters
    const dt = 0.1; // Small time step for accuracy
    
    const trajectoryData: TrajectoryPoint[] = [];
    const stage1TrajectoryData: TrajectoryPoint[] = [];
    const stage2TrajectoryData: TrajectoryPoint[] = [];
    
    // Initial state
    let state: StateVector = {
      altitude: 0,
      velocity: 0,
      mass: rocketSpecs.mass,
      time: 0
    };
    
    // Validate inputs
    if (!rocketSpecs.stage1Thrust || !rocketSpecs.stage2Thrust || rocketSpecs.mass <= 0) {
      throw new Error('Invalid rocket specifications');
    }
    
    // Stage 1 simulation
    console.log('Starting Stage 1 simulation...');
    while (state.time <= rocketSpecs.stage1BurnTime && state.altitude >= 0 && state.mass > rocketSpecs.stageSeparationMass) {
      const gravity = getGravity(state.altitude);
      const dragForce = getDragForce(state.velocity, state.altitude, rocketSpecs.dragCoefficient);
      
      // Calculate acceleration for display
      const netForce = rocketSpecs.stage1Thrust - state.mass * gravity - dragForce;
      const acceleration = netForce / state.mass;
      
      const point: TrajectoryPoint = {
        time: state.time,
        altitude: Math.max(0, state.altitude),
        velocity: state.velocity,
        acceleration,
        thrust: rocketSpecs.stage1Thrust,
        mass: state.mass,
        x: state.time * state.velocity * 0.01, // Simplified trajectory
        y: state.altitude,
        z: state.altitude,
        stage: 1
      };
      
      trajectoryData.push(point);
      stage1TrajectoryData.push(point);
      
      // RK4 integration step
      state = rk4Step(state, dt, rocketSpecs.stage1Thrust, rocketSpecs.stage1ISP, rocketSpecs.dragCoefficient, true);
      
      // Ensure mass doesn't go below separation mass
      state.mass = Math.max(rocketSpecs.stageSeparationMass, state.mass);
    }
    
    // Stage separation
    console.log(`Stage separation at t=${state.time}s, altitude=${state.altitude/1000}km, velocity=${state.velocity}m/s`);
    state.mass = rocketSpecs.stageSeparationMass;
    const stage2StartTime = state.time;
    
    // Stage 2 simulation
    console.log('Starting Stage 2 simulation...');
    const stage2EndTime = stage2StartTime + rocketSpecs.stage2BurnTime;
    
    while (state.time <= stage2EndTime && state.altitude >= 0) {
      const gravity = getGravity(state.altitude);
      const dragForce = getDragForce(state.velocity, state.altitude, rocketSpecs.dragCoefficient);
      
      // Calculate acceleration for display
      const netForce = rocketSpecs.stage2Thrust - state.mass * gravity - dragForce;
      const acceleration = netForce / state.mass;
      
      const point: TrajectoryPoint = {
        time: state.time,
        altitude: Math.max(0, state.altitude),
        velocity: state.velocity,
        acceleration,
        thrust: rocketSpecs.stage2Thrust,
        mass: state.mass,
        x: state.time * state.velocity * 0.01,
        y: state.altitude,
        z: state.altitude,
        stage: 2
      };
      
      trajectoryData.push(point);
      stage2TrajectoryData.push(point);
      
      // RK4 integration step
      state = rk4Step(state, dt, rocketSpecs.stage2Thrust, rocketSpecs.stage2ISP, rocketSpecs.dragCoefficient, true);
      
      // Minimum mass constraint
      state.mass = Math.max(state.mass * 0.1, state.mass);
    }
    
    // Coast phase after stage 2 burnout
    console.log('Starting coast phase...');
    const maxCoastTime = 3600; // Maximum 1 hour coast
    const coastEndTime = state.time + maxCoastTime;
    
    while (state.time <= coastEndTime && state.altitude >= 0 && state.velocity > -100) {
      const gravity = getGravity(state.altitude);
      const dragForce = getDragForce(Math.abs(state.velocity), state.altitude, rocketSpecs.dragCoefficient);
      
      // Apply drag in opposite direction of velocity
      const dragAcceleration = state.velocity > 0 ? -dragForce / state.mass : dragForce / state.mass;
      const acceleration = -gravity + dragAcceleration;
      
      const point: TrajectoryPoint = {
        time: state.time,
        altitude: Math.max(0, state.altitude),
        velocity: state.velocity,
        acceleration,
        thrust: 0,
        mass: state.mass,
        x: state.time * state.velocity * 0.01,
        y: state.altitude,
        z: state.altitude,
        stage: 2
      };
      
      trajectoryData.push(point);
      stage2TrajectoryData.push(point);
      
      // RK4 integration step with no thrust
      state = rk4Step(state, dt, 0, rocketSpecs.stage2ISP, rocketSpecs.dragCoefficient, false);
      
      // Break if we've reached target altitude or are falling back to Earth
      if (state.altitude >= targetAltitude || (state.altitude < 50000 && state.velocity < 0)) {
        break;
      }
    }
    
    console.log(`Final state: t=${state.time}s, altitude=${state.altitude/1000}km, velocity=${state.velocity}m/s`);
    
    return { trajectoryData, stage1TrajectoryData, stage2TrajectoryData };
  }, []);

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
    
    // Calculate orbital velocity at target altitude (circular orbit)
    const orbitalRadius = EARTH_RADIUS + targetAltitude;
    const requiredVelocity = Math.sqrt(G * EARTH_MASS / orbitalRadius);
    
    // Launch angle optimization (gravity turn approximation)
    const launchAngle = Math.atan2(targetAltitude, Math.PI * EARTH_RADIUS / 4) * 180 / Math.PI;
    
    // Find final velocity achieved
    const finalPoint = trajectoryData[trajectoryData.length - 1];
    const velocityDeficit = requiredVelocity - finalPoint.velocity;
    
    console.log(`Required orbital velocity: ${requiredVelocity.toFixed(2)} m/s`);
    console.log(`Final velocity achieved: ${finalPoint.velocity.toFixed(2)} m/s`);
    console.log(`Velocity deficit: ${velocityDeficit.toFixed(2)} m/s`);
    
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
    setError(null);

    try {
      // Simulate processing time for realistic feel
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('Starting rocket simulation with parameters:', params);
      
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
      console.log('Simulation completed successfully');
    } catch (err) {
      console.error('Simulation error:', err);
      setError(err instanceof Error ? err.message : 'Simulation failed');
      setSimulation(null);
    } finally {
      setIsRunning(false);
    }
  }, [generateTrajectoryData, generatePlotData, calculateOptimalParameters]);

  return {
    simulation,
    isRunning,
    error,
    runSimulation
  };
};