import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Activity, Target, Clock, Gauge, Flame, Zap, BarChart3 } from 'lucide-react';
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
    color?: string;
    subtitle?: string;
  }> = ({ icon, title, value, unit, color = 'bg-red-600', subtitle }) => (
    <div className="bg-gray-800/50 backdrop-blur-sm p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 ${color} rounded-lg`}>
          {icon}
        </div>
        <div>
          <span className="text-sm font-medium text-gray-300">{title}</span>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
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
            <p className="text-gray-400">Industry-grade simulation with RK4 integration and realistic physics</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <StatCard
            icon={<TrendingUp className="w-5 h-5 text-white" />}
            title="Required Orbital Velocity"
            value={optimalParams.requiredVelocity}
            unit="m/s"
            subtitle="Circular orbit velocity"
          />
          <StatCard
            icon={<Activity className="w-5 h-5 text-white" />}
            title="Final Velocity Achieved"
            value={plots.velocity[plots.velocity.length - 1]?.value || 0}
            unit="m/s"
            subtitle="Actual velocity reached"
            color="bg-green-600"
          />
          <StatCard
            icon={<BarChart3 className="w-5 h-5 text-white" />}
            title="Velocity Achievement"
            value={((plots.velocity[plots.velocity.length - 1]?.value || 0) / optimalParams.requiredVelocity * 100)}
            unit="%"
            subtitle="Orbital velocity percentage"
            color="bg-blue-600"
          />
          <StatCard
            icon={<Target className="w-5 h-5 text-white" />}
            title="Launch Angle"
            value={optimalParams.launchAngle}
            unit="°"
            subtitle="Gravity turn trajectory"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5 text-white" />}
            title="Maximum Altitude"
            value={(optimalParams.maxAltitude / 1000)}
            unit="km"
            subtitle="Apogee reached"
          />
          <StatCard
            icon={<Clock className="w-5 h-5 text-white" />}
            title="Total Flight Time"
            value={optimalParams.totalFlightTime}
            unit="s"
            subtitle="Complete mission duration"
          />
          <StatCard
            icon={<Flame className="w-5 h-5 text-white" />}
            title="Stage Separation Time"
            value={optimalParams.stageSeparationTime}
            unit="s"
            color="bg-orange-600"
            subtitle="Stage 1 burnout"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5 text-white" />}
            title="Separation Altitude"
            value={(optimalParams.stageSeparationAltitude / 1000)}
            unit="km"
            color="bg-orange-600"
            subtitle="Stage separation altitude"
          />
          <StatCard
            icon={<Clock className="w-5 h-5 text-white" />}
            title="Stage 1 Burn Time"
            value={optimalParams.stage1OptimalBurnTime}
            unit="s"
            color="bg-orange-600"
            subtitle="First stage duration"
          />
          <StatCard
            icon={<Clock className="w-5 h-5 text-white" />}
            title="Stage 2 Burn Time"
            value={optimalParams.stage2OptimalBurnTime}
            unit="s"
            color="bg-blue-600"
            subtitle="Second stage duration"
          />
          <StatCard
            icon={<Zap className="w-5 h-5 text-white" />}
            title="Delta-V Delivered"
            value={plots.velocity[plots.velocity.length - 1]?.value || 0}
            unit="m/s"
            color="bg-purple-600"
            subtitle="Total velocity change"
          />
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ChartContainer title="Altitude vs Time (Professional Analysis)">
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

        <ChartContainer title="Velocity vs Time (RK4 Integration)">
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
                domain={[0, 'dataMax']}
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

        <ChartContainer title="Acceleration vs Time (G-Forces)">
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
                tickFormatter={(value) => `${(value / 9.81).toFixed(1)}g`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: chartConfig.backgroundColor,
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: chartConfig.textColor
                }}
                formatter={(value: any) => [
                  `${Number(value).toFixed(2)} m/s² (${(Number(value) / 9.81).toFixed(2)}g)`,
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

        <ChartContainer title="Thrust vs Time (Engine Performance)">
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

        <ChartContainer title="Mass vs Time (Propellant Consumption)">
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

        <ChartContainer title="Stage Performance Comparison">
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
                strokeWidth={4}
                dot={false}
                name="Stage 1 (Booster)"
              />
              <Line
                data={plots.stage2Trajectory}
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={4}
                dot={false}
                name="Stage 2 (Upper Stage)"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </div>
      
      {/* Professional Analysis Summary */}
      <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-red-500" />
          Professional Analysis Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <h4 className="font-medium text-gray-300 mb-2">Mission Performance</h4>
            <ul className="space-y-1 text-gray-400">
              <li>• RK4 numerical integration with 0.1s time steps</li>
              <li>• Realistic atmospheric drag modeling</li>
              <li>• Gravity turn trajectory implementation</li>
              <li>• Industry-standard physics constants</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-300 mb-2">Orbital Mechanics</h4>
            <ul className="space-y-1 text-gray-400">
              <li>• Velocity achievement: {((plots.velocity[plots.velocity.length - 1]?.value || 0) / optimalParams.requiredVelocity * 100).toFixed(1)}%</li>
              <li>• Altitude accuracy: ±{Math.abs(optimalParams.maxAltitude/1000 - (plots.altitude.find(p => p.value === Math.max(...plots.altitude.map(a => a.value)))?.value || 0)/1000).toFixed(1)}km</li>
              <li>• Total ΔV delivered: {(plots.velocity[plots.velocity.length - 1]?.value || 0).toFixed(0)} m/s</li>
              <li>• Mission duration: {optimalParams.totalFlightTime.toFixed(0)}s</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};