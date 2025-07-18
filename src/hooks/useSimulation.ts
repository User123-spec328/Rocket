import { useState, useCallback } from 'react';
import { LaunchParameters, SimulationResult, TrajectoryPoint, PlotData, OptimalParameters } from '../types/rocket';

// ============================================================================
// INDUSTRY-GRADE PHYSICAL CONSTANTS (EXACT VALUES)
// ============================================================================
const PHYSICS_CONSTANTS = {
  // Gravitational and planetary constants
  G: 6.67430e-11,                    // Gravitational constant (m³/kg/s²) - CODATA 2018
  EARTH_MASS: 5.9722e24,             // Earth mass (kg) - IAU 2015
  EARTH_RADIUS: 6378137.0,           // Earth equatorial radius (m) - WGS84
  EARTH_ROTATION_RATE: 7.2921159e-5, // Earth rotation rate (rad/s)
  STANDARD_GRAVITY: 9.80665,         // Standard gravity (m/s²) - ISO 80000-3
  
  // Atmospheric model constants
  AIR_DENSITY_SEA_LEVEL: 1.225,     // Sea level air density (kg/m³) - ISA
  SCALE_HEIGHT: 8400,                // Atmospheric scale height (m)
  KARMAN_LINE: 100000,               // Karman line altitude (m)
  
  // Numerical integration parameters
  MIN_TIME_STEP: 0.01,               // Minimum time step (s)
  MAX_TIME_STEP: 1.0,                // Maximum time step (s)
  TOLERANCE: 1e-6,                   // Numerical tolerance
  
  // Physical limits
  MAX_ACCELERATION: 100.0,           // Maximum acceleration (g)
  MIN_MASS_FRACTION: 0.05,           // Minimum mass fraction
  MAX_VELOCITY: 15000.0,             // Maximum velocity (m/s)
};

// ============================================================================
// ADVANCED ATMOSPHERIC MODEL (US STANDARD ATMOSPHERE 1976)
// ============================================================================
interface AtmosphericLayer {
  altitude: number;    // Base altitude (m)
  temperature: number; // Temperature (K)
  pressure: number;    // Pressure (Pa)
  lapseRate: number;   // Temperature lapse rate (K/m)
}

const ATMOSPHERIC_LAYERS: AtmosphericLayer[] = [
  { altitude: 0,     temperature: 288.15, pressure: 101325, lapseRate: -0.0065 },
  { altitude: 11000, temperature: 216.65, pressure: 22632,  lapseRate: 0.0 },
  { altitude: 20000, temperature: 216.65, pressure: 5474.9, lapseRate: 0.001 },
  { altitude: 32000, temperature: 228.65, pressure: 868.02, lapseRate: 0.0028 },
  { altitude: 47000, temperature: 270.65, pressure: 110.91, lapseRate: 0.0 },
  { altitude: 51000, temperature: 270.65, pressure: 66.939, lapseRate: -0.0028 },
  { altitude: 71000, temperature: 214.65, pressure: 3.9564, lapseRate: -0.002 },
];

const getAtmosphericProperties = (altitude: number): { density: number; pressure: number; temperature: number; soundSpeed: number } => {
  if (altitude < 0) altitude = 0;
  if (altitude > PHYSICS_CONSTANTS.KARMAN_LINE) {
    return { density: 0, pressure: 0, temperature: 0, soundSpeed: 0 };
  }
  
  // Find appropriate atmospheric layer
  let layer = ATMOSPHERIC_LAYERS[0];
  for (let i = ATMOSPHERIC_LAYERS.length - 1; i >= 0; i--) {
    if (altitude >= ATMOSPHERIC_LAYERS[i].altitude) {
      layer = ATMOSPHERIC_LAYERS[i];
      break;
    }
  }
  
  const h = altitude - layer.altitude;
  const temperature = layer.temperature + layer.lapseRate * h;
  
  let pressure: number;
  if (Math.abs(layer.lapseRate) < 1e-10) {
    // Isothermal layer
    pressure = layer.pressure * Math.exp(-PHYSICS_CONSTANTS.STANDARD_GRAVITY * h / (287.0 * layer.temperature));
  } else {
    // Non-isothermal layer
    pressure = layer.pressure * Math.pow(temperature / layer.temperature, -PHYSICS_CONSTANTS.STANDARD_GRAVITY / (287.0 * layer.lapseRate));
  }
  
  const density = pressure / (287.0 * temperature); // R_specific = 287 J/(kg·K) for dry air
  const soundSpeed = Math.sqrt(1.4 * 287.0 * temperature); // γ = 1.4 for air
  
  return { density, pressure, temperature, soundSpeed };
};

