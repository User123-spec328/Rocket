import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onRetry }) => {
  return (
    <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-6 text-center">
      <div className="flex items-center justify-center gap-2 mb-4">
        <AlertTriangle className="w-8 h-8 text-red-500" />
        <h3 className="text-xl font-semibold text-red-400">Simulation Error</h3>
      </div>
      <p className="text-gray-300 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 mx-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      )}
    </div>
  );
};