import React from 'react';
import { HatchTimer } from '@/types/game';

interface HatchTimerComponentProps {
  timer: HatchTimer;
  onManualFinalize?: (requestId: number) => void;
}

const HatchTimerComponent: React.FC<HatchTimerComponentProps> = ({ 
  timer, 
  onManualFinalize 
}) => {
  const getStageEmoji = (stage: HatchTimer['stage']) => {
    switch (stage) {
      case 'waiting': return '🥚';
      case 'incubating': return '🔥';
      case 'almost_ready': return '✨';
      case 'hatched': return '🐣';
      default: return '🥚';
    }
  };

  const getStageMessage = (stage: HatchTimer['stage'], progress: number) => {
    switch (stage) {
      case 'waiting': 
        return 'Requesting randomness from Chainlink VRF...';
      case 'incubating': 
        return 'VRF oracle is generating secure randomness...';
      case 'almost_ready': 
        return 'Almost ready! Finalizing hybrid creation...';
      case 'hatched': 
        return 'Your new hybrid entity has hatched! 🎉';
      default: 
        return 'Processing...';
    }
  };

  const getProgressColor = (stage: HatchTimer['stage']) => {
    switch (stage) {
      case 'waiting': return 'bg-blue-500';
      case 'incubating': return 'bg-orange-500';
      case 'almost_ready': return 'bg-green-500';
      case 'hatched': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const formatTimeRemaining = (progress: number, duration: number) => {
    if (progress >= 1) return 'Complete!';
    
    const remaining = Math.max(0, duration - (progress * duration));
    const minutes = Math.floor(remaining / 60);
    const seconds = Math.floor(remaining % 60);
    
    if (minutes > 0) {
      return `~${minutes}m ${seconds}s remaining`;
    }
    return `~${seconds}s remaining`;
  };

  const progressPercentage = Math.round(timer.progress * 100);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-purple-200 max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-4">
        <div className="text-4xl mb-2 animate-bounce">
          {getStageEmoji(timer.stage)}
        </div>
        <h3 className="text-lg font-bold text-gray-800">
          {timer.entity1Name} + {timer.entity2Name}
        </h3>
        <p className="text-sm text-gray-600">
          Merge Request #{timer.requestId}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progress</span>
          <span>{progressPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ease-out ${getProgressColor(timer.stage)}`}
            style={{ width: `${progressPercentage}%` }}
          >
            {timer.stage === 'incubating' && (
              <div className="w-full h-full bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
            )}
          </div>
        </div>
      </div>

      {/* Stage Message */}
      <div className="text-center mb-4">
        <p className="text-sm text-gray-700 mb-1">
          {getStageMessage(timer.stage, timer.progress)}
        </p>
        <p className="text-xs text-gray-500">
          {formatTimeRemaining(timer.progress, timer.duration)}
        </p>
      </div>

      {/* VRF Information */}
      <div className="bg-blue-50 rounded-lg p-3 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-blue-600">🔗</span>
          <span className="text-sm font-medium text-blue-800">Chainlink VRF</span>
        </div>
        <p className="text-xs text-blue-700">
          Using verifiable random function for fair and tamper-proof randomness generation.
        </p>
      </div>

      {/* Manual Finalize Button (shows after expected time) */}
      {timer.progress >= 1 && timer.stage !== 'hatched' && onManualFinalize && (
        <div className="text-center">
          <button
            onClick={() => onManualFinalize(timer.requestId)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          >
            Try Manual Finalize
          </button>
          <p className="text-xs text-gray-500 mt-1">
            VRF may take longer than expected sometimes
          </p>
        </div>
      )}

      {/* Success Animation */}
      {timer.stage === 'hatched' && (
        <div className="text-center">
          <div className="text-2xl animate-pulse">🎉</div>
          <p className="text-green-600 font-medium mt-2">
            Hybrid entity created successfully!
          </p>
        </div>
      )}
    </div>
  );
};

export default HatchTimerComponent;