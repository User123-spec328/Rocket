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

// Gravity turn profile (realistic launch trajectory)
const getGravityTurnAngle = (time: number, altitude: number): number => {
  // Initial vertical ascent for first 10 seconds
  if (time < 10) return Math.PI / 2; // 90 degrees (vertical)
  
  // Gradual pitch-over starting at 10 seconds
  const pitchOverStart = 10;
  const pitchOverEnd = 150;
  
  if (time < pitchOverEnd) {
    const progress = (time - pitchOverStart) / (pitchOverEnd - pitchOverStart);
    // Smooth transition from 90° to 45° over pitch-over period
    return (Math.PI / 2) * (1 - 0.5 * progress);
  }
  
  // Continue gradual turn based on altitude
  if (altitude < 50000) {
    return Math.PI / 4; // 45 degrees
  } else if (altitude < 100000) {
    return Math.PI / 6; // 30 degrees
  } else {
    return Math.PI / 12; // 15 degrees (nearly horizontal)
  }
};

// Calculate derivatives for RK4 integration
const calculateDerivatives = (
  state: StateVector,
  time: number,
  thrust: number,
  isp: number,
  dragCoeff: number,
  isEngineOn: boolean
): DerivativeVector => {
  const { altitude, velocity, mass, flightPathAngle } = state;
  
  // Gravity at current altitude
  const gravity = getGravityAtAltitude(altitude);
  
  // Atmospheric drag
  const dragForce = getDragForce(Math.abs(velocity), altitude, dragCoeff);
  const dragAcceleration = velocity > 0 ? -dragForce / mass : dragForce / mass;
  
  // Mass flow rate (from rocket equation)
  const massFlowRate = isEngineOn ? thrust / (isp * STANDARD_GRAVITY) : 0;
  
  // Thrust acceleration
  const thrustAcceleration = isEngineOn ? thrust / mass : 0;
  
  // Net acceleration components
  const verticalAcceleration = thrustAcceleration * Math.sin(flightPathAngle) - gravity + dragAcceleration * Math.sin(flightPathAngle);
  const horizontalAcceleration = thrustAcceleration * Math.cos(flightPathAngle) + dragAcceleration * Math.cos(flightPathAngle);
  
  // Total acceleration
  const totalAcceleration = Math.sqrt(verticalAcceleration * verticalAcceleration + horizontalAcceleration * horizontalAcceleration);
  
  // Flight path angle change (gravity turn effect)
  const flightPathAngleRate = -gravity * Math.cos(flightPathAngle) / velocity;
  
  return {
    dAltitude: velocity * Math.sin(flightPathAngle),
    dVelocity: totalAcceleration,
    dMass: -massFlowRate,
    dDownrange: velocity * Math.cos(flightPathAngle),
    dFlightPathAngle: isNaN(flightPathAngleRate) ? 0 : flightPathAngleRate
  };
};

