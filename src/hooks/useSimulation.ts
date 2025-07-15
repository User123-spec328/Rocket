import { useState, useCallback } from 'react';
import { LaunchParameters, SimulationResult, TrajectoryPoint, PlotData, OptimalParameters } from '../types/rocket';

// Physical constants (exact values used in aerospace industry)
const G = 6.67430e-11; // Gravitational constant (m³/kg/s²)
const EARTH_MASS = 5.972e24; // Earth mass (kg)
const EARTH_RADIUS = 6371000; // Earth radius (m)
const STANDARD_GRAVITY = 9.80665; // Standard gravity (m/s²)
const AIR_DENSITY_SEA_LEVEL = 1.225; // Sea level air density (kg/m³)
const SCALE_HEIGHT = 8400; // Atmospheric scale height (m)
const REFERENCE_AREA = 10; // Reference area for drag calculation (m²)

// State vector for RK4 integration
interface StateVector {
  altitude: number;    // m
  velocity: number;    // m/s
  mass: number;        // kg
  downrange: number;   // m (horizontal distance)
  flightPathAngle: number; // radians
}

// Derivative vector for RK4
interface DerivativeVector {
  dAltitude: number;
  dVelocity: number;
  dMass: number;
  dDownrange: number;
  dFlightPathAngle: number;
}

// Atmospheric density model (exponential decay)
const getAtmosphericDensity = (altitude: number): number => {
  if (altitude < 0) return AIR_DENSITY_SEA_LEVEL;
  if (altitude > 100000) return 0; // Above Karman line
  return AIR_DENSITY_SEA_LEVEL * Math.exp(-altitude / SCALE_HEIGHT);
};

// Gravity at altitude (inverse square law)
const getGravityAtAltitude = (altitude: number): number => {
  const r = EARTH_RADIUS + altitude;
  return G * EARTH_MASS / (r * r);
};

// Drag force calculation
const getDragForce = (velocity: number, altitude: number, dragCoeff: number): number => {
  const density = getAtmosphericDensity(altitude);
  return 0.5 * density * velocity * velocity * dragCoeff * REFERENCE_AREA;
};

// Improved gravity turn profile
const getGravityTurnAngle = (time: number, altitude: number, velocity: number): number => {
  // Initial vertical ascent for first 10 seconds
  if (time < 10) return Math.PI / 2; // 90 degrees (vertical)
  
  // Gradual pitch-over starting at 10 seconds
  if (time < 50) {
    const progress = (time - 10) / 40;
    return (Math.PI / 2) * (1 - 0.3 * progress); // Pitch from 90° to 63°
  }
  
  // Continue gradual turn based on altitude and velocity
  if (altitude < 30000) {
    return Math.PI / 3; // 60 degrees
  } else if (altitude < 60000) {
    return Math.PI / 4; // 45 degrees
  } else if (altitude < 100000) {
    return Math.PI / 6; // 30 degrees
  } else {
    return Math.PI / 12; // 15 degrees (nearly horizontal)
  }
};

