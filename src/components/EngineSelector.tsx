import React from 'react';
import { Engine } from '../types/engine';
import { ChevronDown, Zap, Info } from 'lucide-react';

interface EngineSelectorProps {
  engines: Engine[];
  selectedEngine: Engine | null;
  onEngineSelect: (engine: Engine) => void;
  stage: 1 | 2;
  label: string;
}

export const EngineSelector: React.FC<EngineSelectorProps> = ({
  engines,
  selectedEngine,
  onEngineSelect,
  stage,
  label
}) => {
  const stageColor = stage === 1 ? 'orange' : 'blue';
  const stageColorClasses = {
    orange: {
      bg: 'bg-orange-600',
      border: 'border-orange-500',
      text: 'text-orange-400',
      hover: 'hover:border-orange-400'
    },
    blue: {
      bg: 'bg-blue-600',
      border: 'border-blue-500',
      text: 'text-blue-400',
      hover: 'hover:border-blue-400'
    }
  };

  const colors = stageColorClasses[stageColor];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <div className={`p-2 ${colors.bg} rounded-lg`}>
          <Zap className="w-5 h-5 text-white" />
        </div>
        <h4 className="text-lg font-semibold text-white">{label}</h4>
      </div>

      <div className="relative">
        <select
          value={selectedEngine?.id || ''}
          onChange={(e) => {
            const engine = engines.find(eng => eng.id === e.target.value);
            if (engine) onEngineSelect(engine);
          }}
          className={`
            w-full px-4 py-3 bg-transparent border ${colors.border} rounded-lg
            text-white appearance-none cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent
            transition-all duration-200 ${colors.hover}
          `}
        >
          <option value="" className="bg-gray-800 text-gray-300">
            Select an engine...
          </option>
          {engines.map((engine) => (
            <option key={engine.id} value={engine.id} className="bg-gray-800 text-white">
              {engine.name} ({engine.engineType})
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
      </div>

      {selectedEngine && (
        <div className={`p-4 bg-transparent border ${colors.border}/30 rounded-lg`}>
          <div className="flex items-start gap-3 mb-3">
            <Info className={`w-4 h-4 ${colors.text} mt-0.5 flex-shrink-0`} />
            <div>
              <h5 className="font-medium text-white">{selectedEngine.name}</h5>
              <p className="text-sm text-gray-400">{selectedEngine.description}</p>
              <p className="text-xs text-gray-500 mt-1">Type: {selectedEngine.engineType}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">ISP:</span>
              <span className="text-white ml-2">{selectedEngine.isp}s</span>
            </div>
            <div>
              <span className="text-gray-400">Burn Time:</span>
              <span className="text-white ml-2">{selectedEngine.burnTime}s</span>
            </div>
            <div>
              <span className="text-gray-400">Fuel Mass:</span>
              <span className="text-white ml-2">{(selectedEngine.fuelMass / 1000).toFixed(1)}t</span>
            </div>
            <div>
              <span className="text-gray-400">Thrust:</span>
              <span className="text-white ml-2">{(selectedEngine.thrust / 1000).toFixed(0)} kN</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};