"use client";

import { useGame } from "@/hooks/useGame";
import { Entity } from "@/types/game";
import { useState, useEffect } from "react";
import { formatIPFSUrl } from "@/lib/utils";

export default function HybridHaven() {
  const {
    gameState,
    mergeInProgress,
    finalizeInProgress,
    autoFinalizingRequests,
    connectWallet,
    claimStarterEntity,
    requestMerge,
    finalizeMerge,
    refreshData,
    clearError,
    addNFTToWallet,
  } = useGame();

  const [selectedEntities, setSelectedEntities] = useState<number[]>([]);
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

  const handleEntitySelect = (tokenId: number) => {
    setSelectedEntities((prev) => {
      if (prev.includes(tokenId)) {
        return prev.filter((id) => id !== tokenId);
      }
      if (prev.length < 2) {
        return [...prev, tokenId];
      }
      return [prev[1], tokenId]; // Replace first selection
    });
  };

  const handleEntityClick = (entity: Entity) => {
    if (isMergeMode) {
      // If in merge mode, handle selection
      handleEntitySelect(entity.tokenId);
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
        await requestMerge(selectedEntities[0], selectedEntities[1]);
        setSelectedEntities([]);
        setShowSuccess(
          "🚀 Merge request submitted! Your hybrid is being created automatically and will appear shortly."
        );
        setTimeout(() => setShowSuccess(null), 8000);
      } catch (error) {
        console.error("Merge failed:", error);
        // Error is handled by the hook
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

  const getRarityStars = (rarity: number) => {
    return "⭐".repeat(rarity);
  };

  const getRarityColor = (rarity: number) => {
    const colors = {
      1: "text-gray-400",
      2: "text-green-400",
      3: "text-blue-400",
      4: "text-purple-400",
      5: "text-yellow-400",
    };
    return colors[rarity as keyof typeof colors] || "text-gray-400";
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
              {gameState.entities.map((entity) => (
                <EntityCard
                  key={entity.tokenId}
                  entity={entity}
                  selected={selectedEntities.includes(entity.tokenId)}
                  onSelect={() => handleEntitySelect(entity.tokenId)}
                  canSelect={
                    isMergeMode &&
                    gameState.entities.length >= 2 &&
                    !mergeInProgress
                  }
                  onClick={handleEntityClick}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pending Requests */}
        {gameState.pendingRequests.length > 0 && (
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
  onSelect,
  canSelect,
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
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  // Fetch IPFS key-value metadata when modal opens
  useEffect(() => {
    const fetchIPFSKeyValueMetadata = async () => {
      // For starter entities or entities without imageURI, skip fetching
      if (!entity.imageURI || entity.isStarter) {
        return;
      }

      setMetadataLoading(true);
      setMetadataError(null);

      try {
        // Extract IPFS hash from imageURI
        const ipfsHash = entity.imageURI.replace("ipfs://", "");

        // Fetch metadata from key-value pairs using the image CID
        const response = await fetch(
          `/api/game/metadata?cid=${encodeURIComponent(ipfsHash)}`
        );
        const data = await response.json();

        if (data.success) {
          setIpfsMetadata(data.metadata);
        } else {
          setMetadataError(data.error || "Failed to load key-value metadata");
        }
      } catch (error: any) {
        console.error("Error fetching IPFS key-value metadata:", error);
        setMetadataError("Failed to load metadata from IPFS key-values");
      } finally {
        setMetadataLoading(false);
      }
    };

    fetchIPFSKeyValueMetadata();
  }, [entity.imageURI, entity.isStarter]);

  const getRarityStars = (rarity: number) => "⭐".repeat(rarity);

  const getRarityColor = (rarity: number) => {
    const colors = {
      1: "text-gray-400 border-gray-400",
      2: "text-green-400 border-green-400",
      3: "text-blue-400 border-blue-400",
      4: "text-purple-400 border-purple-400",
      5: "text-yellow-400 border-yellow-400",
    };
    return (
      colors[rarity as keyof typeof colors] || "text-gray-400 border-gray-400"
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

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Use IPFS metadata description if available, fallback to entity description
  const displayDescription = ipfsMetadata?.description || entity.description;
  const displayImage = ipfsMetadata?.image || entity.imageURI;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-700 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white flex items-center">
            📋 NFT Details
            {metadataLoading && (
              <div className="ml-3 animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
            )}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Main Entity Info */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Image */}
            <div className="flex-shrink-0">
              <div className="w-64 h-64 bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg flex items-center justify-center overflow-hidden">
                {displayImage && displayImage !== "" ? (
                  <img
                    src={formatIPFSUrl(displayImage)}
                    alt={entity.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
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
            </div>

            {/* Basic Info */}
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-3xl font-bold text-white mb-2">
                  {ipfsMetadata?.name || entity.name}
                </h3>
                <div className="flex items-center space-x-3">
                  <span className="text-gray-300">Token ID:</span>
                  <span className="text-white font-mono">
                    #{entity.tokenId}
                  </span>
                </div>
              </div>

              {/* Rarity */}
              <div
                className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg border ${getRarityColor(
                  entity.rarity
                )} bg-black/20`}
              >
                <span className="text-2xl">
                  {getRarityStars(entity.rarity)}
                </span>
                <span className="font-bold">
                  {getRarityName(entity.rarity)}
                </span>
              </div>

              {/* Type */}
              <div className="space-y-2">
                <div className="text-gray-300">Type:</div>
                {entity.isStarter ? (
                  <div className="inline-flex items-center px-3 py-1 bg-green-900/30 border border-green-500/30 rounded-lg text-green-300">
                    🌱 Starter Entity
                  </div>
                ) : (
                  <div className="inline-flex items-center px-3 py-1 bg-purple-900/30 border border-purple-500/30 rounded-lg text-purple-300">
                    🔮 Hybrid Entity
                  </div>
                )}
              </div>

              {/* Parents (for hybrids) */}
              {!entity.isStarter && entity.parent1 && entity.parent2 && (
                <div className="space-y-2">
                  <div className="text-gray-300">Created from:</div>
                  <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
                    <div className="text-blue-300 font-medium">
                      {entity.parent1} + {entity.parent2}
                    </div>
                    <div className="text-blue-200 text-sm mt-1">
                      This hybrid was created by merging two entities
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Description from IPFS Key-Values */}
          {ipfsMetadata?.description && (
            <div className="space-y-2">
              <h4 className="text-lg font-semibold text-white flex items-center">
                📖 Description
                <span className="ml-2 text-xs text-green-400 bg-green-900/20 px-2 py-1 rounded">
                  ✅ IPFS Key-Values
                </span>
              </h4>
              <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
                <p className="text-gray-200 leading-relaxed">
                  {ipfsMetadata.description}
                </p>
              </div>
            </div>
          )}

          {/* Add to MetaMask Button */}
          <div className="space-y-2">
            <h4 className="text-lg font-semibold text-white flex items-center">
              🦊 MetaMask Integration
            </h4>
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <p className="text-blue-200 text-sm mb-3">
                Add this NFT to your MetaMask wallet for easy viewing and
                management.
              </p>
              <button
                onClick={() => addNFTToWallet(entity.tokenId, entity)}
                className="bg-gradient-to-r from-orange-600 to-blue-600 hover:from-orange-700 hover:to-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center space-x-2"
              >
                <span>🦊</span>
                <span>Add to MetaMask</span>
              </button>
              <p className="text-xs text-gray-400 mt-2">
                💡 This will prompt MetaMask to watch this NFT in your wallet
              </p>
            </div>
          </div>

          {/* IPFS Key-Value Metadata Display */}
          {ipfsMetadata && (
            <div className="space-y-2">
              <h4 className="text-lg font-semibold text-white flex items-center">
                🗂️ IPFS Key-Value Metadata
                <span className="ml-2 text-xs text-green-400 bg-green-900/20 px-2 py-1 rounded">
                  ✅ Stored with Image CID
                </span>
              </h4>
              <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4 space-y-4">
                {/* Core Key-Value Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Entity Name */}
                  {ipfsMetadata.name && (
                    <div className="bg-black/30 rounded-lg p-3 border border-gray-700">
                      <div className="text-gray-400 text-sm">Name</div>
                      <div className="text-white font-medium">
                        {ipfsMetadata.name}
                      </div>
                    </div>
                  )}

                  {/* Rarity */}
                  {ipfsMetadata.rarity && (
                    <div className="bg-black/30 rounded-lg p-3 border border-gray-700">
                      <div className="text-gray-400 text-sm">Rarity</div>
                      <div className="text-white font-medium flex items-center">
                        <span className="mr-2">
                          {"⭐".repeat(ipfsMetadata.rarity)}
                        </span>
                        <span>{ipfsMetadata.rarity} Star</span>
                      </div>
                    </div>
                  )}

                  {/* Parent 1 */}
                  {ipfsMetadata.parent1 && (
                    <div className="bg-black/30 rounded-lg p-3 border border-gray-700">
                      <div className="text-gray-400 text-sm">Parent 1</div>
                      <div className="text-white font-medium">
                        {ipfsMetadata.parent1}
                      </div>
                    </div>
                  )}

                  {/* Parent 2 */}
                  {ipfsMetadata.parent2 && (
                    <div className="bg-black/30 rounded-lg p-3 border border-gray-700">
                      <div className="text-gray-400 text-sm">Parent 2</div>
                      <div className="text-white font-medium">
                        {ipfsMetadata.parent2}
                      </div>
                    </div>
                  )}

                  {/* Type */}
                  {ipfsMetadata.type && (
                    <div className="bg-black/30 rounded-lg p-3 border border-gray-700">
                      <div className="text-gray-400 text-sm">Type</div>
                      <div className="text-white font-medium">
                        {ipfsMetadata.type}
                      </div>
                    </div>
                  )}

                  {/* Game */}
                  {ipfsMetadata.game && (
                    <div className="bg-black/30 rounded-lg p-3 border border-gray-700">
                      <div className="text-gray-400 text-sm">Game</div>
                      <div className="text-white font-medium">
                        {ipfsMetadata.game}
                      </div>
                    </div>
                  )}

                  {/* External URL */}
                  {ipfsMetadata.external_url && (
                    <div className="bg-black/30 rounded-lg p-3 border border-gray-700">
                      <div className="text-gray-400 text-sm">External URL</div>
                      <div className="text-white font-medium">
                        <a
                          href={ipfsMetadata.external_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 underline break-all"
                        >
                          {ipfsMetadata.external_url}
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Background Color */}
                  {ipfsMetadata.background_color && (
                    <div className="bg-black/30 rounded-lg p-3 border border-gray-700">
                      <div className="text-gray-400 text-sm">
                        Background Color
                      </div>
                      <div className="text-white font-medium flex items-center space-x-2">
                        <div
                          className="w-4 h-4 rounded border border-gray-600"
                          style={{
                            backgroundColor: ipfsMetadata.background_color,
                          }}
                        ></div>
                        <span className="font-mono">
                          {ipfsMetadata.background_color}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Enhanced IPFS Attributes from Key-Values */}
          {ipfsMetadata?.attributes &&
            Array.isArray(ipfsMetadata.attributes) && (
              <div className="space-y-2">
                <h4 className="text-lg font-semibold text-white flex items-center">
                  🏷️ Entity Attributes
                  <span className="ml-2 text-xs text-green-400 bg-green-900/20 px-2 py-1 rounded">
                    ✅ IPFS Key-Values
                  </span>
                  <span className="ml-2 text-xs text-blue-400 bg-blue-900/20 px-2 py-1 rounded">
                    {ipfsMetadata.attributes.length} traits
                  </span>
                </h4>
                <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {ipfsMetadata.attributes.map((attr: any, index: number) => (
                      <div
                        key={index}
                        className="bg-black/30 rounded-lg p-3 border border-gray-700 hover:border-blue-500/50 transition-colors"
                      >
                        <div className="text-gray-400 text-sm font-medium">
                          {attr.trait_type || "Trait"}
                        </div>
                        <div className="text-white font-medium mt-1">
                          {typeof attr.value === "number" ? (
                            <span className="font-mono">{attr.value}</span>
                          ) : (
                            String(attr.value)
                          )}
                          {attr.max_value && (
                            <span className="text-gray-400 text-sm ml-1">
                              / {attr.max_value}
                            </span>
                          )}
                        </div>
                        {attr.display_type && (
                          <div className="text-xs text-blue-300 mt-1 bg-blue-900/20 px-2 py-1 rounded">
                            {attr.display_type}
                          </div>
                        )}
                        {typeof attr.value === "number" &&
                          attr.display_type === "boost_percentage" && (
                            <div className="text-xs text-green-300 mt-1">
                              +{attr.value}% boost
                            </div>
                          )}
                        {typeof attr.value === "number" &&
                          attr.display_type === "boost_number" && (
                            <div className="text-xs text-green-300 mt-1">
                              +{attr.value} points
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          {/* IPFS Technical Details */}
          {ipfsMetadata && (
            <div className="space-y-2">
              <h4 className="text-lg font-semibold text-white flex items-center">
                🔧 IPFS Storage Details
                <span className="ml-2 text-xs text-green-400 bg-green-900/20 px-2 py-1 rounded">
                  ✅ Key-Value Store
                </span>
              </h4>
              <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-black/30 rounded-lg p-3 border border-gray-700">
                    <div className="text-gray-400 text-sm">Image CID</div>
                    <div className="text-white font-mono text-sm break-all">
                      {entity.imageURI?.replace("ipfs://", "")}
                    </div>
                  </div>
                  <div className="bg-black/30 rounded-lg p-3 border border-gray-700">
                    <div className="text-gray-400 text-sm">Storage Method</div>
                    <div className="text-white font-medium">
                      IPFS Key-Value Pairs with Image
                    </div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-blue-300 bg-blue-900/20 p-3 rounded">
                  📦 This metadata is stored directly with the image file on
                  IPFS using key-value pairs, ensuring the data and image are
                  always linked together.
                </div>
              </div>
            </div>
          )}

          {/* Raw Key-Value Data (for debugging/technical users) */}
          {ipfsMetadata && (
            <div className="space-y-2">
              <h4 className="text-lg font-semibold text-white flex items-center">
                🔧 Raw Key-Value Data
                <span className="ml-2 text-xs text-green-400 bg-green-900/20 px-2 py-1 rounded">
                  ✅ IPFS
                </span>
              </h4>
              <details className="bg-gray-800/50 border border-gray-600 rounded-lg">
                <summary className="p-4 cursor-pointer text-gray-300 hover:text-white transition-colors">
                  <span className="text-sm">
                    🔍 View Raw Key-Value Data (click to expand)
                  </span>
                </summary>
                <div className="px-4 pb-4">
                  <pre className="bg-black/50 border border-gray-700 rounded-lg p-4 text-xs text-gray-300 overflow-auto max-h-64 font-mono">
                    {JSON.stringify(ipfsMetadata, null, 2)}
                  </pre>
                </div>
              </details>
            </div>
          )}

          {/* Metadata Loading/Error States */}
          {metadataLoading && !entity.isStarter && (
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
                <span className="text-blue-200">
                  Loading IPFS key-value metadata...
                </span>
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
                <strong>🌱 Starter Entity:</strong> This is a foundational
                entity that doesn't have IPFS key-value metadata. It exists as a
                base component for creating hybrid creatures.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
