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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center space-y-8 max-w-4xl mx-auto px-4">
          <div className="space-y-4">
            <h1 className="text-6xl font-bold text-white mb-4">
              🎮 HybridHaven
            </h1>
            <p className="text-xl text-blue-200 max-w-2xl mx-auto">
              Discover. Merge. Evolve. Create unique hybrid creatures through
              the power of Web3 and AI.
            </p>
          </div>

          <div className="bg-black/20 backdrop-blur-sm border border-blue-500/30 rounded-lg p-6 space-y-4">
            <h2 className="text-2xl font-bold text-white">🌟 Game Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div className="space-y-2">
                <div className="text-blue-200">
                  🎁 <strong>Free Starter Collection:</strong> 35 unique
                  entities
                </div>
                <div className="text-blue-200">
                  ⚡ <strong>Entity Merging:</strong> Combine any two entities
                </div>
                <div className="text-blue-200">
                  🎲 <strong>Verifiable Randomness:</strong> Chainlink VRF
                  powered
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-blue-200">
                  🤖 <strong>AI-Generated Images:</strong> Unique hybrid artwork
                </div>
                <div className="text-blue-200">
                  📦 <strong>IPFS Storage:</strong> Decentralized NFT storage
                </div>
                <div className="text-blue-200">
                  🏆 <strong>5-Star Rarity System:</strong> From common to
                  legendary
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <button
              onClick={connectWallet}
              disabled={gameState.loading}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 text-white font-bold py-4 px-8 rounded-lg text-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              {gameState.loading ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Connecting...
                </span>
              ) : (
                "🔗 Connect Wallet"
              )}
            </button>

            {gameState.error && (
              <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg max-w-md mx-auto">
                <div className="flex items-center justify-between">
                  <span>{gameState.error}</span>
                  <button
                    onClick={clearError}
                    className="ml-2 text-red-300 hover:text-red-100 text-lg"
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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Header */}
      <header className="border-b border-blue-800/50 bg-black/20 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">🎮 HybridHaven</h1>
          <div className="flex items-center space-x-6">
            <button
              onClick={refreshData}
              disabled={gameState.loading}
              className="text-blue-200 hover:text-white transition-colors"
              title="Refresh data"
            >
              <div
                className={`text-xl ${gameState.loading ? "animate-spin" : ""}`}
              >
                🔄
              </div>
            </button>
            <div className="text-blue-200 text-sm">
              {gameState.address?.slice(0, 6)}...{gameState.address?.slice(-4)}
            </div>
            <div className="text-purple-200 text-sm font-medium">
              {gameState.entities.length} Entities
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Success Message */}
        {showSuccess && (
          <div className="bg-green-500/20 border border-green-500 text-green-200 px-4 py-3 rounded-lg mb-6 animate-pulse">
            <div className="flex items-center justify-between">
              <span>✅ {showSuccess}</span>
              <button
                onClick={() => setShowSuccess(null)}
                className="ml-2 text-green-300 hover:text-green-100"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {gameState.error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6">
            <div className="flex items-center justify-between">
              <span>❌ {gameState.error}</span>
              <button
                onClick={clearError}
                className="ml-2 text-red-300 hover:text-red-100"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Starter Entity Section */}
        {!hasStarterEntity && (
          <div className="bg-gradient-to-r from-green-900/30 to-blue-900/30 border border-green-500/30 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">
              🌟 Welcome to HybridHaven!
            </h2>
            <p className="text-blue-200 mb-4">
              Claim your complete starter collection to begin your journey of
              discovery and evolution.
            </p>
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-blue-200 mb-3">
                🎁 Your Starter Collection (35 Entities):
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-sm text-blue-300">
                {[
                  "🔥 Fire",
                  "💧 Water",
                  "🌍 Earth",
                  "💨 Air",
                  "✨ Light",
                  "🌑 Shadow",
                  "🔩 Metal",
                  "💎 Crystal",
                  "⚡ Lightning",
                  "🧊 Ice",
                  "🌱 Plant",
                  "🐺 Beast",
                  "🌊 Aquatic",
                  "🦅 Avian",
                  "🐛 Insect",
                  "⭐ Stellar",
                  "🌙 Lunar",
                  "☀️ Solar",
                  "🕳️ Void",
                  "🌌 Nebula",
                  "🌲 Forest",
                  "🏜️ Desert",
                  "🌊 Ocean",
                  "⛰️ Mountain",
                  "🐺 Wolf",
                  "🐅 Tiger",
                  "🦅 Eagle",
                  "🐻 Bear",
                  "🦊 Fox",
                  "🌳 Oak",
                  "🌹 Rose",
                  "🌵 Cactus",
                  "🪷 Lotus",
                  "🌿 Fern",
                  "🦋 Butterfly",
                ].map((entity, index) => (
                  <div key={index} className="bg-gray-800/30 rounded px-2 py-1">
                    {entity}
                  </div>
                ))}
              </div>
              <p className="text-yellow-200 mt-4 text-sm font-semibold">
                ✨ All entities start at 1-star rarity and can be merged to
                create higher rarity hybrids!
              </p>
            </div>
            <button
              onClick={handleClaimStarter}
              disabled={gameState.loading}
              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              {gameState.loading ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Claiming Collection...
                </span>
              ) : (
                "🎁 Claim Complete Starter Collection"
              )}
            </button>
          </div>
        )}

        {/* Merge Section */}
        {gameState.entities.length >= 2 && (
          <div className="bg-black/20 backdrop-blur-sm border border-purple-500/30 rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">
              ⚡ Entity Fusion Laboratory
            </h2>
            <p className="text-blue-200 mb-4">
              Select two entities to merge them into a unique hybrid creature
              with AI-generated artwork!
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="text-purple-200">
                  Selected: {selectedEntities.length}/2
                  {selectedEntities.length > 0 && (
                    <span className="ml-2 text-sm text-gray-300">
                      (#{selectedEntities.join(", #")})
                    </span>
                  )}
                </div>
                {selectedEntities.length > 0 && (
                  <button
                    onClick={() => setSelectedEntities([])}
                    className="text-gray-400 hover:text-white text-sm"
                  >
                    Clear Selection
                  </button>
                )}
              </div>
              {selectedEntities.length === 2 && (
                <button
                  onClick={handleMerge}
                  disabled={gameState.loading || mergeInProgress}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 text-white font-bold py-2 px-6 rounded-lg transition-all duration-200 shadow-lg"
                >
                  {mergeInProgress ? (
                    <span className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Merging...
                    </span>
                  ) : (
                    "🔮 Merge Selected"
                  )}
                </button>
              )}
            </div>

            {/* Merge Mode Toggle */}
            <div className="mt-4">
              <button
                onClick={toggleMergeMode}
                className={`w-full flex items-center justify-center px-4 py-2 rounded-lg font-bold transition-all duration-200 shadow-md
                ${
                  isMergeMode
                    ? "bg-red-600 text-white"
                    : "bg-purple-600 text-white"
                }
                `}
              >
                {isMergeMode ? "❌ Exit Merge Mode" : "⚙️ Enter Merge Mode"}
              </button>
            </div>
          </div>
        )}

        {/* Entities Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">
              📦 Your Collection
            </h2>
            {gameState.entities.length > 0 && (
              <div className="text-blue-200 text-sm">
                Starters: {gameState.entities.filter((e) => e.isStarter).length}{" "}
                • Hybrids:{" "}
                {gameState.entities.filter((e) => !e.isStarter).length}
              </div>
            )}
          </div>

          {gameState.loading && gameState.entities.length === 0 ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
              <p className="text-blue-200 text-lg">
                Loading your collection...
              </p>
            </div>
          ) : gameState.entities.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎯</div>
              <p className="text-blue-200 text-lg">
                No entities yet.{" "}
                {!hasStarterEntity
                  ? "Claim your starter collection above!"
                  : "Start merging to create new ones!"}
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
      1: "border-gray-400 bg-gray-900/20",
      2: "border-green-400 bg-green-900/20",
      3: "border-blue-400 bg-blue-900/20",
      4: "border-purple-400 bg-purple-900/20",
      5: "border-yellow-400 bg-yellow-900/20",
    };
    return (
      colors[rarity as keyof typeof colors] || "border-gray-400 bg-gray-900/20"
    );
  };

  const getRarityName = (rarity: number) => {
    const names = {
      1: "Common",
      2: "Uncommon",
      3: "Rare",
      4: "Epic",
      5: "Legendary",
    };
    return names[rarity as keyof typeof names] || "Common";
  };

  return (
    <div
      className={`
        relative rounded-lg p-4 transition-all duration-200 transform hover:scale-105 cursor-pointer
        ${getRarityColor(entity.rarity)}
        ${
          selected
            ? "ring-2 ring-purple-500 ring-offset-2 ring-offset-transparent shadow-lg"
            : ""
        }
        backdrop-blur-sm hover:ring-1 hover:ring-blue-400
      `}
      onClick={() => onClick(entity)}
    >
      {/* Entity Image */}
      <div className="aspect-square bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
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
          <div className="text-4xl flex items-center justify-center w-full h-full">
            {getStarterEmoji(entity.name)}
          </div>
        )}
      </div>

      {/* Entity Info */}
      <div className="space-y-2">
        <h3
          className="font-bold text-white text-lg truncate"
          title={entity.name}
        >
          {entity.name}
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-300">#{entity.tokenId}</span>
          <div className="flex items-center space-x-1">
            <span className="text-sm">{getRarityStars(entity.rarity)}</span>
            <span className="text-xs text-gray-400">
              {getRarityName(entity.rarity)}
            </span>
          </div>
        </div>

        {!entity.isStarter && entity.parent1 && entity.parent2 && (
          <div className="text-xs text-blue-300 bg-blue-900/20 rounded px-2 py-1">
            {entity.parent1} + {entity.parent2}
          </div>
        )}

        {entity.isStarter && (
          <div className="text-xs text-green-300 bg-green-900/20 rounded px-2 py-1">
            Starter Entity
          </div>
        )}
      </div>

      {/* Selection Indicator */}
      {selected && (
        <div className="absolute top-2 right-2 bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold shadow-lg"></div>
      )}
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
  }, []); // Use stable primitive values as dependencies

  const getRarityStars = (rarity: number) => "⭐".repeat(rarity);

  const getRarityName = (rarity: number) => {
    const names = {
      1: "Common",
      2: "Uncommon",
      3: "Rare",
      4: "Epic",
      5: "Legendary",
    };
    return names[rarity as keyof typeof names] || "Common";
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
  const displayImage = displayMetadata?.image;

  console.log(displayImage);

  // OpenSea marketplace URL
  const openSeaUrl =
    entity.tokenId > 0
      ? `https://testnets.opensea.io/assets/sepolia/${process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS}/${entity.tokenId}`
      : null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
                <span>{entity.name}</span>
                <span className="text-lg">{getRarityStars(entity.rarity)}</span>
              </h2>
              <p className="text-gray-400">
                {getRarityName(entity.rarity)} •{" "}
                {entity.isStarter ? "Starter" : "Hybrid"} Entity
              </p>
              {entity.tokenId > 0 && (
                <p className="text-sm text-gray-500">
                  Token ID: #{entity.tokenId}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors text-2xl"
            >
              ✕
            </button>
          </div>

          {/* Image */}
          <div className="aspect-square bg-gray-800 rounded-lg overflow-hidden">
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
          </div>

          {/* Description */}
          {displayDescription && (
            <div className="space-y-2">
              <h4 className="text-lg font-semibold text-white">Description</h4>
              <p className="text-gray-300 leading-relaxed">
                {displayDescription}
              </p>
            </div>
          )}

          {/* OpenSea Metadata Display */}
          {openSeaMetadata && (
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white flex items-center">
                🌊 OpenSea Metadata
                <span className="ml-2 text-xs text-blue-400 bg-blue-900/20 px-2 py-1 rounded">
                  ✅ Compatible
                </span>
              </h4>

              {/* Attributes Grid */}
              {openSeaMetadata.attributes &&
                openSeaMetadata.attributes.length > 0 && (
                  <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
                    <h5 className="text-md font-medium text-white mb-3">
                      Traits & Properties
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {openSeaMetadata.attributes.map(
                        (attr: any, index: number) => (
                          <div
                            key={index}
                            className="bg-black/30 rounded-lg p-3 border border-gray-700"
                          >
                            <div className="text-xs text-gray-400 uppercase tracking-wide">
                              {attr.trait_type}
                            </div>
                            <div className="text-white font-medium mt-1">
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
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white">Entity Details</h4>
            <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-400">Rarity:</span>
                  <span className="ml-2 text-white font-medium">
                    {getRarityName(entity.rarity)}{" "}
                    {getRarityStars(entity.rarity)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Type:</span>
                  <span className="ml-2 text-white font-medium">
                    {entity.isStarter ? "Starter Entity" : "Hybrid Entity"}
                  </span>
                </div>
                {!entity.isStarter && entity.parent1 && entity.parent2 && (
                  <>
                    <div>
                      <span className="text-gray-400">Parent 1:</span>
                      <span className="ml-2 text-white font-medium">
                        {entity.parent1}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Parent 2:</span>
                      <span className="ml-2 text-white font-medium">
                        {entity.parent2}
                      </span>
                    </div>
                  </>
                )}
                <div>
                  <span className="text-gray-400">Created:</span>
                  <span className="ml-2 text-white font-medium">
                    {formatDate(entity.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            {entity.tokenId > 0 && (
              <>
                <button
                  onClick={() => addNFTToWallet(entity.tokenId, entity)}
                  className="bg-gradient-to-r from-orange-600 to-blue-600 hover:from-orange-700 hover:to-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center space-x-2"
                >
                  <span>🦊</span>
                  <span>Add to MetaMask</span>
                </button>
                {openSeaUrl && (
                  <a
                    href={openSeaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center space-x-2"
                  >
                    <span>🌊</span>
                    <span>View on OpenSea</span>
                  </a>
                )}
              </>
            )}
          </div>

          {/* Metadata Loading/Error States */}
          {metadataLoading && !entity.isStarter && (
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
                <span className="text-blue-200">Loading metadata...</span>
              </div>
            </div>
          )}

          {metadataError && !entity.isStarter && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
              <div className="text-red-200">
                <strong>⚠️ Metadata Error:</strong> {metadataError}
              </div>
            </div>
          )}

          {/* Note for Starter Entities */}
          {entity.isStarter && (
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
              <div className="text-green-200">
                <strong>💡 Starter Entity:</strong> This is a virtual starter
                entity. Merge it with another entity to create a real NFT!
              </div>
            </div>
          )}

          {/* Raw Metadata (for debugging) */}
          {(openSeaMetadata || ipfsMetadata) && (
            <details className="bg-gray-800/50 border border-gray-700 rounded-lg">
              <summary className="p-4 cursor-pointer text-gray-300 hover:text-white transition-colors">
                <span className="text-sm">
                  🔍 View Raw Metadata (click to expand)
                </span>
              </summary>
              <div className="px-4 pb-4 space-y-4">
                {openSeaMetadata && (
                  <div>
                    <h6 className="text-sm font-medium text-blue-400 mb-2">
                      OpenSea Metadata:
                    </h6>
                    <pre className="bg-black/50 border border-gray-700 rounded-lg p-4 text-xs text-gray-300 overflow-auto max-h-64 font-mono">
                      {JSON.stringify(openSeaMetadata, null, 2)}
                    </pre>
                  </div>
                )}
                {ipfsMetadata && (
                  <div>
                    <h6 className="text-sm font-medium text-green-400 mb-2">
                      IPFS Key-Value Metadata:
                    </h6>
                    <pre className="bg-black/50 border border-gray-700 rounded-lg p-4 text-xs text-gray-300 overflow-auto max-h-64 font-mono">
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
