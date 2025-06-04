"use client";

import PendingMerge from "./PendingMerge";
import { HatchTimer } from "@/types/game";

interface PendingMergeListProps {
  pendingRequests: bigint[];
  hatchTimers: Map<bigint, HatchTimer>;
  autoFinalizingRequests: Set<bigint>;
  onFinalize?: (requestId: bigint) => void;
  onCancel?: (requestId: bigint) => void;
  address?: string;
  className?: string;
}

export default function PendingMergeList({
  pendingRequests,
  hatchTimers,
  autoFinalizingRequests,
  onFinalize,
  onCancel,
  address,
  className = "",
}: PendingMergeListProps) {
  if (pendingRequests.length === 0) {
    return (
      <div
        className={`bg-black/20 backdrop-blur-lg border border-gray-500/30 rounded-xl p-6 text-center ${className}`}
      >
        <div className="text-4xl mb-2">🧬</div>
        <h3 className="text-gray-300 font-bold text-lg mb-2">
          No Pending Merges
        </h3>
        <p className="text-gray-400 text-sm">
          Start a new merge to create hybrid entities!
        </p>
      </div>
    );
  }

  // Sort pending requests to show newest first
  const sortedRequests = [...pendingRequests].sort((a, b) => {
    const aTimer = hatchTimers.get(a);
    const bTimer = hatchTimers.get(b);

    // Show hatched requests at the top
    if (aTimer?.stage === "hatched" && bTimer?.stage !== "hatched") return -1;
    if (bTimer?.stage === "hatched" && aTimer?.stage !== "hatched") return 1;

    // Then sort by start time (newest first)
    if (aTimer && bTimer) {
      return bTimer.startTime - aTimer.startTime;
    }

    // Fallback to request ID comparison
    return Number(b - a);
  });

  const completedCount = sortedRequests.filter(
    (requestId) => hatchTimers.get(requestId)?.stage === "hatched"
  ).length;

  const activeCount = sortedRequests.length - completedCount;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">🧪</div>
          <div>
            <h2 className="font-bold text-yellow-300 text-lg">
              Pending Merges
            </h2>
            <p className="text-yellow-200/70 text-sm">
              {activeCount} active, {completedCount} completed
            </p>
          </div>
        </div>

        {/* Status Overview */}
        <div className="flex space-x-2">
          {activeCount > 0 && (
            <div className="bg-blue-500/20 border border-blue-400/50 text-blue-300 px-2 py-1 rounded-full text-xs font-bold">
              {activeCount} ACTIVE
            </div>
          )}
          {completedCount > 0 && (
            <div className="bg-green-500/20 border border-green-400/50 text-green-300 px-2 py-1 rounded-full text-xs font-bold">
              {completedCount} DONE
            </div>
          )}
        </div>
      </div>

      {/* Merge List */}
      <div className="space-y-3">
        {sortedRequests.map((requestId) => (
          <PendingMerge
            key={requestId.toString()}
            requestId={requestId}
            hatchTimer={hatchTimers.get(requestId)}
            autoFinalizingRequests={autoFinalizingRequests}
            onFinalize={onFinalize}
            onCancel={onCancel}
            address={address}
          />
        ))}
      </div>

      {/* Auto-finalization Status */}
      {autoFinalizingRequests.size > 0 && (
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-center space-x-2 mb-2">
            <div className="animate-pulse text-blue-400">⚡</div>
            <span className="text-blue-300 font-bold text-sm">
              Auto-Finalization Active
            </span>
          </div>
          <p className="text-blue-200/70 text-xs">
            {autoFinalizingRequests.size} merge
            {autoFinalizingRequests.size === 1 ? "" : "s"} being automatically
            finalized. The system will complete them once VRF randomness is
            fulfilled.
          </p>
        </div>
      )}
    </div>
  );
}
