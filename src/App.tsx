import React, { useState } from 'react';
import { VideoIntro } from './components/VideoIntro';
import { RocketForm } from './components/RocketForm';
import { SimulationResults } from './components/SimulationResults';
import { LaunchMap } from './components/LaunchMap';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorMessage } from './components/ErrorMessage';
import { useSimulation } from './hooks/useSimulation';
import { LaunchParameters } from './types/rocket';
import { Rocket, Activity, Map, BarChart3 } from 'lucide-react';

function App() {
  const [showVideo, setShowVideo] = useState(true);
  const [activeTab, setActiveTab] = useState<'form' | 'map' | 'results'>('form');
  const [formData, setFormData] = useState<LaunchParameters | null>(null);
  const { simulation, isRunning, runSimulation } = useSimulation();

  const handleVideoClick = () => {
    setShowVideo(false);
  };

  const handleFormSubmit = async (data: LaunchParameters) => {
    setFormData(data);
    await runSimulation(data);
    setActiveTab('results');
  };

  const handleCoordinateChange = (lat: number, lng: number) => {
    if (formData) {
      setFormData({
        ...formData,
        latitude: lat,
        longitude: lng
      });
    }
  };

  if (showVideo) {
    return <VideoIntro onVideoClick={handleVideoClick} />;
  }

  const tabs = [
    { id: 'form', label: 'Configuration', icon: <Rocket className="w-5 h-5" /> },
    { id: 'map', label: 'Launch Site', icon: <Map className="w-5 h-5" /> },
    { id: 'results', label: 'Results', icon: <BarChart3 className="w-5 h-5" /> }
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-black border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-600 rounded-lg">
                <Rocket className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Rocket Simulation Suite</h1>
                <p className="text-sm text-gray-400">Advanced trajectory modeling and optimization</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-500" />
              <span className="text-sm text-gray-400">System Online</span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                  transition-colors duration-200
                  ${activeTab === tab.id
                    ? 'border-red-500 text-red-500'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                  }
                `}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'form' && (
          <RocketForm onSubmit={handleFormSubmit} isLoading={isRunning} />
        )}

        {activeTab === 'map' && formData && (
          <LaunchMap
            latitude={formData.latitude}
            longitude={formData.longitude}
            onCoordinateChange={handleCoordinateChange}
          />
        )}

        {activeTab === 'results' && (
          <div className="space-y-8">
            {isRunning && (
              <LoadingSpinner message="Running trajectory simulation..." />
            )}
            
            {simulation && !isRunning && (
              <SimulationResults result={simulation} />
            )}

            {!simulation && !isRunning && (
              <div className="text-center py-16">
                <Rocket className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No simulation results yet. Configure your rocket and launch!</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-black border-t border-gray-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-400 text-sm">
            <p>© 2025 Rocket Simulation Suite - Advanced Aerospace Modeling Platform</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;