// 4th Order Runge-Kutta integration step
const rk4Step = (
  state: StateVector,
  time: number,
  dt: number,
  thrust: number,
  isp: number,
  dragCoeff: number,
  isEngineOn: boolean
): StateVector => {
  // Calculate k1
  const k1 = calculateDerivatives(state, time, thrust, isp, dragCoeff, isEngineOn);
  
  // Calculate k2
  const state2: StateVector = {
    altitude: state.altitude + 0.5 * dt * k1.dAltitude,
    velocity: state.velocity + 0.5 * dt * k1.dVelocity,
    mass: state.mass + 0.5 * dt * k1.dMass,
    downrange: state.downrange + 0.5 * dt * k1.dDownrange,
    flightPathAngle: state.flightPathAngle + 0.5 * dt * k1.dFlightPathAngle
  };
  const k2 = calculateDerivatives(state2, time + 0.5 * dt, thrust, isp, dragCoeff, isEngineOn);
  
  // Calculate k3
  const state3: StateVector = {
    altitude: state.altitude + 0.5 * dt * k2.dAltitude,
    velocity: state.velocity + 0.5 * dt * k2.dVelocity,
    mass: state.mass + 0.5 * dt * k2.dMass,
    downrange: state.downrange + 0.5 * dt * k2.dDownrange,
    flightPathAngle: state.flightPathAngle + 0.5 * dt * k2.dFlightPathAngle
  };
  const k3 = calculateDerivatives(state3, time + 0.5 * dt, thrust, isp, dragCoeff, isEngineOn);
  
  // Calculate k4
  const state4: StateVector = {
    altitude: state.altitude + dt * k3.dAltitude,
    velocity: state.velocity + dt * k3.dVelocity,
    mass: state.mass + dt * k3.dMass,
    downrange: state.downrange + dt * k3.dDownrange,
    flightPathAngle: state.flightPathAngle + dt * k3.dFlightPathAngle
  };
  const k4 = calculateDerivatives(state4, time + dt, thrust, isp, dragCoeff, isEngineOn);
  
  // Combine using RK4 formula
  return {
    altitude: state.altitude + (dt / 6) * (k1.dAltitude + 2 * k2.dAltitude + 2 * k3.dAltitude + k4.dAltitude),
    velocity: state.velocity + (dt / 6) * (k1.dVelocity + 2 * k2.dVelocity + 2 * k3.dVelocity + k4.dVelocity),
    mass: Math.max(state.mass + (dt / 6) * (k1.dMass + 2 * k2.dMass + 2 * k3.dMass + k4.dMass), 1000), // Minimum dry mass
    downrange: state.downrange + (dt / 6) * (k1.dDownrange + 2 * k2.dDownrange + 2 * k3.dDownrange + k4.dDownrange),
    flightPathAngle: state.flightPathAngle + (dt / 6) * (k1.dFlightPathAngle + 2 * k2.dFlightPathAngle + 2 * k3.dFlightPathAngle + k4.dFlightPathAngle)
  };
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
      
      // Add realistic delay for UX
      await new Promise(resolve => setTimeout(resolve, 2000));

      const { rocketSpecs, orbitHeight } = params;
      const targetAltitude = orbitHeight * 1000; // Convert km to meters
      
      // Calculate required orbital velocity
      const orbitalRadius = EARTH_RADIUS + targetAltitude;
      const requiredOrbitalVelocity = Math.sqrt(G * EARTH_MASS / orbitalRadius);
      
      console.log(`Target altitude: ${targetAltitude/1000}km`);
      console.log(`Required orbital velocity: ${requiredOrbitalVelocity.toFixed(2)} m/s`);
      
      // Simulation parameters
      const dt = 0.1; // Time step (seconds) - small for accuracy
      const maxSimulationTime = 2000; // Maximum simulation time (seconds)
      
      // Initialize state vector
      let state: StateVector = {
        altitude: 0,
        velocity: 0,
        mass: rocketSpecs.mass,
        downrange: 0,
        flightPathAngle: Math.PI / 2 // Start vertical
      };
      
      let time = 0;
      let stage = 1;
      const trajectoryData: TrajectoryPoint[] = [];
      
      // Stage 1 simulation
      console.log('Stage 1 ignition...');
      while (time <= rocketSpecs.stage1BurnTime && state.altitude >= 0 && time < maxSimulationTime) {
        // Update flight path angle for gravity turn
        state.flightPathAngle = getGravityTurnAngle(time, state.altitude);
        
        // Calculate current acceleration for logging
        const gravity = getGravityAtAltitude(state.altitude);
        const dragForce = getDragForce(Math.abs(state.velocity), state.altitude, rocketSpecs.dragCoefficient);
        const thrustAcceleration = rocketSpecs.stage1Thrust / state.mass;
        const dragAcceleration = dragForce / state.mass;
        const netAcceleration = thrustAcceleration - gravity - dragAcceleration;
        
        // Store trajectory point
        trajectoryData.push({
          time,
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
        state = rk4Step(
          state,
          time,
          dt,
          rocketSpecs.stage1Thrust,
          rocketSpecs.stage1ISP,
          rocketSpecs.dragCoefficient,
          true
        );
        
        time += dt;
      }
      
      // Stage separation
      const separationTime = time;
      const separationAltitude = state.altitude;
      console.log(`Stage separation at t=${separationTime.toFixed(1)}s, altitude=${(separationAltitude/1000).toFixed(2)}km, velocity=${state.velocity.toFixed(2)}m/s`);
      
      // Update mass for stage 2
      state.mass = rocketSpecs.stageSeparationMass;
      stage = 2;
      
      // Stage 2 simulation
      console.log('Stage 2 ignition...');
      const stage2EndTime = time + rocketSpecs.stage2BurnTime;
      while (time <= stage2EndTime && state.altitude >= 0 && time < maxSimulationTime) {
        // Continue gravity turn
        state.flightPathAngle = getGravityTurnAngle(time, state.altitude);
        
        // Calculate current acceleration
        const gravity = getGravityAtAltitude(state.altitude);
        const dragForce = getDragForce(Math.abs(state.velocity), state.altitude, rocketSpecs.dragCoefficient);
        const thrustAcceleration = rocketSpecs.stage2Thrust / state.mass;
        const dragAcceleration = dragForce / state.mass;
        const netAcceleration = thrustAcceleration - gravity - dragAcceleration;
        
        trajectoryData.push({
          time,
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
        state = rk4Step(
          state,
          time,
          dt,
          rocketSpecs.stage2Thrust,
          rocketSpecs.stage2ISP,
          rocketSpecs.dragCoefficient,
          true
        );
        
        time += dt;
      }
      
      // Coast phase (engines off) - continue until orbital velocity or target altitude
      console.log('Coast phase...');
      const coastEndTime = time + 600; // 10 minutes coast maximum
      while (time <= coastEndTime && state.altitude >= 0 && state.velocity < requiredOrbitalVelocity * 0.95 && time < maxSimulationTime) {
        // Calculate current acceleration (no thrust)
        const gravity = getGravityAtAltitude(state.altitude);
        const dragForce = getDragForce(Math.abs(state.velocity), state.altitude, rocketSpecs.dragCoefficient);
        const dragAcceleration = state.velocity > 0 ? -dragForce / state.mass : dragForce / state.mass;
        const netAcceleration = -gravity + dragAcceleration;
        
        trajectoryData.push({
          time,
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
        state = rk4Step(
          state,
          time,
          dt,
          0,
          rocketSpecs.stage2ISP,
          rocketSpecs.dragCoefficient,
          false
        );
        
        time += dt;
        
        // Stop if we've reached target conditions
        if (state.altitude >= targetAltitude && state.velocity >= requiredOrbitalVelocity * 0.9) {
          console.log('Target orbital conditions achieved!');
          break;
        }
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
      
      // Generate plot data
      const plots: PlotData = {
        altitude: trajectoryData.map(p => ({ time: p.time, value: p.altitude, stage: p.stage })),
        velocity: trajectoryData.map(p => ({ time: p.time, value: p.velocity, stage: p.stage })),
        acceleration: trajectoryData.map(p => ({ time: p.time, value: p.acceleration, stage: p.stage })),
        thrust: trajectoryData.map(p => ({ time: p.time, value: p.thrust, stage: p.stage })),
        mass: trajectoryData.map(p => ({ time: p.time, value: p.mass, stage: p.stage })),
        stage1Trajectory: trajectoryData.filter(p => p.stage === 1).map(p => ({ time: p.time, value: p.altitude })),
        stage2Trajectory: trajectoryData.filter(p => p.stage === 2).map(p => ({ time: p.time, value: p.altitude }))
      };
      
      // Calculate performance metrics
      const maxAltitudePoint = trajectoryData.reduce((max, point) => 
        point.altitude > max.altitude ? point : max
      );
      
      const launchAngle = Math.atan2(targetAltitude, state.downrange) * 180 / Math.PI;
      
      const optimalParams: OptimalParameters = {
        requiredVelocity: requiredOrbitalVelocity,
        launchAngle,
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