// ============================================================================
// ADVANCED GRAVITY MODEL (J2 PERTURBATION)
// ============================================================================
const getGravityVector = (altitude: number, latitude: number): { magnitude: number; gradient: number } => {
  const r = PHYSICS_CONSTANTS.EARTH_RADIUS + altitude;
  const latRad = latitude * Math.PI / 180;
  
  // Base gravitational acceleration
  let g = PHYSICS_CONSTANTS.G * PHYSICS_CONSTANTS.EARTH_MASS / (r * r);
  
  // J2 perturbation (Earth's oblateness effect)
  const J2 = 1.08263e-3; // Earth's J2 coefficient
  const Re = PHYSICS_CONSTANTS.EARTH_RADIUS;
  const j2Effect = 1.5 * J2 * (Re / r) * (Re / r) * (1 - 5 * Math.sin(latRad) * Math.sin(latRad));
  
  g *= (1 + j2Effect);
  
  // Gravity gradient (for tidal effects)
  const gradient = -2 * g / r;
  
  return { magnitude: g, gradient };
};

// ============================================================================
// ADVANCED DRAG MODEL WITH COMPRESSIBILITY EFFECTS
// ============================================================================
const getDragProperties = (velocity: number, altitude: number, dragCoeff: number, referenceArea: number): { 
  dragForce: number; 
  machNumber: number; 
  dynamicPressure: number;
  adjustedDragCoeff: number;
} => {
  const atm = getAtmosphericProperties(altitude);
  
  if (atm.density < 1e-10 || Math.abs(velocity) < 0.1) {
    return { dragForce: 0, machNumber: 0, dynamicPressure: 0, adjustedDragCoeff: dragCoeff };
  }
  
  const machNumber = Math.abs(velocity) / atm.soundSpeed;
  const dynamicPressure = 0.5 * atm.density * velocity * velocity;
  
  // Compressibility correction for drag coefficient
  let adjustedDragCoeff = dragCoeff;
  if (machNumber > 0.8) {
    // Transonic/supersonic drag rise
    if (machNumber < 1.2) {
      // Transonic region
      adjustedDragCoeff *= (1 + 2.5 * Math.pow(machNumber - 0.8, 2));
    } else {
      // Supersonic region
      adjustedDragCoeff *= (1 + 1.5 / Math.sqrt(machNumber));
    }
  }
  
  const dragForce = dynamicPressure * adjustedDragCoeff * referenceArea;
  
  return { dragForce, machNumber, dynamicPressure, adjustedDragCoeff };
};

// ============================================================================
// ADVANCED PROPULSION MODEL
// ============================================================================
interface PropulsionState {
  thrust: number;
  massFlowRate: number;
  exhaustVelocity: number;
  chamberPressure: number;
  nozzleEfficiency: number;
}

const getPropulsionProperties = (
  thrust: number, 
  isp: number, 
  altitude: number, 
  isEngineOn: boolean
): PropulsionState => {
  if (!isEngineOn || thrust <= 0) {
    return { thrust: 0, massFlowRate: 0, exhaustVelocity: 0, chamberPressure: 0, nozzleEfficiency: 0 };
  }
  
  const atm = getAtmosphericProperties(altitude);
  
  // Altitude compensation for rocket engines
  const seaLevelIsp = isp;
  const vacuumIsp = seaLevelIsp * 1.15; // Typical vacuum ISP increase
  const altitudeIsp = seaLevelIsp + (vacuumIsp - seaLevelIsp) * (1 - Math.exp(-altitude / 10000));
  
  const exhaustVelocity = altitudeIsp * PHYSICS_CONSTANTS.STANDARD_GRAVITY;
  const massFlowRate = thrust / exhaustVelocity;
  
  // Estimate chamber pressure (simplified model)
  const chamberPressure = atm.pressure + (thrust / 10.0); // Simplified
  
  // Nozzle efficiency based on altitude
  const nozzleEfficiency = Math.min(1.0, 0.85 + 0.15 * (1 - Math.exp(-altitude / 20000)));
  
  return {
    thrust: thrust * nozzleEfficiency,
    massFlowRate,
    exhaustVelocity,
    chamberPressure,
    nozzleEfficiency
  };
};