// Calculate derivatives for RK4 integration - FIXED VERSION
const calculateDerivatives = (
  state: StateVector,
  time: number,
  thrust: number,
  isp: number,
  dragCoeff: number,
  isEngineOn: boolean
): DerivativeVector => {
  const { altitude, velocity, mass, flightPathAngle } = state;
  
  // Ensure valid state values
  if (mass <= 0 || isNaN(mass)) {
    console.error('Invalid mass in derivatives:', mass);
    return { dAltitude: 0, dVelocity: 0, dMass: 0, dDownrange: 0, dFlightPathAngle: 0 };
  }
  
  // Gravity at current altitude
  const gravity = getGravityAtAltitude(altitude);
  
  // Atmospheric drag (only if moving)
  const dragForce = Math.abs(velocity) > 0.1 ? getDragForce(Math.abs(velocity), altitude, dragCoeff) : 0;
  const dragAcceleration = velocity > 0 ? -dragForce / mass : dragForce / mass;
  
  // Mass flow rate (from rocket equation)
  const massFlowRate = isEngineOn && thrust > 0 ? thrust / (isp * STANDARD_GRAVITY) : 0;
  
  // Thrust acceleration
  const thrustAcceleration = isEngineOn && thrust > 0 ? thrust / mass : 0;
  
  // Velocity components
  const verticalVelocity = velocity * Math.sin(flightPathAngle);
  const horizontalVelocity = velocity * Math.cos(flightPathAngle);
  
  // Acceleration components
  const thrustVertical = thrustAcceleration * Math.sin(flightPathAngle);
  const thrustHorizontal = thrustAcceleration * Math.cos(flightPathAngle);
  
  const dragVertical = dragAcceleration * Math.sin(flightPathAngle);
  const dragHorizontal = dragAcceleration * Math.cos(flightPathAngle);
  
  // Net accelerations
  const verticalAcceleration = thrustVertical - gravity + dragVertical;
  const horizontalAcceleration = thrustHorizontal + dragHorizontal;
  
  // Total acceleration magnitude
  const totalAcceleration = Math.sqrt(verticalAcceleration * verticalAcceleration + horizontalAcceleration * horizontalAcceleration);
  
  // Flight path angle change rate (gravity turn effect)
  let flightPathAngleRate = 0;
  if (Math.abs(velocity) > 1.0) { // Only change angle if moving significantly
    flightPathAngleRate = -gravity * Math.cos(flightPathAngle) / Math.abs(velocity);
    // Limit the rate of change to prevent instability
    flightPathAngleRate = Math.max(-0.1, Math.min(0.1, flightPathAngleRate));
  }
  
  return {
    dAltitude: verticalVelocity,
    dVelocity: totalAcceleration,
    dMass: -massFlowRate,
    dDownrange: horizontalVelocity,
    dFlightPathAngle: flightPathAngleRate
  };
};

// 4th Order Runge-Kutta integration step - IMPROVED VERSION
const rk4Step = (
  state: StateVector,
  time: number,
  dt: number,
  thrust: number,
  isp: number,
  dragCoeff: number,
  isEngineOn: boolean
): StateVector => {
  // Validate inputs
  if (state.mass <= 0 || isNaN(state.mass)) {
    console.error('Invalid state in RK4:', state);
    return state;
  }
  
  // Calculate k1
  const k1 = calculateDerivatives(state, time, thrust, isp, dragCoeff, isEngineOn);
  
  // Calculate k2
  const state2: StateVector = {
    altitude: state.altitude + 0.5 * dt * k1.dAltitude,
    velocity: state.velocity + 0.5 * dt * k1.dVelocity,
    mass: Math.max(state.mass + 0.5 * dt * k1.dMass, 1000), // Prevent negative mass
    downrange: state.downrange + 0.5 * dt * k1.dDownrange,
    flightPathAngle: state.flightPathAngle + 0.5 * dt * k1.dFlightPathAngle
  };
  const k2 = calculateDerivatives(state2, time + 0.5 * dt, thrust, isp, dragCoeff, isEngineOn);
  
  // Calculate k3
  const state3: StateVector = {
    altitude: state.altitude + 0.5 * dt * k2.dAltitude,
    velocity: state.velocity + 0.5 * dt * k2.dVelocity,
    mass: Math.max(state.mass + 0.5 * dt * k2.dMass, 1000),
    downrange: state.downrange + 0.5 * dt * k2.dDownrange,
    flightPathAngle: state.flightPathAngle + 0.5 * dt * k2.dFlightPathAngle
  };
  const k3 = calculateDerivatives(state3, time + 0.5 * dt, thrust, isp, dragCoeff, isEngineOn);
  
  // Calculate k4
  const state4: StateVector = {
    altitude: state.altitude + dt * k3.dAltitude,
    velocity: state.velocity + dt * k3.dVelocity,
    mass: Math.max(state.mass + dt * k3.dMass, 1000),
    downrange: state.downrange + dt * k3.dDownrange,
    flightPathAngle: state.flightPathAngle + dt * k3.dFlightPathAngle
  };
  const k4 = calculateDerivatives(state4, time + dt, thrust, isp, dragCoeff, isEngineOn);
  
  // Combine using RK4 formula with validation
  const newState: StateVector = {
    altitude: Math.max(0, state.altitude + (dt / 6) * (k1.dAltitude + 2 * k2.dAltitude + 2 * k3.dAltitude + k4.dAltitude)),
    velocity: state.velocity + (dt / 6) * (k1.dVelocity + 2 * k2.dVelocity + 2 * k3.dVelocity + k4.dVelocity),
    mass: Math.max(1000, state.mass + (dt / 6) * (k1.dMass + 2 * k2.dMass + 2 * k3.dMass + k4.dMass)),
    downrange: state.downrange + (dt / 6) * (k1.dDownrange + 2 * k2.dDownrange + 2 * k3.dDownrange + k4.dDownrange),
    flightPathAngle: Math.max(-Math.PI/2, Math.min(Math.PI/2, state.flightPathAngle + (dt / 6) * (k1.dFlightPathAngle + 2 * k2.dFlightPathAngle + 2 * k3.dFlightPathAngle + k4.dFlightPathAngle)))
  };
  
  // Validate output
  if (isNaN(newState.velocity) || isNaN(newState.altitude) || isNaN(newState.mass)) {
    console.error('NaN detected in RK4 output:', newState);
    return state; // Return previous state if calculation failed
  }
  
  return newState;
};

