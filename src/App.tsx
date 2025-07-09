import React, { useState } from 'react';
import { VideoIntro } from './components/VideoIntro';
import { VideoBackground } from './components/VideoBackground';
import { RocketForm } from './components/RocketForm';
import { SimulationResults } from './components/SimulationResults';
import { LaunchMap } from './components/LaunchMap';
import { useSimulation } from './hooks/useSimulation';
import { LaunchParameters } from './types/rocket';
import { Rocket, Activity, Map, BarChart3, Maximize2, Minimize2 } from 'lucide-react';

function App() {
  const [showVideo, setShowVideo] = useState(true);
  const [activeTab, setActiveTab] = useState<'form' | 'map' | 'results'>('form');
  const [formData, setFormData] = useState<LaunchParameters | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(true); // Start as fullscreen
  const { simulation, isRunning, runSimulation } = useSimulation();

  const handleVideoClick = () => {
    setShowVideo(false);
  };

  const requestFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if ((elem as any).webkitRequestFullscreen) {
      (elem as any).webkitRequestFullscreen();
    } else if ((elem as any).msRequestFullscreen) {
      (elem as any).msRequestFullscreen();
    }
    setIsFullscreen(true);
  };

  const exitFullscreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) {
      (document as any).webkitExitFullscreen();
    } else if ((document as any).msExitFullscreen) {
      (document as any).msExitFullscreen();
    }
    setIsFullscreen(false);
  };

  const toggleFullscreen = () => {
    if (isFullscreen) {
      exitFullscreen();
    } else {
      requestFullscreen();
    }
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

  // Show intro video first
  if (showVideo) {
    return <VideoIntro onVideoClick={handleVideoClick} />;
  }

  const tabs = [
    { id: 'form', label: 'Configuration', icon: <Rocket className="w-5 h-5" /> },
    { id: 'map', label: 'Launch Site', icon: <Map className="w-5 h-5" /> },
    { id: 'results', label: 'Results', icon: <BarChart3 className="w-5 h-5" /> }
  ];

  return (
    <div className="h-screen w-screen relative overflow-hidden">
      {/* Video Background */}
      <VideoBackground opacity={0.4} />
      
      {/* Header */}
      <header className="relative z-10 bg-black/90 backdrop-blur-md border-b border-gray-800/50">
        <div className="w-full px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-600 rounded-lg">
                <Rocket className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Rocket Simulation Suite</h1>
                <p className="text-xs text-gray-400">Advanced trajectory modeling and optimization</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-green-500" />
                <span className="text-xs text-gray-400">System Online</span>
              </div>
              <button
                onClick={toggleFullscreen}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4 text-gray-400" />
                ) : (
                  <Maximize2 className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="relative z-10 bg-gray-900/90 backdrop-blur-md border-b border-gray-800/50">
        <div className="w-full px-6">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`
                  flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm
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
      <main className="relative z-10 w-full h-[calc(100vh-7rem)] overflow-y-auto px-6 py-6">
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

      {/* Compact Footer */}
      <footer className="absolute bottom-0 left-0 right-0 z-10 bg-black/90 backdrop-blur-md border-t border-gray-800/50">
        <div className="w-full px-6 py-2">
          <div className="text-center text-gray-500 text-xs">
            © 2025 Rocket Simulation Suite
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;