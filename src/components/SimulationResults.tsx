import React from 'react';
import { SimulationResult } from '../types/rocket';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Zap, Activity, Target, Clock, Gauge } from 'lucide-react';

interface SimulationResultsProps {
  result: SimulationResult;
}

export const SimulationResults: React.FC<SimulationResultsProps> = ({ result }) => {
  const { plots, optimalParams } = result;

  const chartConfig = {
    backgroundColor: '#1f2937',
    strokeWidth: 2,
    gridStroke: '#374151',
    textColor: '#e5e7eb'
  };

  const StatCard: React.FC<{ icon: React.ReactNode; title: string; value: string | number; unit?: string }> = ({ icon, title, value, unit }) => (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-red-600 rounded-lg">
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
    <div className="bg-gray-900 p-6 rounded-xl border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <div className="h-80">
        {children}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Optimal Parameters */}
      <div className="bg-black border border-gray-800 rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-red-600 rounded-lg">
            <Target className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Optimal Launch Parameters</h2>
            <p className="text-gray-400">Calculated optimal values for your rocket configuration</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard
            icon={<TrendingUp className="w-5 h-5 text-white" />}
            title="Required Velocity"
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
            icon={<Clock className="w-5 h-5 text-white" />}
            title="Optimal Burn Time"
            value={optimalParams.optimalBurnTime}
            unit="s"
          />
          <StatCard
            icon={<Activity className="w-5 h-5 text-white" />}
            title="Max Altitude"
            value={optimalParams.maxAltitude}
            unit="m"
          />
          <StatCard
            icon={<Zap className="w-5 h-5 text-white" />}
            title="Total Flight Time"
            value={optimalParams.totalFlightTime}
            unit="s"
          />
        </div>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ChartContainer title="Altitude vs Time">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={plots.altitude}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartConfig.gridStroke} />
              <XAxis dataKey="time" stroke={chartConfig.textColor} />
              <YAxis stroke={chartConfig.textColor} />
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
              <XAxis dataKey="time" stroke={chartConfig.textColor} />
              <YAxis stroke={chartConfig.textColor} />
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
              <XAxis dataKey="time" stroke={chartConfig.textColor} />
              <YAxis stroke={chartConfig.textColor} />
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
              <XAxis dataKey="time" stroke={chartConfig.textColor} />
              <YAxis stroke={chartConfig.textColor} />
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
      </div>
    </div>
  );
};