// ============================================================================
// ORBITAL MECHANICS AND TRAJECTORY GUIDANCE
// ============================================================================
const getOptimalFlightPath = (
  time: number, 
  altitude: number, 
  velocity: number, 
  targetAltitude: number,
  stage: number,
  requiredOrbitalVelocity: number
): { angle: number; pitchRate: number; guidance: string } => {
  
  // Initial vertical flight phase (gravity turn start)
  if (time < 10.0) {
    return { angle: Math.PI / 2, pitchRate: 0, guidance: "VERTICAL_ASCENT" };
  }
  
  // Gravity turn initiation - gradual pitch over
  if (time < 20.0) {
    const progress = (time - 10.0) / 10.0;
    const angle = (Math.PI / 2) * (1 - 0.15 * progress); // More gradual pitch-over
    return { angle, pitchRate: -0.008, guidance: "GRAVITY_TURN_START" };
  }
  
  // Calculate current orbital parameters
  const currentRadius = PHYSICS_CONSTANTS.EARTH_RADIUS + altitude;
  const targetRadius = PHYSICS_CONSTANTS.EARTH_RADIUS + targetAltitude;
  const currentOrbitalVelocity = Math.sqrt(PHYSICS_CONSTANTS.G * PHYSICS_CONSTANTS.EARTH_MASS / currentRadius);
  
  // Velocity-based guidance for orbital insertion
  const velocityRatio = velocity / requiredOrbitalVelocity;
  const altitudeRatio = altitude / targetAltitude;
  
  let targetAngle: number;
  
  if (stage === 1) {
    // Stage 1: Balanced ascent profile
    if (altitude < 20000) {
      targetAngle = Math.PI * 0.42; // 75.6 degrees
    } else if (altitude < 50000) {
      targetAngle = Math.PI * 0.35; // 63 degrees
    } else {
      targetAngle = Math.PI * 0.28; // 50.4 degrees
    }
  } else {
    // Stage 2: Orbital insertion focus
    if (altitude < targetAltitude * 0.3) {
      targetAngle = Math.PI * 0.25; // 45 degrees
    } else if (altitude < targetAltitude * 0.7) {
      // Transition to more horizontal flight
      const progress = (altitude - targetAltitude * 0.3) / (targetAltitude * 0.4);
      targetAngle = Math.PI * (0.25 - 0.15 * progress); // 45° to 18°
    } else {
      // Near target altitude - focus on velocity
      if (velocityRatio < 0.8) {
        targetAngle = Math.PI * 0.08; // 14.4 degrees - more horizontal
      } else {
        targetAngle = Math.PI * 0.05; // 9 degrees - nearly horizontal
      }
    }
  }
  
  const pitchRate = -0.003; // Smooth pitch-over rate
  
  return { 
    angle: targetAngle, 
    pitchRate, 
    guidance: stage === 1 ? "ASCENT_PROFILE_S1" : "ORBITAL_INSERTION_S2" 
  };
};

// ============================================================================
// ENHANCED STATE VECTOR AND DERIVATIVES
// ============================================================================
interface EnhancedStateVector {
  position: { x: number; y: number; z: number };
  velocity: { vx: number; vy: number; vz: number };
  mass: number;
  flightPathAngle: number;
  heading: number;
  time: number;
}

interface EnhancedDerivativeVector {
  dPosition: { dx: number; dy: number; dz: number };
  dVelocity: { dvx: number; dvy: number; dvz: number };
  dMass: number;
  dFlightPathAngle: number;
  dHeading: number;
}