export const useSimulation = () => {
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSimulation = useCallback(async (params: LaunchParameters) => {
    setIsRunning(true);
    setSimulation(null);
    setError(null);

    try {
      console.log('Starting professional rocket simulation...');
      console.log('Input parameters:', params);
      
      // Add realistic delay for UX
      await new Promise(resolve => setTimeout(resolve, 1000));

      const { rocketSpecs, orbitHeight } = params;
      const targetAltitude = orbitHeight * 1000; // Convert km to meters
      
      // Calculate required orbital velocity
      const orbitalRadius = EARTH_RADIUS + targetAltitude;
      const requiredOrbitalVelocity = Math.sqrt(G * EARTH_MASS / orbitalRadius);
      
      console.log(`Target altitude: ${targetAltitude/1000}km`);
      console.log(`Required orbital velocity: ${requiredOrbitalVelocity.toFixed(2)} m/s`);
      console.log(`Rocket specs:`, rocketSpecs);
      
      // Simulation parameters
      const dt = 0.5; // Time step (seconds) - balanced for accuracy and performance
      const maxSimulationTime = 1000; // Maximum simulation time (seconds)
      
      // Initialize state vector with validation
      let state: StateVector = {
        altitude: 0,
        velocity: 0,
        mass: rocketSpecs.mass,
        downrange: 0,
        flightPathAngle: Math.PI / 2 // Start vertical
      };
      
      // Validate initial state
      if (state.mass <= 0 || isNaN(state.mass)) {
        throw new Error(`Invalid initial mass: ${state.mass}`);
      }
      
      let time = 0;
      const trajectoryData: TrajectoryPoint[] = [];
      let separationTime = 0;
      let separationAltitude = 0;
      
      console.log('Initial state:', state);
      console.log(`Stage 1 burn time: ${rocketSpecs.stage1BurnTime}s`);
      console.log(`Stage 1 thrust: ${rocketSpecs.stage1Thrust}N`);
      console.log(`Stage 1 ISP: ${rocketSpecs.stage1ISP}s`);
      
      // Stage 1 simulation - FIXED LOOP
      console.log('Stage 1 ignition...');
      let stepCount = 0;
      const maxSteps = Math.ceil(rocketSpecs.stage1BurnTime / dt) + 100; // Safety margin
      
      while (time < rocketSpecs.stage1BurnTime && state.altitude >= 0 && time < maxSimulationTime && stepCount < maxSteps) {
        // Update flight path angle for gravity turn
        state.flightPathAngle = getGravityTurnAngle(time, state.altitude, state.velocity);
        
        // Calculate current acceleration for logging
        const gravity = getGravityAtAltitude(state.altitude);
        const dragForce = getDragForce(Math.abs(state.velocity), state.altitude, rocketSpecs.dragCoefficient);
        const thrustAcceleration = rocketSpecs.stage1Thrust / state.mass;
        const dragAcceleration = dragForce / state.mass;
        const netAcceleration = thrustAcceleration - gravity - dragAcceleration;
        
        // Store trajectory point BEFORE integration step
        trajectoryData.push({
          time: parseFloat(time.toFixed(2)),
          altitude: Math.max(0, state.altitude),
          velocity: state.velocity,
          acceleration: netAcceleration,
          thrust: rocketSpecs.stage1Thrust,
          mass: state.mass,
          x: state.downrange,
          y: state.altitude,
          z: state.altitude,
          stage: 1
        });
        
        // RK4 integration step
        const newState = rk4Step(
          state,
          time,
          dt,
          rocketSpecs.stage1Thrust,
          rocketSpecs.stage1ISP,
          rocketSpecs.dragCoefficient,
          true
        );
        
        // Validate new state
        if (isNaN(newState.velocity) || isNaN(newState.altitude) || isNaN(newState.mass)) {
          console.error('NaN detected at time:', time, 'state:', newState);
          break;
        }
        
        state = newState;
        time += dt;
        stepCount++;
        
        // Debug logging every 10 seconds
        if (stepCount % Math.ceil(10 / dt) === 0) {
          console.log(`t=${time.toFixed(1)}s: alt=${(state.altitude/1000).toFixed(2)}km, vel=${state.velocity.toFixed(1)}m/s, mass=${(state.mass/1000).toFixed(1)}t`);
        }
      }
      
      // Stage separation
      separationTime = time;
      separationAltitude = state.altitude;
      console.log(`Stage separation at t=${separationTime.toFixed(1)}s, altitude=${(separationAltitude/1000).toFixed(2)}km, velocity=${state.velocity.toFixed(2)}m/s`);
      
      // Update mass for stage 2
      state.mass = rocketSpecs.stageSeparationMass;
      
      console.log(`Stage 2 burn time: ${rocketSpecs.stage2BurnTime}s`);
      console.log(`Stage 2 thrust: ${rocketSpecs.stage2Thrust}N`);
      console.log(`Stage 2 ISP: ${rocketSpecs.stage2ISP}s`);
      console.log(`Stage 2 initial mass: ${state.mass}kg`);
      
      // Stage 2 simulation - FIXED LOOP
      console.log('Stage 2 ignition...');
      const stage2EndTime = separationTime + rocketSpecs.stage2BurnTime;
      stepCount = 0;
      const maxSteps2 = Math.ceil(rocketSpecs.stage2BurnTime / dt) + 100;
      
      while (time < stage2EndTime && state.altitude >= 0 && time < maxSimulationTime && stepCount < maxSteps2) {
        // Continue gravity turn
        state.flightPathAngle = getGravityTurnAngle(time, state.altitude, state.velocity);
        
        // Calculate current acceleration
        const gravity = getGravityAtAltitude(state.altitude);
        const dragForce = getDragForce(Math.abs(state.velocity), state.altitude, rocketSpecs.dragCoefficient);
        const thrustAcceleration = rocketSpecs.stage2Thrust / state.mass;
        const dragAcceleration = dragForce / state.mass;
        const netAcceleration = thrustAcceleration - gravity - dragAcceleration;
        
        trajectoryData.push({
          time: parseFloat(time.toFixed(2)),
          altitude: Math.max(0, state.altitude),
          velocity: state.velocity,
          acceleration: netAcceleration,
          thrust: rocketSpecs.stage2Thrust,
          mass: state.mass,
          x: state.downrange,
          y: state.altitude,
          z: state.altitude,
          stage: 2
        });
        
        // RK4 integration step
        const newState = rk4Step(
          state,
          time,
          dt,
          rocketSpecs.stage2Thrust,
          rocketSpecs.stage2ISP,
          rocketSpecs.dragCoefficient,
          true
        );
        
        // Validate new state
        if (isNaN(newState.velocity) || isNaN(newState.altitude) || isNaN(newState.mass)) {
          console.error('Stage 2 NaN detected at time:', time, 'state:', newState);
          break;
        }
        
        state = newState;
        time += dt;
        stepCount++;
        
        // Debug logging every 20 seconds
        if (stepCount % Math.ceil(20 / dt) === 0) {
          console.log(`Stage 2 t=${time.toFixed(1)}s: alt=${(state.altitude/1000).toFixed(2)}km, vel=${state.velocity.toFixed(1)}m/s, mass=${(state.mass/1000).toFixed(1)}t`);
        }
      }
      
      // Coast phase (engines off) - continue for a short period
      console.log('Coast phase...');
      const coastEndTime = time + 60; // 1 minute coast
      stepCount = 0;
      const maxStepsCoast = Math.ceil(60 / dt) + 10;
      
      while (time < coastEndTime && state.altitude >= 0 && stepCount < maxStepsCoast) {
        // Calculate current acceleration (no thrust)
        const gravity = getGravityAtAltitude(state.altitude);
        const dragForce = getDragForce(Math.abs(state.velocity), state.altitude, rocketSpecs.dragCoefficient);
        const dragAcceleration = state.velocity > 0 ? -dragForce / state.mass : dragForce / state.mass;
        const netAcceleration = -gravity + dragAcceleration;
        
        trajectoryData.push({
          time: parseFloat(time.toFixed(2)),
          altitude: Math.max(0, state.altitude),
          velocity: state.velocity,
          acceleration: netAcceleration,
          thrust: 0,
          mass: state.mass,
          x: state.downrange,
          y: state.altitude,
          z: state.altitude,
          stage: 2
        });
        
        // RK4 integration step (no thrust)
        const newState = rk4Step(
          state,
          time,
          dt,
          0,
          rocketSpecs.stage2ISP,
          rocketSpecs.dragCoefficient,
          false
        );
        
        if (isNaN(newState.velocity) || isNaN(newState.altitude) || isNaN(newState.mass)) {
          console.error('Coast phase NaN detected at time:', time, 'state:', newState);
          break;
        }
        
        state = newState;
        time += dt;
        stepCount++;
      }
      
      const finalVelocity = state.velocity;
      const finalAltitude = state.altitude;
      const totalFlightTime = time;
      
      console.log(`Simulation complete:`);
      console.log(`Final altitude: ${(finalAltitude/1000).toFixed(2)}km`);
      console.log(`Final velocity: ${finalVelocity.toFixed(2)}m/s`);
      console.log(`Required orbital velocity: ${requiredOrbitalVelocity.toFixed(2)}m/s`);
      console.log(`Velocity achievement: ${((finalVelocity/requiredOrbitalVelocity)*100).toFixed(1)}%`);
      console.log(`Total flight time: ${totalFlightTime.toFixed(1)}s`);
      console.log(`Total trajectory points: ${trajectoryData.length}`);
      
      // Validate trajectory data
      if (trajectoryData.length === 0) {
        throw new Error('No trajectory data generated');
      }
      
      // Generate plot data with validation
      const plots: PlotData = {
        altitude: trajectoryData.map(p => ({ time: p.time, value: p.altitude, stage: p.stage })),
        velocity: trajectoryData.map(p => ({ time: p.time, value: p.velocity, stage: p.stage })),
        acceleration: trajectoryData.map(p => ({ time: p.time, value: p.acceleration, stage: p.stage })),
        thrust: trajectoryData.map(p => ({ time: p.time, value: p.thrust, stage: p.stage })),
        mass: trajectoryData.map(p => ({ time: p.time, value: p.mass, stage: p.stage })),
        stage1Trajectory: trajectoryData.filter(p => p.stage === 1).map(p => ({ time: p.time, value: p.altitude })),
        stage2Trajectory: trajectoryData.filter(p => p.stage === 2).map(p => ({ time: p.time, value: p.altitude }))
      };
      
      // Calculate performance metrics with validation
      const maxAltitudePoint = trajectoryData.reduce((max, point) => 
        point.altitude > max.altitude ? point : max
      );
      
      const launchAngle = state.downrange > 0 ? Math.atan2(targetAltitude, state.downrange) * 180 / Math.PI : 45;
      
      const optimalParams: OptimalParameters = {
        requiredVelocity: requiredOrbitalVelocity,
        launchAngle: isNaN(launchAngle) ? 45 : launchAngle,
        stage1OptimalBurnTime: rocketSpecs.stage1BurnTime,
        stage2OptimalBurnTime: rocketSpecs.stage2BurnTime,
        maxAltitude: maxAltitudePoint.altitude,
        totalFlightTime,
        stageSeparationTime: separationTime,
        stageSeparationAltitude: separationAltitude
      };
      
      const result: SimulationResult = {
        id: Date.now().toString(),
        status: 'completed',
        trajectoryData,
        stage1TrajectoryData: trajectoryData.filter(p => p.stage === 1),
        stage2TrajectoryData: trajectoryData.filter(p => p.stage === 2),
        plots,
        optimalParams,
        timestamp: new Date()
      };
      
      setSimulation(result);
      console.log('Professional simulation completed successfully');
      
    } catch (err) {
      console.error('Simulation error:', err);
      setError(err instanceof Error ? err.message : 'Professional simulation failed');
    } finally {
      setIsRunning(false);
    }
  }, []);

  return {
    simulation,
    isRunning,
    error,
    runSimulation
  };
};