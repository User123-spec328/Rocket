import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Activity, Target, Clock, Gauge, Flame } from 'lucide-react';
import { SimulationResult } from '../types/rocket';

interface SimulationResultsProps {
  result: SimulationResult;
}

export const SimulationResults: React.FC<SimulationResultsProps> = ({ result }) => {
  if (!result || !result.plots) {
    return (
      <div className="text-center py-16">
        <div className="text-gray-400">No simulation data available</div>
      </div>
    );
  }

  const { plots, optimalParams } = result;

  const chartConfig = {
    backgroundColor: '#1f2937',
    strokeWidth: 2,
    gridStroke: '#374151',
    textColor: '#e5e7eb'
  };

  const StatCard: React.FC<{ 
    icon: React.ReactNode; 
    title: string; 
    value: string | number; 
    unit?: string; 
    color?: string 
  }> = ({ icon, title, value, unit, color = 'bg-red-600' }) => (
    <div className="bg-gray-800/50 backdrop-blur-sm p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
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
    <div className="bg-gray-800/30 backdrop-blur-sm p-6 rounded-xl border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <div className="h-80">
        {children}
      </div>
    </div>
  );

  // Ensure we have valid data
  if (!plots.altitude || plots.altitude.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-red-400">Invalid simulation data</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Performance Metrics */}
      <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
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

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ChartContainer title="Altitude vs Time">
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
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}km`}
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

        <ChartContainer title="Velocity vs Time">
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

        <ChartContainer title="Acceleration vs Time">
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

        <ChartContainer title="Thrust vs Time">
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
                tickFormatter={(value) => `${(value / 1000000).toFixed(1)}MN`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: chartConfig.backgroundColor,
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: chartConfig.textColor
                }}
                formatter={(value: any) => [
                  `${(Number(value) / 1000000).toFixed(2)} MN`,
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

        <ChartContainer title="Mass vs Time">
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

        <ChartContainer title="Stage Comparison">
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
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}km`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: chartConfig.backgroundColor,
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: chartConfig.textColor
                }}
              />
              <Legend />
              <Line
                data={plots.stage1Trajectory}
                type="monotone"
                dataKey="value"
                stroke="#f97316"
                strokeWidth={3}
                dot={false}
                name="Stage 1"
              />
              <Line
                data={plots.stage2Trajectory}
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={false}
                name="Stage 2"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
    </div>
  );
};