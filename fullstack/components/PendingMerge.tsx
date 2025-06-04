"use client";

import { HatchTimer } from "@/types/game";
import { useState, useEffect } from "react";

interface PendingMergeProps {
  requestId: bigint;
  hatchTimer?: HatchTimer;
  autoFinalizingRequests: Set<bigint>;
  onFinalize?: (requestId: bigint) => void;
  onCancel?: (requestId: bigint) => void;
  address?: string;
}

export default function PendingMerge({
  requestId,
  hatchTimer,
  autoFinalizingRequests,
  onFinalize,
  onCancel,
  address,
}: PendingMergeProps) {
  const [mergeDetails, setMergeDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manualFinalizeTrying, setManualFinalizeTrying] = useState(false);

  // Fetch merge request details
  useEffect(() => {
    const fetchMergeDetails = async () => {
      if (!address) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/game/diagnostics?address=${address}`
        );
        const data = await response.json();

        if (data.success && data.player.pendingRequests) {
          // Find the specific request details
          const requestIdString = requestId.toString();
          // For now, we'll use the hatch timer data if available
          if (hatchTimer) {
            setMergeDetails({
              requestId: requestIdString,
              entity1Name: hatchTimer.entity1Name,
              entity2Name: hatchTimer.entity2Name,
              timestamp: new Date().toISOString(), // Fallback timestamp
            });
          } else {
            setMergeDetails({
              requestId: requestIdString,
              entity1Name: "Unknown",
              entity2Name: "Unknown",
              timestamp: new Date().toISOString(),
            });
          }
        }
      } catch (err: any) {
        console.error("Failed to fetch merge details:", err);
        setError("Failed to load merge details");
      } finally {
        setLoading(false);
      }
    };

    fetchMergeDetails();
  }, [requestId, address, hatchTimer]);

  const handleManualFinalize = async () => {
    if (!onFinalize || manualFinalizeTrying) return;

    setManualFinalizeTrying(true);
    try {
      await onFinalize(requestId);
    } catch (error) {
      console.error("Manual finalize failed:", error);
    } finally {
      setManualFinalizeTrying(false);
    }
  };

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case "waiting":
        return "⏳";
      case "incubating":
        return "🥚";
      case "almost_ready":
        return "✨";
      case "hatched":
        return "🎉";
      default:
        return "⏳";
    }
  };

  const getStageMessage = (stage: string) => {
    switch (stage) {
      case "waiting":
        return "Waiting for VRF...";
      case "incubating":
        return "Incubating hybrid...";
      case "almost_ready":
        return "Almost ready!";
      case "hatched":
        return "Hatched!";
      default:
        return "Processing...";
    }
  };

  const formatTimeRemaining = (timer: HatchTimer) => {
    const now = Date.now();
    const remaining = Math.max(0, timer.endTime - now) / 1000;

    if (remaining <= 0) return "Ready!";

    const minutes = Math.floor(remaining / 60);
    const seconds = Math.floor(remaining % 60);

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const isAutoFinalizing = autoFinalizingRequests.has(requestId);
  const isCompleted = hatchTimer?.stage === "hatched";

  if (loading) {
    return (
      <div className="bg-black/40 backdrop-blur-lg border border-yellow-500/30 rounded-xl p-4 animate-pulse">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-yellow-500/20 rounded-full"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-yellow-500/20 rounded w-3/4"></div>
            <div className="h-3 bg-yellow-500/20 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black/40 backdrop-blur-lg border border-yellow-500/30 rounded-xl p-4 shadow-lg shadow-yellow-500/10 transition-all duration-300 hover:border-yellow-400/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="text-2xl">
            {hatchTimer ? getStageIcon(hatchTimer.stage) : "⏳"}
          </div>
          <div>
            <h3 className="font-bold text-yellow-300 text-sm">
              MERGE REQUEST #{requestId.toString().slice(0, 8)}...
            </h3>
            <p className="text-xs text-yellow-200/70 font-mono">
              {hatchTimer ? getStageMessage(hatchTimer.stage) : "Processing..."}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div
          className={`px-2 py-1 rounded-full text-xs font-bold border ${
            isCompleted
              ? "bg-green-500/20 border-green-400/50 text-green-300"
              : isAutoFinalizing
              ? "bg-blue-500/20 border-blue-400/50 text-blue-300"
              : "bg-yellow-500/20 border-yellow-400/50 text-yellow-300"
          }`}
        >
          {isCompleted ? "COMPLETE" : isAutoFinalizing ? "AUTO" : "PENDING"}
        </div>
      </div>

      {/* Merge Details */}
      {mergeDetails && (
        <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-lg p-3 mb-3">
          <div className="flex items-center justify-center space-x-2 text-sm">
            <span className="text-yellow-200 font-medium">
              {mergeDetails.entity1Name}
            </span>
            <span className="text-yellow-400">+</span>
            <span className="text-yellow-200 font-medium">
              {mergeDetails.entity2Name}
            </span>
            <span className="text-yellow-400">→</span>
            <span className="text-yellow-300 font-bold">?</span>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {hatchTimer && (
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-yellow-300 font-mono">Progress</span>
            <span className="text-xs text-yellow-200 font-mono">
              {hatchTimer.stage === "hatched"
                ? "Complete!"
                : formatTimeRemaining(hatchTimer)}
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                hatchTimer.stage === "hatched"
                  ? "bg-gradient-to-r from-green-400 to-emerald-500"
                  : hatchTimer.stage === "almost_ready"
                  ? "bg-gradient-to-r from-yellow-400 to-orange-500"
                  : hatchTimer.stage === "incubating"
                  ? "bg-gradient-to-r from-blue-400 to-cyan-500"
                  : "bg-gradient-to-r from-gray-400 to-yellow-400"
              }`}
              style={{ width: `${Math.min(hatchTimer.progress * 100, 100)}%` }}
            />
          </div>
          <div className="text-center mt-1">
            <span className="text-xs text-yellow-200/60 font-mono">
              {Math.round(hatchTimer.progress * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Status Messages */}
      {isAutoFinalizing && !isCompleted && (
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-2 mb-3">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-400"></div>
            <span className="text-xs text-blue-200">
              Auto-finalizing in progress...
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-2 mb-3">
          <span className="text-xs text-red-200">{error}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-2">
        {/* Manual Finalize Button */}
        {onFinalize && !isCompleted && !isAutoFinalizing && (
          <button
            onClick={handleManualFinalize}
            disabled={manualFinalizeTrying}
            className="flex-1 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 disabled:opacity-50 text-white font-bold text-xs py-2 px-3 rounded-lg transition-all duration-300 shadow-lg hover:shadow-yellow-500/20"
          >
            {manualFinalizeTrying ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-3 w-3 border-b border-white mr-1"></div>
                FINALIZING
              </span>
            ) : (
              "🚀 FINALIZE NOW"
            )}
          </button>
        )}

        {/* Cancel Button (if available) */}
        {onCancel && !isCompleted && !isAutoFinalizing && (
          <button
            onClick={() => onCancel(requestId)}
            className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 hover:text-red-200 text-xs font-medium rounded-lg border border-red-500/30 hover:border-red-400/50 transition-all duration-300"
          >
            ✕
          </button>
        )}

        {/* Completed State */}
        {isCompleted && (
          <div className="flex-1 bg-green-600/20 border border-green-500/30 text-green-300 text-xs font-bold py-2 px-3 rounded-lg text-center">
            ✅ MERGE COMPLETED
          </div>
        )}
      </div>

      {/* Technical Details (Expandable) */}
      <details className="mt-3 group">
        <summary className="cursor-pointer text-xs text-yellow-300/60 hover:text-yellow-300/80 transition-colors">
          Technical Details
        </summary>
        <div className="mt-2 bg-black/40 border border-yellow-500/20 rounded-lg p-2 text-xs font-mono space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-400">Request ID:</span>
            <span className="text-yellow-200">{requestId.toString()}</span>
          </div>
          {hatchTimer && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-400">Started:</span>
                <span className="text-yellow-200">
                  {new Date(hatchTimer.startTime).toLocaleTimeString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Expected:</span>
                <span className="text-yellow-200">
                  {new Date(hatchTimer.endTime).toLocaleTimeString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Duration:</span>
                <span className="text-yellow-200">{hatchTimer.duration}s</span>
              </div>
            </>
          )}
          <div className="flex justify-between">
            <span className="text-gray-400">Auto-finalizing:</span>
            <span
              className={isAutoFinalizing ? "text-green-300" : "text-red-300"}
            >
              {isAutoFinalizing ? "Yes" : "No"}
            </span>
          </div>
        </div>
      </details>
    </div>
  );
}
