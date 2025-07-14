import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Activity, Target, Clock, Gauge, Flame } from 'lucide-react';

// Define a minimal SimulationResult type locally (adjust based on ../types/rocket if needed)
interface SimulationResult {
  id?: string;
  status?: string;
  trajectoryData?: any;
  stage1TrajectoryData?: any;
  stage2TrajectoryData?: any;
  plots: {
    altitude: { time: number; value: number }[];
    velocity: { time: number; value: number }[];
    acceleration: { time: number; value: number }[];
    thrust: { time: number; value: number }[];
    mass: { time: number; value: number }[];
    stage1Trajectory: { time: number; value: number }[];
    stage2Trajectory: { time: number; value: number }[];
  };
  optimalParams: {
    requiredVelocity: number;
    launchAngle: number;
    maxAltitude: number;
    totalFlightTime: number;
    stageSeparationTime: number;
    stageSeparationAltitude: number;
    stage1OptimalBurnTime: number;
    stage2OptimalBurnTime: number;
  };
}

export const SimulationResults: React.FC = () => {
  const [computedResult, setComputedResult] = useState<SimulationResult | null>(null);

  // Constants and initial conditions based on input values
  const g0 = 9.81; // m/s^2, standard gravity
  const mu = 3.986e14; // m^3/s^2, Earth's gravitational parameter
  const Re = 6371000; // m, Earth's radius
  const targetAltitude = 400000; // m, target orbit height
  const initialMass = 549054; // kg
  const stageSeparationMass = 131000; // kg
  const dragCoefficient = 0.3;
  const frontalArea = 10; // m^2, approximate cross-sectional area (assumed)
  const stage1Thrust = 7607000; // N
  const stage1ISP = 282; // s
  const stage1BurnTime = 162; // s
  const stage2Thrust = 934000; // N
  const stage2ISP = 421; // s
  const stage2BurnTime = 397; // s
  const dt = 0.1; // s, time step for simulation

  useEffect(() => {
    const simulateFlight = (): SimulationResult => {
      let mass = initialMass;
      let time = 0;
      let altitude = 0;
      let velocity = 0;
      let acceleration = 0;
      const plots = {
        altitude: [] as { time: number; value: number }[],
        velocity: [] as { time: number; value: number }[],
        acceleration: [] as { time: number; value: number }[],
        thrust: [] as { time: number; value: number }[],
        mass: [] as { time: number; value: number }[],
        stage1Trajectory: [] as { time: number; value: number }[],
        stage2Trajectory: [] as { time: number; value: number }[]
      };

      while (altitude < targetAltitude * 1.1 && time <= stage1BurnTime + stage2BurnTime) {
        // Atmospheric density model (simplified, decreases with altitude)
        const altitudeKm = altitude / 1000;
        let density = 1.225 * Math.exp(-altitudeKm / 8.4); // kg/m^3, approximate

        // Thrust and mass flow rate
        let thrust = 0;
        let massFlowRate = 0;
        if (time <= stage1BurnTime && mass > stageSeparationMass) {
          thrust = stage1Thrust;
          massFlowRate = thrust / (stage1ISP * g0);
        } else if (time > stage1BurnTime && time <= stage1BurnTime + stage2BurnTime && mass > 0) {
          thrust = stage2Thrust;
          massFlowRate = thrust / (stage2ISP * g0);
        }

        // Drag force
        const drag = 0.5 * density * velocity * velocity * dragCoefficient * frontalArea;

        // Gravity (varies with altitude)
        const radius = Re + altitude;
        const gravity = mu / (radius * radius);

        // Acceleration function
        const computeAcceleration = (v: number, m: number) => {
          return (thrust - 0.5 * density * v * v * dragCoefficient * frontalArea - m * gravity) / m;
        };

        // RK4 for velocity and altitude
        const k1v = computeAcceleration(velocity, mass);
        const k1h = velocity;

        const k2v = computeAcceleration(velocity + (dt / 2) * k1v, mass - (dt / 2) * massFlowRate);
        const k2h = velocity + (dt / 2) * k1v;

        const k3v = computeAcceleration(velocity + (dt / 2) * k2v, mass - (dt / 2) * massFlowRate);
        const k3h = velocity + (dt / 2) * k2v;

        const k4v = computeAcceleration(velocity + dt * k3v, mass - dt * massFlowRate);
        const k4h = velocity + dt * k3v;

        // Update velocity and altitude using RK4
        velocity += (dt / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
        altitude += (dt / 6) * (k1h + 2 * k2h + 2 * k3h + k4h);
        mass = Math.max(0, mass - massFlowRate * dt); // Prevent negative mass

        // Compute acceleration for plotting (using final velocity and mass)
        acceleration = computeAcceleration(velocity, mass);

        // Store data
        plots.altitude.push({ time, value: altitude });
        plots.velocity.push({ time, value: velocity });
        plots.acceleration.push({ time, value: acceleration });
        plots.thrust.push({ time, value: thrust });
        plots.mass.push({ time, value: mass });
        if (time <= stage1BurnTime) {
          plots.stage1Trajectory.push({ time, value: altitude });
        } else {
          plots.stage2Trajectory.push({ time, value: altitude });
        }

        time += dt;

        // Stop if mass becomes zero or altitude exceeds target significantly
        if (mass <= 0) break;
      }

      // Compute optimal parameters
      const optimalParams = {
        requiredVelocity: Math.sqrt(mu / (Re + targetAltitude)),
        launchAngle: 3.59,
        maxAltitude: Math.max(...plots.altitude.map(p => p.value)),
        totalFlightTime: plots.altitude.length * dt,
        stageSeparationTime: stage1BurnTime,
        stageSeparationAltitude: plots.altitude[Math.floor(stage1BurnTime / dt)].value,
        stage1OptimalBurnTime: stage1BurnTime,
        stage2OptimalBurnTime: stage2BurnTime
      };

      return {
        id: 'sim-001', // Placeholder
        status: 'completed', // Placeholder
        trajectoryData: null, // Placeholder
        stage1TrajectoryData: null, // Placeholder
        stage2TrajectoryData: null, // Placeholder
        plots,
        optimalParams
      };
    };

    setComputedResult(simulateFlight());
  }, []);

  if (!computedResult) return null;

  const { plots, optimalParams } = computedResult;

  const chartConfig = {
    backgroundColor: '#1f2937',
    strokeWidth: 2,
    gridStroke: '#374151',
    textColor: '#e5e7eb'
  };

  const StatCard: React.FC<{ icon: React.ReactNode; title: string; value: string | number; unit?: string; color?: string }> = ({ 
    icon, title, value, unit, color = 'bg-red-600' 
  }) => (
    <div className="bg-transparent-800 p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 ${color} rounded-lg`}>
          {icon}
        </div>
        <span className="text-sm font-medium text-gray-300">{title}</span>
      </div>
      <div className="text-2xl font-bold text-white">
        {typeof value === 'number' ? value.toFixed(2) : value}
        {unit && <span className="text-lg text-gray-400 ml-1">{unit}</span>}
      </div>
    </div>
  );

  const ChartContainer: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-transparent backdrop-blur-sm p-6 rounded-xl border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <div className="h-80">
        {children}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Optimal Parameters */}
      <div className="bg-transparent border border-gray-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-red-600 rounded-lg">
            <Target className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Two-Stage Rocket Performance Analysis</h2>
            <p className="text-gray-400">Calculated optimal values and performance metrics</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            icon={<TrendingUp className="w-5 h-5 text-white" />}
            title="Required Orbital Velocity"
            value={optimalParams.requiredVelocity}
            unit="m/s"
          />
          <StatCard
            icon={<Gauge className="w-5 h-5 text-white" />}
            title="Launch Angle"
            value={optimalParams.launchAngle}
            unit="°"
          />
          <StatCard
            icon={<Activity className="w-5 h-5 text-white" />}
            title="Maximum Altitude"
            value={(optimalParams.maxAltitude / 1000)}
            unit="km"
          />
          <StatCard
            icon={<Clock className="w-5 h-5 text-white" />}
            title="Total Flight Time"
            value={optimalParams.totalFlightTime}
            unit="s"
          />
          <StatCard
            icon={<Flame className="w-5 h-5 text-white" />}
            title="Stage Separation Time"
            value={optimalParams.stageSeparationTime}
            unit="s"
            color="bg-orange-600"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5 text-white" />}
            title="Separation Altitude"
            value={(optimalParams.stageSeparationAltitude / 1000)}
            unit="km"
            color="bg-orange-600"
          />
          <StatCard
            icon={<Clock className="w-5 h-5 text-white" />}
            title="Stage 1 Burn Time"
            value={optimalParams.stage1OptimalBurnTime}
            unit="s"
            color="bg-orange-600"
          />
          <StatCard
            icon={<Clock className="w-5 h-5 text-white" />}
            title="Stage 2 Burn Time"
            value={optimalParams.stage2OptimalBurnTime}
            unit="s"
            color="bg-blue-600"
          />
        </div>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ChartContainer title="Altitude vs Time (Two-Stage)">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={plots.altitude}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartConfig.gridStroke} />
              <XAxis 
                dataKey="time" 
                stroke={chartConfig.textColor}
                tick={{ fill: chartConfig.textColor }}
              />
              <YAxis 
                stroke={chartConfig.textColor}
                tick={{ fill: chartConfig.textColor }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: chartConfig.backgroundColor,
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: chartConfig.textColor
                }}
                formatter={(value: any) => [
                  `${(Number(value) / 1000).toFixed(2)} km`,
                  'Altitude'
                ]}
                labelFormatter={(label) => `Time: ${label}s`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#ef4444"
                strokeWidth={chartConfig.strokeWidth}
                dot={false}
                name="Altitude (m)"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="Velocity vs Time (Two-Stage)">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={plots.velocity}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartConfig.gridStroke} />
              <XAxis 
                dataKey="time" 
                stroke={chartConfig.textColor}
                tick={{ fill: chartConfig.textColor }}
              />
              <YAxis 
                stroke={chartConfig.textColor}
                tick={{ fill: chartConfig.textColor }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: chartConfig.backgroundColor,
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: chartConfig.textColor
                }}
                formatter={(value: any) => [
                  `${Number(value).toFixed(2)} m/s`,
                  'Velocity'
                ]}
                labelFormatter={(label) => `Time: ${label}s`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={chartConfig.strokeWidth}
                dot={false}
                name="Velocity (m/s)"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="Acceleration vs Time (Two-Stage)">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={plots.acceleration}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartConfig.gridStroke} />
              <XAxis 
                dataKey="time" 
                stroke={chartConfig.textColor}
                tick={{ fill: chartConfig.textColor }}
              />
              <YAxis 
                stroke={chartConfig.textColor}
                tick={{ fill: chartConfig.textColor }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: chartConfig.backgroundColor,
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: chartConfig.textColor
                }}
                formatter={(value: any) => [
                  `${Number(value).toFixed(2)} m/s²`,
                  'Acceleration'
                ]}
                labelFormatter={(label) => `Time: ${label}s`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#10b981"
                strokeWidth={chartConfig.strokeWidth}
                dot={false}
                name="Acceleration (m/s²)"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="Thrust vs Time (Two-Stage)">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={plots.thrust}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartConfig.gridStroke} />
              <XAxis 
                dataKey="time" 
                stroke={chartConfig.textColor}
                tick={{ fill: chartConfig.textColor }}
              />
              <YAxis 
                stroke={chartConfig.textColor}
                tick={{ fill: chartConfig.textColor }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: chartConfig.backgroundColor,
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: chartConfig.textColor
                }}
                formatter={(value: any) => [
                  `${(Number(value) / 1000).toFixed(0)} kN`,
                  'Thrust'
                ]}
                labelFormatter={(label) => `Time: ${label}s`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#f59e0b"
                strokeWidth={chartConfig.strokeWidth}
                dot={false}
                name="Thrust (N)"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="Mass vs Time (Two-Stage)">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={plots.mass}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartConfig.gridStroke} />
              <XAxis 
                dataKey="time" 
                stroke={chartConfig.textColor}
                tick={{ fill: chartConfig.textColor }}
              />
              <YAxis 
                stroke={chartConfig.textColor}
                tick={{ fill: chartConfig.textColor }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}t`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: chartConfig.backgroundColor,
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: chartConfig.textColor
                }}
                formatter={(value: any) => [
                  `${(Number(value) / 1000).toFixed(1)} tons`,
                  'Mass'
                ]}
                labelFormatter={(label) => `Time: ${label}s`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#8b5cf6"
                strokeWidth={chartConfig.strokeWidth}
                dot={false}
                name="Mass (kg)"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>

        <ChartContainer title="Stage Trajectories Comparison">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart>
              <CartesianGrid strokeDasharray="3 3" stroke={chartConfig.gridStroke} />
              <XAxis 
                dataKey="time" 
                stroke={chartConfig.textColor}
                tick={{ fill: chartConfig.textColor }}
              />
              <YAxis 
                stroke={chartConfig.textColor}
                tick={{ fill: chartConfig.textColor }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: chartConfig.backgroundColor,
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: chartConfig.textColor
                }}
                formatter={(value: any) => [`${(Number(value) / 1000).toFixed(2)} km`, 'Altitude']}
              />
              <Legend />
              <Line
                data={plots.stage1Trajectory}
                type="monotone"
                dataKey="value"
                stroke="#f97316"
                strokeWidth={3}
                dot={false}
                name="Stage 1 Trajectory"
              />
              <Line
                data={plots.stage2Trajectory}
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={false}
                name="Stage 2 Trajectory"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  );
};