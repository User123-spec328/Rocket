import React from 'react';
import { Rocket } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 bg-gray-900/80 backdrop-blur-sm rounded-xl border border-gray-700">
      <div className="relative">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-700 border-t-red-500"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Rocket className="w-6 h-6 text-red-500 animate-pulse" />
        </div>
      </div>
      <p className="mt-4 text-gray-400 text-sm">{message}</p>
    </div>
  );
};