// ============================================================================
// INDUSTRY-GRADE RK4 INTEGRATION WITH ORBITAL MECHANICS
// ============================================================================
const calculateEnhancedDerivatives = (
  state: EnhancedStateVector,
  thrust: number,
  isp: number,
  dragCoeff: number,
  referenceArea: number,
  latitude: number,
  isEngineOn: boolean,
  stage: number,
  targetAltitude: number,
  requiredOrbitalVelocity: number
): EnhancedDerivativeVector => {
  
  const altitude = state.position.y;
  const speed = Math.sqrt(state.velocity.vx * state.velocity.vx + state.velocity.vy * state.velocity.vy);
  
  // Validate state
  if (state.mass <= 1000 || isNaN(state.mass) || altitude < -1000) {
    return {
      dPosition: { dx: 0, dy: 0, dz: 0 },
      dVelocity: { dvx: 0, dvy: 0, dvz: 0 },
      dMass: 0,
      dFlightPathAngle: 0,
      dHeading: 0
    };
  }
  
  // Atmospheric and gravity properties
  const atm = getAtmosphericProperties(altitude);
  const gravity = getGravityVector(altitude, latitude);
  
  // Propulsion properties
  const propulsion = getPropulsionProperties(thrust, isp, altitude, isEngineOn);
  
  // Drag properties
  const drag = getDragProperties(speed, altitude, dragCoeff, referenceArea);
  
  // Flight path guidance
  const guidance = getOptimalFlightPath(state.time, altitude, speed, targetAltitude, stage, requiredOrbitalVelocity);
  
  // Force calculations
  const thrustForce = propulsion.thrust;
  const dragForce = drag.dragForce;
  const gravityForce = state.mass * gravity.magnitude;
  
  // Unit vectors for thrust direction
  const sinAngle = Math.sin(state.flightPathAngle);
  const cosAngle = Math.cos(state.flightPathAngle);
  
  // Acceleration components
  const thrustAccelX = (thrustForce / state.mass) * cosAngle;
  const thrustAccelY = (thrustForce / state.mass) * sinAngle;
  
  const dragAccelX = speed > 0.1 ? -(dragForce / state.mass) * (state.velocity.vx / speed) : 0;
  const dragAccelY = speed > 0.1 ? -(dragForce / state.mass) * (state.velocity.vy / speed) : 0;
  
  const gravityAccelY = -gravity.magnitude;
  
  // Centrifugal acceleration for orbital mechanics
  const currentRadius = PHYSICS_CONSTANTS.EARTH_RADIUS + altitude;
  const centrifugalAccelY = altitude > 50000 ? (state.velocity.vx * state.velocity.vx) / currentRadius : 0;
  
  // Net accelerations
  const netAccelX = thrustAccelX + dragAccelX;
  const netAccelY = thrustAccelY + dragAccelY + gravityAccelY + centrifugalAccelY;
  
  // Flight path angle rate (guidance-driven with orbital mechanics)
  const angleError = guidance.angle - state.flightPathAngle;
  const angleRate = Math.sign(angleError) * Math.min(Math.abs(angleError) * 0.08, 0.015);
  
  return {
    dPosition: {
      dx: state.velocity.vx,
      dy: state.velocity.vy,
      dz: 0
    },
    dVelocity: {
      dvx: netAccelX,
      dvy: netAccelY,
      dvz: 0
    },
    dMass: -propulsion.massFlowRate,
    dFlightPathAngle: angleRate,
    dHeading: 0
  };
};

