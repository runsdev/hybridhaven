/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { useGame } from "@/hooks/useGame";
import { Entity } from "@/types/game";
import { useState, useEffect } from "react";
import { formatIPFSUrl } from "@/lib/utils";

export default function HybridHaven() {
  const {
    gameState,
    mergeInProgress,
    autoFinalizingRequests,
    hatchTimers,
    connectWallet,
    claimStarterEntity,
    requestMerge,
    refreshData,
    clearError,
    addNFTToWallet,
  } = useGame();

  const [selectedEntities, setSelectedEntities] = useState<(string | number)[]>(
    []
  );
  const [showSuccess, setShowSuccess] = useState<string | null>(null);
  const [selectedEntityForDetails, setSelectedEntityForDetails] =
    useState<Entity | null>(null);
  const [isMergeMode, setIsMergeMode] = useState(false);
  const [hasStarterCheck, setHasStarterCheck] = useState<{
    loading: boolean;
    hasStarter: boolean;
  }>({ loading: true, hasStarter: false });

  // Check if user has starter entities from blockchain
  useEffect(() => {
    const checkStarterStatus = async () => {
      if (!gameState.connected || !gameState.address) {
        setHasStarterCheck({ loading: false, hasStarter: false });
        return;
      }

      setHasStarterCheck({ loading: true, hasStarter: false });

      try {
        const response = await fetch(
          `/api/game/entities?address=${gameState.address}`
        );
        const data = await response.json();

        if (data.success) {
          // Check if user has any starter entities
          const hasStarters =
            data.entities?.some((entity: any) => entity.isStarter) || false;
          setHasStarterCheck({ loading: false, hasStarter: hasStarters });
        } else {
          setHasStarterCheck({ loading: false, hasStarter: false });
        }
      } catch (error) {
        console.error("Error checking starter status:", error);
        setHasStarterCheck({ loading: false, hasStarter: false });
      }
    };

    checkStarterStatus();
  }, [gameState.connected, gameState.address, gameState.entities]);

  const handleEntitySelect = (identifier: string | number) => {
    setSelectedEntities((prev) => {
      if (prev.includes(identifier)) {
        return prev.filter((id) => id !== identifier);
      }
      if (prev.length < 2) {
        return [...prev, identifier];
      }
      return [prev[1], identifier]; // Replace first selection
    });
  };

  const handleEntityClick = (entity: Entity) => {
    if (isMergeMode) {
      // Use name for starters, tokenId for hybrids
      const identifier = entity.isStarter ? entity.name : entity.tokenId;
      handleEntitySelect(identifier);
    } else {
      // If not in merge mode, show details modal
      setSelectedEntityForDetails(entity);
    }
  };

  const toggleMergeMode = () => {
    setIsMergeMode(!isMergeMode);
    // Clear selections when switching modes
    setSelectedEntities([]);
  };

  const handleMerge = async () => {
    if (selectedEntities.length === 2 && !mergeInProgress) {
      try {
        // Find the actual entity objects from the selected entity identifiers
        const entity1 = gameState.entities.find((e) =>
          e.isStarter
            ? e.name === selectedEntities[0]
            : e.tokenId === selectedEntities[0]
        );
        const entity2 = gameState.entities.find((e) =>
          e.isStarter
            ? e.name === selectedEntities[1]
            : e.tokenId === selectedEntities[1]
        );

        if (!entity1 || !entity2) {
          throw new Error("Selected entities not found");
        }

        await requestMerge(entity1, entity2);
        setSelectedEntities([]);
        setShowSuccess(
          "🚀 Merge request submitted! Your hybrid is being created automatically and will appear shortly."
        );
        setTimeout(() => setShowSuccess(null), 8000);
      } catch (error) {
        console.error("Merge failed:", error);
      }
    }
  };

  const handleClaimStarter = async () => {
    try {
      await claimStarterEntity();
      setShowSuccess("Complete starter collection claimed successfully!");
      setTimeout(() => setShowSuccess(null), 5000);
    } catch (error) {
      console.error("Claim failed:", error);
      // Error is handled by the hook
    }
  };

  const hasStarterEntity = hasStarterCheck.hasStarter;

  if (!gameState.connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center relative overflow-hidden">
        {/* Cyberpunk background effects */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-magenta-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-3/4 left-1/2 w-64 h-64 bg-green-500/20 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>

        <div className="text-center space-y-8 max-w-4xl mx-auto px-4 relative z-10">
          <div className="space-y-4">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-cyan-400 via-magenta-400 to-green-400 bg-clip-text text-transparent mb-4 animate-pulse">
              🎮 HybridHaven
            </h1>
            <div className="text-cyan-300 text-sm uppercase tracking-widest font-mono mb-2">
              [NEURAL_NEXUS_ACTIVE]
            </div>
            <p className="text-xl text-cyan-200 max-w-2xl mx-auto leading-relaxed">
              Discover. Merge. Evolve. Create unique hybrid creatures through
              the power of Web3 and AI.
            </p>
          </div>

          <div className="bg-black/40 backdrop-blur-lg border border-cyan-500/30 rounded-2xl p-6 space-y-4 shadow-2xl shadow-cyan-500/10">
            <h2 className="text-2xl font-bold text-cyan-300 flex items-center justify-center">
              <span className="mr-2">🌟</span>
              SYSTEM_FEATURES
              <span className="ml-2">🌟</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div className="space-y-3">
                <div className="text-cyan-200 bg-cyan-900/20 border border-cyan-500/20 rounded-xl p-3 hover:border-cyan-400/40 transition-all duration-300">
                  <span className="text-green-400">🎁</span>{" "}
                  <strong className="text-white">
                    Free Starter Collection:
                  </strong>{" "}
                  35 unique entities
                </div>
                <div className="text-cyan-200 bg-magenta-900/20 border border-magenta-500/20 rounded-xl p-3 hover:border-magenta-400/40 transition-all duration-300">
                  <span className="text-magenta-400">⚡</span>{" "}
                  <strong className="text-white">Entity Merging:</strong>{" "}
                  Combine any two entities
                </div>
                <div className="text-cyan-200 bg-green-900/20 border border-green-500/20 rounded-xl p-3 hover:border-green-400/40 transition-all duration-300">
                  <span className="text-yellow-400">🎲</span>{" "}
                  <strong className="text-white">Verifiable Randomness:</strong>{" "}
                  Chainlink VRF powered
                </div>
              </div>
              <div className="space-y-3">
                <div className="text-cyan-200 bg-blue-900/20 border border-blue-500/20 rounded-xl p-3 hover:border-blue-400/40 transition-all duration-300">
                  <span className="text-blue-400">🤖</span>{" "}
                  <strong className="text-white">AI-Generated Images:</strong>{" "}
                  Unique hybrid artwork
                </div>
                <div className="text-cyan-200 bg-purple-900/20 border border-purple-500/20 rounded-xl p-3 hover:border-purple-400/40 transition-all duration-300">
                  <span className="text-purple-400">📦</span>{" "}
                  <strong className="text-white">IPFS Storage:</strong>{" "}
                  Decentralized NFT storage
                </div>
                <div className="text-cyan-200 bg-yellow-900/20 border border-yellow-500/20 rounded-xl p-3 hover:border-yellow-400/40 transition-all duration-300">
                  <span className="text-orange-400">🏆</span>{" "}
                  <strong className="text-white">5-Star Rarity System:</strong>{" "}
                  From common to legendary
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <button
              onClick={connectWallet}
              disabled={gameState.loading}
              className="bg-gradient-to-r from-cyan-600 via-magenta-600 to-green-600 hover:from-cyan-500 hover:via-magenta-500 hover:to-green-500 disabled:opacity-50 text-black font-bold py-4 px-8 rounded-2xl text-lg transition-all duration-300 transform hover:scale-105 shadow-2xl shadow-cyan-500/25 border border-cyan-400/30 hover:border-cyan-300/50 hover:shadow-cyan-400/40"
            >
              {gameState.loading ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mr-3"></div>
                  CONNECTING_TO_NEXUS...
                </span>
              ) : (
                <span className="flex items-center">
                  🔗 CONNECT_WALLET
                  <span className="ml-2 text-xs opacity-70">[NEURAL_LINK]</span>
                </span>
              )}
            </button>

            {gameState.error && (
              <div className="bg-red-500/20 backdrop-blur-lg border border-red-400/50 text-red-200 px-4 py-3 rounded-2xl max-w-md mx-auto shadow-lg shadow-red-500/20">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm">
                    ERROR: {gameState.error}
                  </span>
                  <button
                    onClick={clearError}
                    className="ml-2 text-red-300 hover:text-red-100 text-lg hover:bg-red-500/20 rounded-full w-6 h-6 flex items-center justify-center transition-all duration-200"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 relative">
      {/* Cyberpunk background effects */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-magenta-500/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-green-500/30 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Header */}
      <header className="border-b border-cyan-500/30 bg-black/40 backdrop-blur-lg sticky top-0 z-50 shadow-lg shadow-cyan-500/10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-magenta-400 bg-clip-text text-transparent">
            🎮 HybridHaven
          </h1>
          <div className="flex items-center space-x-6">
            <button
              onClick={refreshData}
              disabled={gameState.loading}
              className="text-cyan-300 hover:text-cyan-100 transition-all duration-300 hover:bg-cyan-500/20 rounded-full p-2"
              title="Refresh data"
            >
              <div
                className={`text-xl ${gameState.loading ? "animate-spin" : ""}`}
              >
                🔄
              </div>
            </button>
            <div className="text-cyan-200 text-sm font-mono bg-cyan-900/20 border border-cyan-500/30 rounded-xl px-3 py-1">
              {gameState.address?.slice(0, 6)}...{gameState.address?.slice(-4)}
            </div>
            <div className="text-magenta-200 text-sm font-medium bg-magenta-900/20 border border-magenta-500/30 rounded-xl px-3 py-1">
              {gameState.entities.length} ENTITIES
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Success Message */}
        {showSuccess && (
          <div className="bg-green-500/20 backdrop-blur-lg border border-green-400/50 text-green-200 px-4 py-3 rounded-2xl mb-6 animate-pulse shadow-lg shadow-green-500/20">
            <div className="flex items-center justify-between">
              <span className="font-mono">✅ {showSuccess}</span>
              <button
                onClick={() => setShowSuccess(null)}
                className="ml-2 text-green-300 hover:text-green-100 hover:bg-green-500/20 rounded-full w-6 h-6 flex items-center justify-center transition-all duration-200"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {gameState.error && (
          <div className="bg-red-500/20 backdrop-blur-lg border border-red-400/50 text-red-200 px-4 py-3 rounded-2xl mb-6 shadow-lg shadow-red-500/20">
            <div className="flex items-center justify-between">
              <span className="font-mono">❌ ERROR: {gameState.error}</span>
              <button
                onClick={clearError}
                className="ml-2 text-red-300 hover:text-red-100 hover:bg-red-500/20 rounded-full w-6 h-6 flex items-center justify-center transition-all duration-200"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Starter Entity Section */}
        {!hasStarterEntity && (
          <div className="bg-gradient-to-r from-green-900/30 via-blue-900/30 to-cyan-900/30 backdrop-blur-lg border border-green-400/30 rounded-2xl p-6 mb-8 shadow-2xl shadow-green-500/10">
            <h2 className="text-2xl font-bold text-green-300 mb-4 flex items-center">
              <span className="mr-2">🌟</span>
              WELCOME_TO_THE_NEXUS
              <span className="ml-2">🌟</span>
            </h2>
            <p className="text-cyan-200 mb-4 font-mono text-sm">
              [INITIALIZING_NEURAL_SEQUENCE] Claim your complete starter
              collection to begin your journey of discovery and evolution.
            </p>
            <div className="bg-blue-900/20 border border-blue-400/30 rounded-2xl p-4 mb-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-blue-300 mb-3 flex items-center">
                🎁 STARTER_PACKAGE [35_ENTITIES]:
                <span className="ml-2 text-xs text-cyan-400 bg-cyan-900/30 px-2 py-1 rounded-full">
                  NEURAL_ENHANCED
                </span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-sm text-cyan-300">
                {/*
                  List of starter entities (abbreviated for brevity)
                */}
              </div>
              <p className="text-yellow-300 mt-4 text-sm font-semibold bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-3">
                ✨ PROTOCOL_NOTE: All entities start at 1-star rarity and can be
                merged to create higher rarity hybrids!
              </p>
            </div>
            <button
              onClick={handleClaimStarter}
              disabled={gameState.loading}
              className="bg-gradient-to-r from-green-600 via-cyan-600 to-blue-600 hover:from-green-500 hover:via-cyan-500 hover:to-blue-500 disabled:opacity-50 text-black font-bold py-3 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-2xl shadow-green-500/25 border border-green-400/30 hover:border-green-300/50"
            >
              {gameState.loading ? (
                <span className="flex items-center font-mono">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black mr-3"></div>
                  CLAIMING_COLLECTION...
                </span>
              ) : (
                <span className="flex items-center font-mono">
                  🎁 CLAIM_STARTER_COLLECTION
                  <span className="ml-2 text-xs opacity-70">[NEURAL_SYNC]</span>
                </span>
              )}
            </button>
          </div>
        )}

        {/* Merge Section */}
        {gameState.entities.length >= 2 && (
          <div className="bg-black/40 backdrop-blur-lg border border-magenta-500/30 rounded-2xl p-6 mb-8 shadow-2xl shadow-magenta-500/10">
            <h2 className="text-2xl font-bold text-magenta-300 mb-4 flex items-center">
              <span className="mr-2">⚡</span>
              FUSION_LABORATORY
              <span className="ml-2 text-xs text-cyan-400 bg-cyan-900/30 px-2 py-1 rounded-full">
                ACTIVE
              </span>
            </h2>
            <p className="text-cyan-200 mb-4 font-mono text-sm">
              [NEURAL_FUSION_PROTOCOL] Select two entities to merge them into a
              unique hybrid creature with AI-generated artwork!
            </p>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <div className="text-magenta-200 font-mono bg-magenta-900/20 border border-magenta-500/30 rounded-xl px-3 py-2">
                  SELECTED: {selectedEntities.length}/2
                  {selectedEntities.length > 0 && (
                    <span className="ml-2 text-sm text-cyan-300">
                      (#{selectedEntities.join(", #")})
                    </span>
                  )}
                </div>
                {selectedEntities.length > 0 && (
                  <button
                    onClick={() => setSelectedEntities([])}
                    className="text-gray-400 hover:text-cyan-300 text-sm hover:bg-cyan-500/20 rounded-xl px-3 py-2 transition-all duration-300 border border-gray-600/30 hover:border-cyan-500/30"
                  >
                    CLEAR_SELECTION
                  </button>
                )}
              </div>
              {selectedEntities.length === 2 && (
                <button
                  onClick={handleMerge}
                  disabled={gameState.loading || mergeInProgress}
                  className="bg-gradient-to-r from-magenta-600 via-purple-600 to-pink-600 hover:from-magenta-500 hover:via-purple-500 hover:to-pink-500 disabled:opacity-50 text-white font-bold py-2 px-6 rounded-2xl transition-all duration-300 shadow-2xl shadow-magenta-500/25 border border-magenta-400/30 hover:border-magenta-300/50"
                >
                  {mergeInProgress ? (
                    <span className="flex items-center font-mono">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      FUSING...
                    </span>
                  ) : (
                    <span className="font-mono">🔮 EXECUTE_FUSION</span>
                  )}
                </button>
              )}
            </div>

            {/* Merge Mode Toggle */}
            <div className="mt-4">
              <button
                onClick={toggleMergeMode}
                className={`w-full flex items-center justify-center px-4 py-3 rounded-2xl font-bold transition-all duration-300 shadow-lg border-2 ${
                  isMergeMode
                    ? "bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white border-red-400/50 shadow-red-500/25"
                    : "bg-gradient-to-r from-purple-600 to-magenta-600 hover:from-purple-500 hover:to-magenta-500 text-white border-purple-400/50 shadow-purple-500/25"
                }`}
              >
                <span className="font-mono">
                  {isMergeMode ? "❌ EXIT_FUSION_MODE" : "⚙️ ENTER_FUSION_MODE"}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Entities Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-cyan-300 flex items-center">
              <span className="mr-2">📦</span>
              NEURAL_COLLECTION
              <span className="ml-2 text-xs text-magenta-400 bg-magenta-900/30 px-2 py-1 rounded-full">
                ACTIVE
              </span>
            </h2>
            {gameState.entities.length > 0 && (
              <div className="text-cyan-200 text-sm font-mono bg-black/40 border border-cyan-500/30 rounded-xl px-4 py-2 backdrop-blur-sm">
                STARTERS: {gameState.entities.filter((e) => e.isStarter).length}{" "}
                • HYBRIDS:{" "}
                {gameState.entities.filter((e) => !e.isStarter).length}
              </div>
            )}
          </div>

          {gameState.loading && gameState.entities.length === 0 ? (
            <div className="text-center py-12 bg-black/20 backdrop-blur-lg border border-cyan-500/30 rounded-2xl">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
              <p className="text-cyan-200 text-lg font-mono">
                [LOADING_NEURAL_DATA...]
              </p>
            </div>
          ) : gameState.entities.length === 0 ? (
            <div className="text-center py-12 bg-black/20 backdrop-blur-lg border border-cyan-500/30 rounded-2xl">
              <div className="text-6xl mb-4">🎯</div>
              <p className="text-cyan-200 text-lg font-mono">
                [NO_ENTITIES_DETECTED]
                <br />
                <span className="text-sm text-magenta-300">
                  {!hasStarterEntity
                    ? "EXECUTE: Claim your starter collection above!"
                    : "EXECUTE: Start merging to create new entities!"}
                </span>
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {gameState.entities.map((entity, index) => {
                // Create proper identifier for each entity
                const entityIdentifier = entity.isStarter
                  ? entity.name
                  : entity.tokenId;

                return (
                  <EntityCard
                    key={
                      entity.isStarter
                        ? `starter-${entity.name}-${index}`
                        : entity.tokenId
                    }
                    entity={entity}
                    selected={selectedEntities.includes(entityIdentifier)}
                    onSelect={() => handleEntitySelect(entityIdentifier)}
                    canSelect={
                      isMergeMode &&
                      gameState.entities.length >= 2 &&
                      !mergeInProgress
                    }
                    onClick={handleEntityClick}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Legacy Pending Requests (fallback for requests without hatch timers) */}
        {gameState.pendingRequests.length > 0 &&
          Array.from(hatchTimers.values()).length === 0 && (
            <div className="mt-8 bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-4">
                ⏳ Processing Merges
              </h3>
              <div className="space-y-4">
                <p className="text-yellow-200 text-sm mb-4">
                  🚀 These merges are being completed automatically! Your new
                  hybrid creatures will appear in your collection shortly.
                </p>
                <div className="grid gap-4">
                  {gameState.pendingRequests.map((requestId) => (
                    <div
                      key={requestId}
                      className="bg-black/30 border border-yellow-500/20 rounded-lg p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="text-2xl animate-pulse">🔮</div>
                        <div>
                          <div className="text-white font-medium">
                            Merge Request #{requestId}
                          </div>
                          <div className="text-yellow-300 text-sm">
                            {autoFinalizingRequests.has(requestId)
                              ? "🤖 Auto-completing..."
                              : "⏳ Queued for processing..."}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {autoFinalizingRequests.has(requestId) ? (
                          <div className="flex items-center text-green-300 text-sm">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-300 mr-2"></div>
                            Completing...
                          </div>
                        ) : (
                          <div className="text-blue-300 text-sm">
                            ⏳ Waiting...
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-yellow-500/20">
                  <div className="text-yellow-200 text-sm">
                    ✨ Automatic completion: Your hybrids will be minted and
                    appear in your collection automatically!
                  </div>
                  <button
                    onClick={refreshData}
                    disabled={gameState.loading}
                    className="text-yellow-300 hover:text-yellow-100 text-sm underline"
                  >
                    {gameState.loading
                      ? "Refreshing..."
                      : "🔄 Refresh Collection"}
                  </button>
                </div>
              </div>
            </div>
          )}

        {/* Entity Details Modal */}
        {selectedEntityForDetails && (
          <EntityDetailsModal
            entity={selectedEntityForDetails}
            onClose={() => setSelectedEntityForDetails(null)}
            addNFTToWallet={addNFTToWallet}
          />
        )}
      </div>
    </div>
  );
}

function EntityCard({
  entity,
  selected,
  onClick,
}: {
  entity: Entity;
  selected: boolean;
  onSelect: () => void;
  canSelect: boolean;
  onClick: (entity: Entity) => void;
}) {
  const getRarityStars = (rarity: number) => "⭐".repeat(rarity);

  const getRarityColor = (rarity: number) => {
    const colors = {
      1: "border-gray-400/50 bg-gray-900/30 shadow-gray-500/20",
      2: "border-green-400/50 bg-green-900/30 shadow-green-500/20",
      3: "border-blue-400/50 bg-blue-900/30 shadow-blue-500/20",
      4: "border-purple-400/50 bg-purple-900/30 shadow-purple-500/20",
      5: "border-yellow-400/50 bg-yellow-900/30 shadow-yellow-500/20",
    };
    return (
      colors[rarity as keyof typeof colors] ||
      "border-gray-400/50 bg-gray-900/30 shadow-gray-500/20"
    );
  };

  const getRarityHoverGlow = (rarity: number) => {
    const glows = {
      1: "hover:shadow-gray-400/40 hover:border-gray-300/70",
      2: "hover:shadow-green-400/40 hover:border-green-300/70",
      3: "hover:shadow-blue-400/40 hover:border-blue-300/70",
      4: "hover:shadow-purple-400/40 hover:border-purple-300/70",
      5: "hover:shadow-yellow-400/40 hover:border-yellow-300/70",
    };
    return (
      glows[rarity as keyof typeof glows] ||
      "hover:shadow-gray-400/40 hover:border-gray-300/70"
    );
  };

  const getRarityName = (rarity: number) => {
    const names = {
      1: "COMMON",
      2: "UNCOMMON",
      3: "RARE",
      4: "EPIC",
      5: "LEGENDARY",
    };
    return names[rarity as keyof typeof names] || "COMMON";
  };

  return (
    <div
      className={`
        relative rounded-2xl p-4 transition-all duration-300 transform hover:scale-105 cursor-pointer backdrop-blur-lg
        ${getRarityColor(entity.rarity)}
        ${getRarityHoverGlow(entity.rarity)}
        ${
          selected
            ? "ring-2 ring-cyan-400 ring-offset-2 ring-offset-black shadow-2xl shadow-cyan-400/50 scale-105"
            : ""
        }
        border-2 hover:shadow-2xl group
      `}
      onClick={() => onClick(entity)}
    >
      {/* Cyberpunk corner decorations */}
      <div className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2 border-cyan-400/60 rounded-tl-lg"></div>
      <div className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 border-cyan-400/60 rounded-tr-lg"></div>
      <div className="absolute bottom-2 left-2 w-3 h-3 border-l-2 border-b-2 border-cyan-400/60 rounded-bl-lg"></div>
      <div className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 border-cyan-400/60 rounded-br-lg"></div>

      {/* Entity Image with cyberpunk styling */}
      <div className="aspect-square bg-gradient-to-br from-gray-800/80 via-black/60 to-gray-800/80 rounded-xl mb-4 flex items-center justify-center overflow-hidden border border-cyan-500/30 shadow-inner">
        {entity.imageURI && entity.imageURI !== "" ? (
          <img
            src={formatIPFSUrl(entity.imageURI)}
            alt={entity.name}
            className="w-full h-full object-cover transition-all duration-300 group-hover:brightness-110 group-hover:contrast-110"
            onError={(e) => {
              // Fallback to emoji if image fails to load
              e.currentTarget.style.display = "none";
              const fallback = e.currentTarget
                .nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = "flex";
            }}
          />
        ) : null}
        {entity.isStarter && (
          <div className="text-4xl flex items-center justify-center w-full h-full transition-all duration-300 group-hover:scale-110">
            {getStarterEmoji(entity.name)}
          </div>
        )}

        {/* Glowing overlay effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-cyan-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>

      {/* Entity Info with cyberpunk styling */}
      <div className="space-y-3">
        <h3
          className="font-bold text-white text-lg truncate group-hover:text-cyan-100 transition-colors duration-300"
          title={entity.name}
        >
          {entity.name}
        </h3>

        <div className="flex items-center justify-between">
          <span className="text-sm text-cyan-300 font-mono bg-cyan-900/30 px-2 py-1 rounded-lg border border-cyan-500/30">
            #{entity.tokenId}
          </span>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-mono">
              {getRarityStars(entity.rarity)}
            </span>
            <span className="text-xs text-gray-300 font-mono bg-black/40 px-2 py-1 rounded-lg uppercase tracking-wide">
              {getRarityName(entity.rarity)}
            </span>
          </div>
        </div>

        {!entity.isStarter && entity.parent1 && entity.parent2 && (
          <div className="text-xs text-magenta-300 bg-magenta-900/30 border border-magenta-500/30 rounded-xl px-3 py-2 font-mono">
            <span className="text-magenta-400">◆</span> {entity.parent1} +{" "}
            {entity.parent2}
          </div>
        )}

        {entity.isStarter && (
          <div className="text-xs text-green-300 bg-green-900/30 border border-green-500/30 rounded-xl px-3 py-2 font-mono flex items-center">
            <span className="text-green-400 mr-2">◆</span>
            STARTER_ENTITY
          </div>
        )}
      </div>

      {/* Selection Indicator with cyberpunk styling */}
      {selected && (
        <div className="absolute top-3 right-3 bg-gradient-to-r from-cyan-500 to-magenta-500 text-black rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold shadow-lg shadow-cyan-500/50 animate-pulse border-2 border-cyan-300">
          ✓
        </div>
      )}

      {/* Animated border glow on hover */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute inset-0 rounded-2xl border border-cyan-400/30 animate-pulse"></div>
      </div>
    </div>
  );
}

function getStarterEmoji(name: string): string {
  const emojiMap: { [key: string]: string } = {
    Fire: "🔥",
    Water: "💧",
    Earth: "🌍",
    Air: "💨",
    Light: "✨",
    Shadow: "🌑",
    Metal: "🔩",
    Crystal: "💎",
    Lightning: "⚡",
    Ice: "🧊",
    Plant: "🌱",
    Beast: "🐺",
    Aquatic: "🌊",
    Avian: "🦅",
    Insect: "🐛",
    Stellar: "⭐",
    Lunar: "🌙",
    Solar: "☀️",
    Void: "🕳️",
    Nebula: "🌌",
    Forest: "🌲",
    Desert: "🏜️",
    Ocean: "🌊",
    Mountain: "⛰️",
    Wolf: "🐺",
    Tiger: "🐅",
    Eagle: "🦅",
    Bear: "🐻",
    Fox: "🦊",
    Oak: "🌳",
    Rose: "🌹",
    Cactus: "🌵",
    Lotus: "🪷",
    Fern: "🌿",
    Butterfly: "🦋",
  };
  return emojiMap[name] || "⭐";
}

// Entity Details Modal Component
function EntityDetailsModal({
  entity,
  onClose,
  addNFTToWallet,
}: {
  entity: Entity;
  onClose: () => void;
  addNFTToWallet: (tokenId: number, entity: Entity) => Promise<void>;
}) {
  const [ipfsMetadata, setIpfsMetadata] = useState<any>(null);
  const [openSeaMetadata, setOpenSeaMetadata] = useState<any>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  // Fetch both IPFS and OpenSea metadata when modal opens
  useEffect(() => {
    let cancelled = false;

    const fetchMetadata = async () => {
      if (entity.isStarter) return;

      setMetadataLoading(true);
      setMetadataError(null);

      try {
        // Fetch OpenSea-compatible metadata
        if (entity.tokenId > 0) {
          try {
            const openSeaResponse = await fetch(
              `/api/metadata/${entity.tokenId}`
            );
            const openSeaData = await openSeaResponse.json();
            if (!cancelled && !openSeaData.error) {
              setOpenSeaMetadata(openSeaData);
            }
          } catch (error) {
            if (!cancelled) {
              console.warn("Could not fetch OpenSea metadata:", error);
            }
          }
        }

        // Fetch IPFS key-value metadata if available
        if (entity.imageURI) {
          try {
            // Extract CID from entity.imageURI (could be ipfs:// or https:// URL)
            let cid = entity.imageURI;

            // If it's an ipfs:// URI, extract the hash
            if (cid.startsWith("ipfs://")) {
              cid = cid.replace("ipfs://", "");
            }
            // If it's an HTTPS URL, extract the CID from the path
            else if (cid.startsWith("http")) {
              const matches = cid.match(/\/ipfs\/([a-zA-Z0-9]+)/);
              if (matches && matches[1]) {
                cid = matches[1];
              } else {
                console.warn("Could not extract CID from URL:", cid);
                return; // Skip IPFS metadata fetch if we can't extract CID
              }
            }

            const ipfsResponse = await fetch(
              `/api/game/metadata?cid=${encodeURIComponent(cid)}`
            );
            const ipfsData = await ipfsResponse.json();
            if (!cancelled && ipfsData.success) {
              setIpfsMetadata(ipfsData.metadata);
            }
          } catch (error) {
            if (!cancelled) {
              console.warn("Could not fetch IPFS metadata:", error);
            }
          }
        }
      } catch (error: any) {
        if (!cancelled) {
          console.error("Error fetching metadata:", error);
          setMetadataError("Failed to load metadata");
        }
      } finally {
        if (!cancelled) {
          setMetadataLoading(false);
        }
      }
    };

    fetchMetadata();

    // Cleanup function to prevent state updates if component unmounts
    return () => {
      cancelled = true;
    };
  }, [entity.tokenId, entity.imageURI, entity.isStarter]);

  const getRarityStars = (rarity: number) => "⭐".repeat(rarity);

  const getRarityName = (rarity: number) => {
    const names = {
      1: "COMMON",
      2: "UNCOMMON",
      3: "RARE",
      4: "EPIC",
      5: "LEGENDARY",
    };
    return names[rarity as keyof typeof names] || "COMMON";
  };

  const getRarityColor = (rarity: number) => {
    const colors = {
      1: "border-gray-400/50 shadow-gray-500/20",
      2: "border-green-400/50 shadow-green-500/20",
      3: "border-blue-400/50 shadow-blue-500/20",
      4: "border-purple-400/50 shadow-purple-500/20",
      5: "border-yellow-400/50 shadow-yellow-500/20",
    };
    return (
      colors[rarity as keyof typeof colors] ||
      "border-gray-400/50 shadow-gray-500/20"
    );
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Use OpenSea metadata if available, fallback to IPFS or entity data
  const displayMetadata = openSeaMetadata || ipfsMetadata;
  const displayDescription = displayMetadata?.description || entity.description;

  // OpenSea marketplace URL
  const openSeaUrl =
    entity.tokenId > 0
      ? `https://testnets.opensea.io/assets/sepolia/${process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS}/${entity.tokenId}`
      : null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-lg flex items-center justify-center z-50 p-4">
      <div
        className={`bg-gradient-to-br from-gray-900/95 via-black/90 to-gray-900/95 backdrop-blur-xl border-2 ${getRarityColor(
          entity.rarity
        )} rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl`}
      >
        {/* Cyberpunk corner decorations */}
        <div className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-cyan-400/60 rounded-tl-xl"></div>
        <div className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-cyan-400/60 rounded-tr-xl"></div>
        <div className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-cyan-400/60 rounded-bl-xl"></div>
        <div className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-cyan-400/60 rounded-br-xl"></div>

        <div className="p-8 space-y-8 relative">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-magenta-400 to-green-400 bg-clip-text text-transparent flex items-center space-x-3">
                <span>{entity.name}</span>
                <span className="text-2xl">
                  {getRarityStars(entity.rarity)}
                </span>
              </h2>
              <div className="flex items-center space-x-4">
                <span
                  className={`px-3 py-1 rounded-xl text-sm font-mono uppercase tracking-wide bg-black/40 border ${getRarityColor(
                    entity.rarity
                  )} text-white`}
                >
                  {getRarityName(entity.rarity)}
                </span>
                <span className="px-3 py-1 rounded-xl text-sm font-mono bg-cyan-900/30 border border-cyan-500/30 text-cyan-300">
                  {entity.isStarter ? "STARTER_ENTITY" : "HYBRID_ENTITY"}
                </span>
              </div>
              {entity.tokenId > 0 && (
                <p className="text-sm text-cyan-400 font-mono bg-cyan-900/20 px-3 py-1 rounded-xl inline-block border border-cyan-500/30">
                  TOKEN_ID: #{entity.tokenId}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-cyan-300 transition-all duration-300 text-3xl hover:bg-red-500/20 rounded-full w-12 h-12 flex items-center justify-center border border-gray-600/30 hover:border-red-400/50"
            >
              ✕
            </button>
          </div>

          {/* Image */}
          <div className="aspect-square bg-gradient-to-br from-gray-800/80 via-black/60 to-gray-800/80 rounded-2xl overflow-hidden border-2 border-cyan-500/30 shadow-2xl shadow-cyan-500/10">
            {entity.imageURI && entity.imageURI !== "" ? (
              <img
                src={formatIPFSUrl(entity.imageURI)}
                alt={entity.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to emoji if image fails to load
                  e.currentTarget.style.display = "none";
                  const fallback = e.currentTarget
                    .nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
            ) : null}
            {entity.isStarter && (
              <div className="text-8xl flex items-center justify-center w-full h-full">
                {getStarterEmoji(entity.name)}
              </div>
            )}
          </div>

          {/* Description */}
          {displayDescription && (
            <div className="space-y-4">
              <h4 className="text-xl font-bold text-cyan-300 flex items-center">
                <span className="mr-2">📝</span>
                ENTITY_DESCRIPTION
              </h4>
              <p className="text-cyan-200 leading-relaxed bg-black/30 border border-cyan-500/30 rounded-2xl p-4 backdrop-blur-sm">
                {displayDescription}
              </p>
            </div>
          )}

          {/* OpenSea Metadata Display */}
          {openSeaMetadata && (
            <div className="space-y-6">
              <h4 className="text-xl font-bold text-blue-300 flex items-center">
                <span className="mr-2">🌊</span>
                OPENSEA_METADATA
                <span className="ml-3 text-xs text-green-400 bg-green-900/30 px-3 py-1 rounded-full border border-green-500/30">
                  ✅ COMPATIBLE
                </span>
              </h4>

              {/* Attributes Grid */}
              {openSeaMetadata.attributes &&
                openSeaMetadata.attributes.length > 0 && (
                  <div className="bg-black/40 border border-blue-500/30 rounded-2xl p-6 backdrop-blur-sm">
                    <h5 className="text-lg font-bold text-blue-300 mb-4 flex items-center">
                      <span className="mr-2">🏷️</span>
                      TRAITS_&_PROPERTIES
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {openSeaMetadata.attributes.map(
                        (attr: any, index: number) => (
                          <div
                            key={index}
                            className="bg-gradient-to-br from-gray-800/80 to-black/60 rounded-xl p-4 border border-gray-600/30 hover:border-cyan-400/50 transition-all duration-300"
                          >
                            <div className="text-xs text-cyan-400 uppercase tracking-wide font-mono mb-1">
                              {attr.trait_type}
                            </div>
                            <div className="text-white font-bold text-lg">
                              {attr.display_type === "date"
                                ? new Date(
                                    attr.value * 1000
                                  ).toLocaleDateString()
                                : attr.value}
                              {attr.max_value && ` / ${attr.max_value}`}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
            </div>
          )}

          {/* Entity Details */}
          <div className="space-y-6">
            <h4 className="text-xl font-bold text-magenta-300 flex items-center">
              <span className="mr-2">🔍</span>
              ENTITY_DETAILS
            </h4>
            <div className="bg-black/40 border border-magenta-500/30 rounded-2xl p-6 backdrop-blur-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-gray-800/50 to-black/30 rounded-xl p-4 border border-gray-600/30">
                    <span className="text-gray-400 text-sm font-mono uppercase tracking-wide">
                      RARITY:
                    </span>
                    <div className="text-white font-bold text-lg mt-1">
                      {getRarityName(entity.rarity)}{" "}
                      {getRarityStars(entity.rarity)}
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-gray-800/50 to-black/30 rounded-xl p-4 border border-gray-600/30">
                    <span className="text-gray-400 text-sm font-mono uppercase tracking-wide">
                      TYPE:
                    </span>
                    <div className="text-white font-bold text-lg mt-1">
                      {entity.isStarter ? "STARTER_ENTITY" : "HYBRID_ENTITY"}
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  {!entity.isStarter && entity.parent1 && entity.parent2 && (
                    <>
                      <div className="bg-gradient-to-r from-gray-800/50 to-black/30 rounded-xl p-4 border border-gray-600/30">
                        <span className="text-gray-400 text-sm font-mono uppercase tracking-wide">
                          PARENT_1:
                        </span>
                        <div className="text-magenta-300 font-bold text-lg mt-1">
                          {entity.parent1}
                        </div>
                      </div>
                      <div className="bg-gradient-to-r from-gray-800/50 to-black/30 rounded-xl p-4 border border-gray-600/30">
                        <span className="text-gray-400 text-sm font-mono uppercase tracking-wide">
                          PARENT_2:
                        </span>
                        <div className="text-magenta-300 font-bold text-lg mt-1">
                          {entity.parent2}
                        </div>
                      </div>
                    </>
                  )}
                  <div className="bg-gradient-to-r from-gray-800/50 to-black/30 rounded-xl p-4 border border-gray-600/30">
                    <span className="text-gray-400 text-sm font-mono uppercase tracking-wide">
                      CREATED:
                    </span>
                    <div className="text-green-300 font-bold text-lg mt-1">
                      {formatDate(entity.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            {entity.tokenId > 0 && (
              <>
                <button
                  onClick={() => addNFTToWallet(entity.tokenId, entity)}
                  className="bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 hover:from-orange-500 hover:via-red-500 hover:to-pink-500 text-white font-bold py-3 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-2xl shadow-orange-500/25 border border-orange-400/30 hover:border-orange-300/50 flex items-center justify-center space-x-3"
                >
                  <span className="text-xl">🦊</span>
                  <span className="font-mono">ADD_TO_METAMASK</span>
                </button>
                {openSeaUrl && (
                  <a
                    href={openSeaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-500 hover:via-purple-500 hover:to-indigo-500 text-white font-bold py-3 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-2xl shadow-blue-500/25 border border-blue-400/30 hover:border-blue-300/50 flex items-center justify-center space-x-3"
                  >
                    <span className="text-xl">🌊</span>
                    <span className="font-mono">VIEW_ON_OPENSEA</span>
                  </a>
                )}
              </>
            )}
          </div>

          {/* Metadata Loading/Error States */}
          {metadataLoading && !entity.isStarter && (
            <div className="bg-blue-500/20 backdrop-blur-lg border border-blue-400/50 rounded-2xl p-4">
              <div className="flex items-center space-x-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
                <span className="text-blue-200 font-mono">
                  LOADING_METADATA...
                </span>
              </div>
            </div>
          )}

          {metadataError && !entity.isStarter && (
            <div className="bg-red-500/20 backdrop-blur-lg border border-red-400/50 rounded-2xl p-4">
              <div className="text-red-200 font-mono">
                <strong>⚠️ METADATA_ERROR:</strong> {metadataError}
              </div>
            </div>
          )}

          {/* Note for Starter Entities */}
          {entity.isStarter && (
            <div className="bg-green-500/20 backdrop-blur-lg border border-green-400/50 rounded-2xl p-4">
              <div className="text-green-200 font-mono">
                <strong className="text-green-300">💡 STARTER_ENTITY:</strong>{" "}
                This is a virtual starter entity. Merge it with another entity
                to create a real NFT!
              </div>
            </div>
          )}

          {/* Raw Metadata (for debugging) */}
          {(openSeaMetadata || ipfsMetadata) && (
            <details className="bg-black/40 border border-gray-600/30 rounded-2xl backdrop-blur-sm">
              <summary className="p-4 cursor-pointer text-gray-300 hover:text-cyan-300 transition-colors font-mono">
                <span className="text-sm">
                  🔍 VIEW_RAW_METADATA [CLICK_TO_EXPAND]
                </span>
              </summary>
              <div className="px-6 pb-6 space-y-6">
                {openSeaMetadata && (
                  <div>
                    <h6 className="text-sm font-bold text-blue-400 mb-3 font-mono">
                      OPENSEA_METADATA:
                    </h6>
                    <pre className="bg-black/60 border border-blue-500/30 rounded-xl p-4 text-xs text-cyan-300 overflow-auto max-h-64 font-mono">
                      {JSON.stringify(openSeaMetadata, null, 2)}
                    </pre>
                  </div>
                )}
                {ipfsMetadata && (
                  <div>
                    <h6 className="text-sm font-bold text-green-400 mb-3 font-mono">
                      IPFS_KEY-VALUE_METADATA:
                    </h6>
                    <pre className="bg-black/60 border border-green-500/30 rounded-xl p-4 text-xs text-green-300 overflow-auto max-h-64 font-mono">
                      {JSON.stringify(ipfsMetadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
