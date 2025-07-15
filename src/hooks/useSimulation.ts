import { useState, useCallback } from 'react';
import { LaunchParameters, SimulationResult, TrajectoryPoint, PlotData, OptimalParameters } from '../types/rocket';

// Physics constants
const GRAVITY_SEA_LEVEL = 9.80665; // m/s²
const EARTH_RADIUS = 6371000; // meters
const EARTH_MASS = 5.972e24; // kg
const G = 6.67430e-11; // m³/kg/s²
const AIR_DENSITY_SEA_LEVEL = 1.225; // kg/m³
const SCALE_HEIGHT = 8400; // meters
const DRAG_AREA = 10; // m²

// Atmospheric density model
const getAtmosphericDensity = (altitude: number): number => {
  if (altitude < 0) return AIR_DENSITY_SEA_LEVEL;
  if (altitude > 100000) return 0;
  return AIR_DENSITY_SEA_LEVEL * Math.exp(-altitude / SCALE_HEIGHT);
};

// Gravity at altitude
const getGravity = (altitude: number): number => {
  const r = EARTH_RADIUS + altitude;
  return G * EARTH_MASS / (r * r);
};

// Drag force
const getDragForce = (velocity: number, altitude: number, dragCoeff: number): number => {
  const density = getAtmosphericDensity(altitude);
  return 0.5 * density * velocity * velocity * dragCoeff * DRAG_AREA;
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
      // Add delay for UX
      await new Promise(resolve => setTimeout(resolve, 1500));

      const { rocketSpecs, orbitHeight } = params;
      const targetAltitude = orbitHeight * 1000; // Convert km to meters
      const dt = 1.0; // Time step in seconds
      
      const trajectoryData: TrajectoryPoint[] = [];
      
      // Initial conditions
      let time = 0;
      let altitude = 0;
      let velocity = 0;
      let mass = rocketSpecs.mass;
      let stage = 1;
      
      // Stage 1 simulation
      console.log('Starting Stage 1...');
      while (time <= rocketSpecs.stage1BurnTime && altitude >= 0) {
        const gravity = getGravity(altitude);
        const dragForce = getDragForce(velocity, altitude, rocketSpecs.dragCoefficient);
        const massFlowRate = rocketSpecs.stage1Thrust / (rocketSpecs.stage1ISP * GRAVITY_SEA_LEVEL);
        
        // Net acceleration
        const netForce = rocketSpecs.stage1Thrust - mass * gravity - dragForce;
        const acceleration = netForce / mass;
        
        // Store trajectory point
        trajectoryData.push({
          time,
          altitude: Math.max(0, altitude),
          velocity,
          acceleration,
          thrust: rocketSpecs.stage1Thrust,
          mass,
          x: time * velocity * 0.01,
          y: altitude,
          z: altitude,
          stage: 1
        });
        
        // Update state using simple Euler integration for stability
        velocity += acceleration * dt;
        altitude += velocity * dt;
        mass = Math.max(rocketSpecs.stageSeparationMass, mass - massFlowRate * dt);
        time += dt;
      }
      
      // Stage separation
      console.log(`Stage separation at t=${time}s, altitude=${(altitude/1000).toFixed(2)}km`);
      mass = rocketSpecs.stageSeparationMass;
      stage = 2;
      
      // Stage 2 simulation - target specific altitude
      const stage2EndTime = time + rocketSpecs.stage2BurnTime;
      while (time <= stage2EndTime && altitude >= 0) {
        const gravity = getGravity(altitude);
        const dragForce = getDragForce(velocity, altitude, rocketSpecs.dragCoefficient);
        const massFlowRate = rocketSpecs.stage2Thrust / (rocketSpecs.stage2ISP * GRAVITY_SEA_LEVEL);
        
        // Throttle control to approach target altitude
        let thrustMultiplier = 1.0;
        if (altitude > targetAltitude * 0.8) {
          thrustMultiplier = Math.max(0.3, 1.0 - (altitude - targetAltitude * 0.8) / (targetAltitude * 0.2));
        }
        
        const effectiveThrust = rocketSpecs.stage2Thrust * thrustMultiplier;
        const netForce = effectiveThrust - mass * gravity - dragForce;
        const acceleration = netForce / mass;
        
        trajectoryData.push({
          time,
          altitude: Math.max(0, altitude),
          velocity,
          acceleration,
          thrust: effectiveThrust,
          mass,
          x: time * velocity * 0.01,
          y: altitude,
          z: altitude,
          stage: 2
        });
        
        // Update state
        velocity += acceleration * dt;
        altitude += velocity * dt;
        mass = Math.max(mass * 0.1, mass - massFlowRate * thrustMultiplier * dt);
        time += dt;
        
        // Stop if we've reached target altitude
        if (altitude >= targetAltitude && velocity > 0) {
          console.log(`Target altitude reached at t=${time}s`);
          break;
        }
      }
      
      // Short coast phase
      const coastEndTime = time + 300; // 5 minutes coast
      while (time <= coastEndTime && altitude >= 0 && altitude <= targetAltitude * 1.5) {
        const gravity = getGravity(altitude);
        const dragForce = getDragForce(Math.abs(velocity), altitude, rocketSpecs.dragCoefficient);
        const dragAcceleration = velocity > 0 ? -dragForce / mass : dragForce / mass;
        const acceleration = -gravity + dragAcceleration;
        
        trajectoryData.push({
          time,
          altitude: Math.max(0, altitude),
          velocity,
          acceleration,
          thrust: 0,
          mass,
          x: time * velocity * 0.01,
          y: altitude,
          z: altitude,
          stage: 2
        });
        
        velocity += acceleration * dt;
        altitude += velocity * dt;
        time += dt;
        
        // Break if falling back to Earth
        if (altitude < targetAltitude * 0.5 && velocity < 0) break;
      }
      
      console.log(`Simulation complete: Final altitude=${(altitude/1000).toFixed(2)}km, velocity=${velocity.toFixed(2)}m/s`);
      
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
      
      // Calculate optimal parameters
      const maxAltitudePoint = trajectoryData.reduce((max, point) => 
        point.altitude > max.altitude ? point : max
      );
      
      const separationPoint = trajectoryData.find(point => point.stage === 2);
      const finalPoint = trajectoryData[trajectoryData.length - 1];
      
      const orbitalRadius = EARTH_RADIUS + targetAltitude;
      const requiredVelocity = Math.sqrt(G * EARTH_MASS / orbitalRadius);
      
      const optimalParams: OptimalParameters = {
        requiredVelocity,
        launchAngle: Math.atan2(targetAltitude, Math.PI * EARTH_RADIUS / 4) * 180 / Math.PI,
        stage1OptimalBurnTime: rocketSpecs.stage1BurnTime,
        stage2OptimalBurnTime: rocketSpecs.stage2BurnTime,
        maxAltitude: maxAltitudePoint.altitude,
        totalFlightTime: finalPoint.time,
        stageSeparationTime: separationPoint?.time || rocketSpecs.stage1BurnTime,
        stageSeparationAltitude: separationPoint?.altitude || 0
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
      console.log('Simulation result set successfully');
      
    } catch (err) {
      console.error('Simulation error:', err);
      setError(err instanceof Error ? err.message : 'Simulation failed');
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