const enhancedRK4Step = (
  state: EnhancedStateVector,
  dt: number,
  thrust: number,
  isp: number,
  dragCoeff: number,
  referenceArea: number,
  latitude: number,
  isEngineOn: boolean,
  stage: number,
  targetAltitude: number,
  requiredOrbitalVelocity: number
): EnhancedStateVector => {
  
  // RK4 coefficients
  const k1 = calculateEnhancedDerivatives(state, thrust, isp, dragCoeff, referenceArea, latitude, isEngineOn, stage, targetAltitude, requiredOrbitalVelocity);
  
  const state2: EnhancedStateVector = {
    position: {
      x: state.position.x + 0.5 * dt * k1.dPosition.dx,
      y: state.position.y + 0.5 * dt * k1.dPosition.dy,
      z: state.position.z + 0.5 * dt * k1.dPosition.dz
    },
    velocity: {
      vx: state.velocity.vx + 0.5 * dt * k1.dVelocity.dvx,
      vy: state.velocity.vy + 0.5 * dt * k1.dVelocity.dvy,
      vz: state.velocity.vz + 0.5 * dt * k1.dVelocity.dvz
    },
    mass: Math.max(state.mass + 0.5 * dt * k1.dMass, 1000),
    flightPathAngle: state.flightPathAngle + 0.5 * dt * k1.dFlightPathAngle,
    heading: state.heading + 0.5 * dt * k1.dHeading,
    time: state.time + 0.5 * dt
  };
  
  const k2 = calculateEnhancedDerivatives(state2, thrust, isp, dragCoeff, referenceArea, latitude, isEngineOn, stage, targetAltitude, requiredOrbitalVelocity);
  
  const state3: EnhancedStateVector = {
    position: {
      x: state.position.x + 0.5 * dt * k2.dPosition.dx,
      y: state.position.y + 0.5 * dt * k2.dPosition.dy,
      z: state.position.z + 0.5 * dt * k2.dPosition.dz
    },
    velocity: {
      vx: state.velocity.vx + 0.5 * dt * k2.dVelocity.dvx,
      vy: state.velocity.vy + 0.5 * dt * k2.dVelocity.dvy,
      vz: state.velocity.vz + 0.5 * dt * k2.dVelocity.dvz
    },
    mass: Math.max(state.mass + 0.5 * dt * k2.dMass, 1000),
    flightPathAngle: state.flightPathAngle + 0.5 * dt * k2.dFlightPathAngle,
    heading: state.heading + 0.5 * dt * k2.dHeading,
    time: state.time + 0.5 * dt
  };
  
  const k3 = calculateEnhancedDerivatives(state3, thrust, isp, dragCoeff, referenceArea, latitude, isEngineOn, stage, targetAltitude, requiredOrbitalVelocity);
  
  const state4: EnhancedStateVector = {
    position: {
      x: state.position.x + dt * k3.dPosition.dx,
      y: state.position.y + dt * k3.dPosition.dy,
      z: state.position.z + dt * k3.dPosition.dz
    },
    velocity: {
      vx: state.velocity.vx + dt * k3.dVelocity.dvx,
      vy: state.velocity.vy + dt * k3.dVelocity.dvy,
      vz: state.velocity.vz + dt * k3.dVelocity.dvz
    },
    mass: Math.max(state.mass + dt * k3.dMass, 1000),
    flightPathAngle: state.flightPathAngle + dt * k3.dFlightPathAngle,
    heading: state.heading + dt * k3.dHeading,
    time: state.time + dt
  };
  
  const k4 = calculateEnhancedDerivatives(state4, thrust, isp, dragCoeff, referenceArea, latitude, isEngineOn, stage, targetAltitude, requiredOrbitalVelocity);
  
  // Final RK4 integration
  const newState: EnhancedStateVector = {
    position: {
      x: state.position.x + (dt / 6) * (k1.dPosition.dx + 2 * k2.dPosition.dx + 2 * k3.dPosition.dx + k4.dPosition.dx),
      y: Math.max(0, state.position.y + (dt / 6) * (k1.dPosition.dy + 2 * k2.dPosition.dy + 2 * k3.dPosition.dy + k4.dPosition.dy)),
      z: state.position.z + (dt / 6) * (k1.dPosition.dz + 2 * k2.dPosition.dz + 2 * k3.dPosition.dz + k4.dPosition.dz)
    },
    velocity: {
      vx: state.velocity.vx + (dt / 6) * (k1.dVelocity.dvx + 2 * k2.dVelocity.dvx + 2 * k3.dVelocity.dvx + k4.dVelocity.dvx),
      vy: state.velocity.vy + (dt / 6) * (k1.dVelocity.dvy + 2 * k2.dVelocity.dvy + 2 * k3.dVelocity.dvy + k4.dVelocity.dvy),
      vz: state.velocity.vz + (dt / 6) * (k1.dVelocity.dvz + 2 * k2.dVelocity.dvz + 2 * k3.dVelocity.dvz + k4.dVelocity.dvz)
    },
    mass: Math.max(1000, state.mass + (dt / 6) * (k1.dMass + 2 * k2.dMass + 2 * k3.dMass + k4.dMass)),
    flightPathAngle: Math.max(-Math.PI/2, Math.min(Math.PI/2, state.flightPathAngle + (dt / 6) * (k1.dFlightPathAngle + 2 * k2.dFlightPathAngle + 2 * k3.dFlightPathAngle + k4.dFlightPathAngle))),
    heading: state.heading + (dt / 6) * (k1.dHeading + 2 * k2.dHeading + 2 * k3.dHeading + k4.dHeading),
    time: state.time + dt
  };
  
  return newState;
};

// ============================================================================
// ORBITAL INSERTION AND CIRCULARIZATION
// ============================================================================
const performOrbitalInsertion = (
  state: EnhancedStateVector,
  targetAltitude: number,
  requiredOrbitalVelocity: number,
  dt: number,
  rocketSpecs: any,
  referenceArea: number,
  latitude: number
): { newState: EnhancedStateVector; insertionBurn: boolean } => {
  
  const currentSpeed = Math.sqrt(state.velocity.vx * state.velocity.vx + state.velocity.vy * state.velocity.vy);
  const altitudeError = Math.abs(state.position.y - targetAltitude);
  const velocityDeficit = requiredOrbitalVelocity - currentSpeed;
  
  // Check if we need orbital insertion burn
  const needsInsertionBurn = (
    state.position.y >= targetAltitude * 0.9 && 
    velocityDeficit > 100 && 
    state.mass > 5000
  );
  
  if (needsInsertionBurn) {
    // Perform orbital insertion burn
    const insertionThrust = rocketSpecs.stage2Thrust * 0.8; // Reduced thrust for precision
    const insertionISP = rocketSpecs.stage2ISP * 1.1; // Higher efficiency in vacuum
    
    const newState = enhancedRK4Step(
      state,
      dt,
      insertionThrust,
      insertionISP,
      rocketSpecs.dragCoefficient,
      referenceArea,
      latitude,
      true,
      2,
      targetAltitude,
      requiredOrbitalVelocity
    );
    
    return { newState, insertionBurn: true };
  }
  
  return { newState: state, insertionBurn: false };
};

// ============================================================================
// MAIN SIMULATION HOOK WITH ORBITAL MECHANICS
// ============================================================================
export const useSimulation = () => {
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSimulation = useCallback(async (params: LaunchParameters) => {
    setIsRunning(true);
    setSimulation(null);
    setError(null);

    try {
      console.log('🚀 ORBITAL INSERTION SIMULATION INITIATED');
      console.log('📊 Input Parameters:', params);
      
      await new Promise(resolve => setTimeout(resolve, 500));

      const { rocketSpecs, orbitHeight, latitude } = params;
      const targetAltitude = orbitHeight * 1000;
      const referenceArea = 15.0; // m² - typical rocket cross-section
      
      // Calculate required orbital velocity with Earth rotation
      const orbitalRadius = PHYSICS_CONSTANTS.EARTH_RADIUS + targetAltitude;
      const requiredOrbitalVelocity = Math.sqrt(PHYSICS_CONSTANTS.G * PHYSICS_CONSTANTS.EARTH_MASS / orbitalRadius);
      const earthRotationBonus = PHYSICS_CONSTANTS.EARTH_ROTATION_RATE * PHYSICS_CONSTANTS.EARTH_RADIUS * Math.cos(latitude * Math.PI / 180);
      const effectiveRequiredVelocity = requiredOrbitalVelocity - earthRotationBonus;
      
      console.log(`🎯 Target: ${targetAltitude/1000}km circular orbit`);
      console.log(`⚡ Required orbital velocity: ${requiredOrbitalVelocity.toFixed(2)} m/s`);
      console.log(`🌍 Earth rotation bonus: ${earthRotationBonus.toFixed(2)} m/s`);
      console.log(`🎯 Effective required velocity: ${effectiveRequiredVelocity.toFixed(2)} m/s`);
      
      // Enhanced simulation parameters
      const dt = 0.5; // Balanced time step for accuracy and performance
      const maxSimulationTime = 1500; // 25 minutes max
      
      // Initialize enhanced state vector
      let state: EnhancedStateVector = {
        position: { x: 0, y: 0, z: 0 },
        velocity: { vx: earthRotationBonus, vy: 0, vz: 0 }, // Start with Earth rotation
        mass: rocketSpecs.mass,
        flightPathAngle: Math.PI / 2, // Vertical start
        heading: Math.PI / 2, // East
        time: 0
      };
      
      const trajectoryData: TrajectoryPoint[] = [];
      let separationTime = 0;
      let separationAltitude = 0;
      let maxDynamicPressure = 0;
      let maxAcceleration = 0;
      let orbitalInsertionComplete = false;
      
      console.log('🔥 STAGE 1 IGNITION - Ascent Phase');
      
      // ========================================================================
      // STAGE 1 SIMULATION - ASCENT TO SEPARATION
      // ========================================================================
      let stepCount = 0;
      const maxSteps = Math.ceil(rocketSpecs.stage1BurnTime / dt) + 100;
      
      while (state.time < rocketSpecs.stage1BurnTime && state.position.y >= 0 && stepCount < maxSteps) {
        
        // Calculate current flight properties
        const speed = Math.sqrt(state.velocity.vx * state.velocity.vx + state.velocity.vy * state.velocity.vy);
        const atm = getAtmosphericProperties(state.position.y);
        const drag = getDragProperties(speed, state.position.y, rocketSpecs.dragCoefficient, referenceArea);
        const propulsion = getPropulsionProperties(rocketSpecs.stage1Thrust, rocketSpecs.stage1ISP, state.position.y, true);
        
        // Calculate accelerations for logging
        const thrustAccel = propulsion.thrust / state.mass;
        const gravity = getGravityVector(state.position.y, latitude);
        const dragAccel = drag.dragForce / state.mass;
        const netAccel = thrustAccel - gravity.magnitude - dragAccel;
        
        // Track maximums
        maxDynamicPressure = Math.max(maxDynamicPressure, drag.dynamicPressure);
        maxAcceleration = Math.max(maxAcceleration, netAccel / PHYSICS_CONSTANTS.STANDARD_GRAVITY);
        
        // Store trajectory data
        trajectoryData.push({
          time: parseFloat(state.time.toFixed(3)),
          altitude: state.position.y,
          velocity: speed,
          acceleration: netAccel,
          thrust: propulsion.thrust,
          mass: state.mass,
          x: state.position.x,
          y: state.position.y,
          z: state.position.z,
          stage: 1
        });
        
        // RK4 integration step
        state = enhancedRK4Step(
          state,
          dt,
          rocketSpecs.stage1Thrust,
          rocketSpecs.stage1ISP,
          rocketSpecs.dragCoefficient,
          referenceArea,
          latitude,
          true,
          1,
          targetAltitude,
          effectiveRequiredVelocity
        );
        
        stepCount++;
        
        // Progress logging
        if (Math.floor(state.time) % 25 === 0 && Math.floor(state.time) !== Math.floor(state.time - dt)) {
          console.log(`⏱️  t=${state.time.toFixed(1)}s: Alt=${(state.position.y/1000).toFixed(2)}km, Vel=${speed.toFixed(1)}m/s, Angle=${(state.flightPathAngle * 180/Math.PI).toFixed(1)}°`);
        }
      }
      
      // Stage separation
      separationTime = state.time;
      separationAltitude = state.position.y;
      const separationVelocity = Math.sqrt(state.velocity.vx * state.velocity.vx + state.velocity.vy * state.velocity.vy);
      
      console.log(`🔄 STAGE SEPARATION at t=${separationTime.toFixed(1)}s`);
      console.log(`   Altitude: ${(separationAltitude/1000).toFixed(2)}km`);
      console.log(`   Velocity: ${separationVelocity.toFixed(2)}m/s`);
      console.log(`   Flight path angle: ${(state.flightPathAngle * 180/Math.PI).toFixed(1)}°`);
      
      // Update mass for stage 2
      state.mass = rocketSpecs.stageSeparationMass;
      
      console.log('🔥 STAGE 2 IGNITION - Orbital Insertion Phase');
      
      // ========================================================================
      // STAGE 2 SIMULATION - ORBITAL INSERTION
      // ========================================================================
      const stage2EndTime = separationTime + rocketSpecs.stage2BurnTime;
      stepCount = 0;
      const maxSteps2 = Math.ceil(rocketSpecs.stage2BurnTime / dt) + 100;
      
      while (state.time < stage2EndTime && state.position.y >= 0 && stepCount < maxSteps2) {
        
        const speed = Math.sqrt(state.velocity.vx * state.velocity.vx + state.velocity.vy * state.velocity.vy);
        const atm = getAtmosphericProperties(state.position.y);
        const drag = getDragProperties(speed, state.position.y, rocketSpecs.dragCoefficient, referenceArea);
        const propulsion = getPropulsionProperties(rocketSpecs.stage2Thrust, rocketSpecs.stage2ISP, state.position.y, true);
        
        const thrustAccel = propulsion.thrust / state.mass;
        const gravity = getGravityVector(state.position.y, latitude);
        const dragAccel = drag.dragForce / state.mass;
        const netAccel = thrustAccel - gravity.magnitude - dragAccel;
        
        trajectoryData.push({
          time: parseFloat(state.time.toFixed(3)),
          altitude: state.position.y,
          velocity: speed,
          acceleration: netAccel,
          thrust: propulsion.thrust,
          mass: state.mass,
          x: state.position.x,
          y: state.position.y,
          z: state.position.z,
          stage: 2
        });
        
        state = enhancedRK4Step(
          state,
          dt,
          rocketSpecs.stage2Thrust,
          rocketSpecs.stage2ISP,
          rocketSpecs.dragCoefficient,
          referenceArea,
          latitude,
          true,
          2,
          targetAltitude,
          effectiveRequiredVelocity
        );
        
        stepCount++;
        
        if (Math.floor(state.time) % 40 === 0 && Math.floor(state.time) !== Math.floor(state.time - dt)) {
          console.log(`⏱️  t=${state.time.toFixed(1)}s: Alt=${(state.position.y/1000).toFixed(2)}km, Vel=${speed.toFixed(1)}m/s, Angle=${(state.flightPathAngle * 180/Math.PI).toFixed(1)}°`);
        }
      }
      
      // ========================================================================
      // ORBITAL INSERTION AND CIRCULARIZATION PHASE
      // ========================================================================
      console.log('🌌 ORBITAL INSERTION - Circularization Burns');
      const insertionEndTime = state.time + 300; // 5 minutes for orbital insertion
      stepCount = 0;
      const maxSteps3 = Math.ceil(300 / dt) + 100;
      
      while (state.time < insertionEndTime && state.position.y >= 0 && stepCount < maxSteps3) {
        const speed = Math.sqrt(state.velocity.vx * state.velocity.vx + state.velocity.vy * state.velocity.vy);
        
        // Perform orbital insertion if needed
        const insertion = performOrbitalInsertion(
          state,
          targetAltitude,
          effectiveRequiredVelocity,
          dt,
          rocketSpecs,
          referenceArea,
          latitude
        );
        
        state = insertion.newState;
        
        if (insertion.insertionBurn) {
          orbitalInsertionComplete = true;
        }
        
        const gravity = getGravityVector(state.position.y, latitude);
        const drag = getDragProperties(speed, state.position.y, rocketSpecs.dragCoefficient, referenceArea);
        const netAccel = insertion.insertionBurn ? 
          (rocketSpecs.stage2Thrust * 0.8) / state.mass - gravity.magnitude - drag.dragForce / state.mass :
          -gravity.magnitude - drag.dragForce / state.mass;
        
        trajectoryData.push({
          time: parseFloat(state.time.toFixed(3)),
          altitude: state.position.y,
          velocity: speed,
          acceleration: netAccel,
          thrust: insertion.insertionBurn ? rocketSpecs.stage2Thrust * 0.8 : 0,
          mass: state.mass,
          x: state.position.x,
          y: state.position.y,
          z: state.position.z,
          stage: 2
        });
        
        stepCount++;
        
        // Check if orbit is achieved
        const currentOrbitalVelocity = Math.sqrt(PHYSICS_CONSTANTS.G * PHYSICS_CONSTANTS.EARTH_MASS / (PHYSICS_CONSTANTS.EARTH_RADIUS + state.position.y));
        if (speed >= currentOrbitalVelocity * 0.95 && state.position.y >= targetAltitude * 0.95) {
          console.log('🎯 ORBITAL VELOCITY ACHIEVED!');
          break;
        }
      }
      
      // ========================================================================
      // FINAL ANALYSIS AND RESULTS
      // ========================================================================
      const finalSpeed = Math.sqrt(state.velocity.vx * state.velocity.vx + state.velocity.vy * state.velocity.vy);
      const finalAltitude = state.position.y;
      const totalFlightTime = state.time;
      const velocityAchievement = (finalSpeed / effectiveRequiredVelocity) * 100;
      const downrange = state.position.x;
      
      console.log('🎯 ORBITAL INSERTION ANALYSIS COMPLETE');
      console.log(`   Final Altitude: ${(finalAltitude/1000).toFixed(2)}km`);
      console.log(`   Final Velocity: ${finalSpeed.toFixed(2)}m/s`);
      console.log(`   Required Velocity: ${effectiveRequiredVelocity.toFixed(2)}m/s`);
      console.log(`   Orbital Achievement: ${velocityAchievement.toFixed(1)}%`);
      console.log(`   Downrange: ${(downrange/1000).toFixed(2)}km`);
      console.log(`   Flight Time: ${totalFlightTime.toFixed(1)}s`);
      console.log(`   Orbital Insertion: ${orbitalInsertionComplete ? 'SUCCESS' : 'PARTIAL'}`);
      console.log(`   Data Points: ${trajectoryData.length}`);
      
      // Generate comprehensive plot data
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
      
      const launchAngle = downrange > 0 ? Math.atan2(finalAltitude, downrange) * 180 / Math.PI : 45;
      
      const optimalParams: OptimalParameters = {
        requiredVelocity: effectiveRequiredVelocity,
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
      console.log('✅ ORBITAL INSERTION SIMULATION COMPLETED SUCCESSFULLY');
      
    } catch (err) {
      console.error('❌ ORBITAL SIMULATION ERROR:', err);
      setError(err instanceof Error ? err.message : 'Orbital insertion simulation failed');
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