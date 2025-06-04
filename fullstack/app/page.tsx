/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import { useGame } from "@/hooks/useGame";
import { Entity } from "@/types/game";
import { useState, useEffect } from "react";
import EntityDetailsModal from "@/components/EntityDetailsModal";
import EntityCard from "@/components/EntityCard";
import PendingMergeList from "@/components/PendingMergeList";

export default function HybridHaven() {
  const {
    gameState,
    mergeInProgress,
    autoFinalizingRequests,
    hatchTimers,
    connectWallet,
    claimStarterEntity,
    requestMerge,
    finalizeMerge,
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

  // Filter and Search State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRarity, setSelectedRarity] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all"); // all, starter, hybrid
  const [sortBy, setSortBy] = useState<string>("newest"); // newest, oldest, name, rarity

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

  // Filter and Sort Utility Functions
  const getFilteredAndSortedEntities = () => {
    let filteredEntities = gameState.entities;

    // Apply search filter
    if (searchTerm.trim()) {
      filteredEntities = filteredEntities.filter(
        (entity) =>
          entity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (entity.description &&
            entity.description
              .toLowerCase()
              .includes(searchTerm.toLowerCase())) ||
          entity.parent1.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entity.parent2.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply type filter
    if (selectedType !== "all") {
      if (selectedType === "starter") {
        filteredEntities = filteredEntities.filter(
          (entity) => entity.isStarter
        );
      } else if (selectedType === "hybrid") {
        filteredEntities = filteredEntities.filter(
          (entity) => !entity.isStarter
        );
      }
    }

    // Apply rarity filter - using the rarity number (1-5 scale)
    if (selectedRarity !== "all") {
      const rarityNumber = parseInt(selectedRarity);
      filteredEntities = filteredEntities.filter(
        (entity) => entity.rarity === rarityNumber
      );
    }

    // Apply sorting
    const sortedEntities = [...filteredEntities].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "rarity":
          return b.rarity - a.rarity; // Highest rarity first (5 to 1)
        case "oldest":
          // For starters, use name order; for hybrids, use tokenId
          if (a.isStarter && b.isStarter) return a.name.localeCompare(b.name);
          if (!a.isStarter && !b.isStarter)
            return (a.tokenId || 0) - (b.tokenId || 0);
          return a.isStarter ? -1 : 1; // Starters first
        case "newest":
        default:
          // For starters, reverse name order; for hybrids, reverse tokenId
          if (a.isStarter && b.isStarter) return b.name.localeCompare(a.name);
          if (!a.isStarter && !b.isStarter)
            return (b.tokenId || 0) - (a.tokenId || 0);
          return a.isStarter ? 1 : -1; // Hybrids first
      }
    });

    return sortedEntities;
  };

  const filteredEntities = getFilteredAndSortedEntities();
  const filteredStarters = filteredEntities.filter((e) => e.isStarter);
  const filteredHybrids = filteredEntities.filter((e) => !e.isStarter);

  // Clear filters function
  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedRarity("all");
    setSelectedType("all");
    setSortBy("newest");
  };

  // Get unique rarity values for filter dropdown (1-5 scale)
  const availableRarities = Array.from(
    new Set(gameState.entities.map((entity) => entity.rarity))
  ).sort((a, b) => a - b);

  // Convert rarity number to display name
  const getRarityName = (rarity: number) => {
    switch (rarity) {
      case 1:
        return "Common";
      case 2:
        return "Uncommon";
      case 3:
        return "Rare";
      case 4:
        return "Epic";
      case 5:
        return "Legendary";
      default:
        return "Unknown";
    }
  };

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

          {/* Filter and Search Controls */}
          {gameState.entities.length > 0 && (
            <div className="bg-black/40 backdrop-blur-lg border border-cyan-500/30 rounded-2xl p-6 shadow-lg shadow-cyan-500/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-cyan-300 flex items-center">
                  <span className="mr-2">🔍</span>
                  SEARCH_FILTERS
                </h3>
                <div className="text-xs text-cyan-400 bg-cyan-900/30 px-2 py-1 rounded-full">
                  {filteredEntities.length}/{gameState.entities.length}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Search Input */}
                <div className="space-y-2">
                  <label className="text-xs text-cyan-300 font-mono uppercase tracking-wide">
                    Search
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Name, attributes..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-black/60 border border-cyan-500/30 rounded-xl px-4 py-2 text-white placeholder-gray-400 focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-200"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm("")}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-cyan-300 transition-colors"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Type Filter */}
                <div className="space-y-2">
                  <label className="text-xs text-cyan-300 font-mono uppercase tracking-wide">
                    Type
                  </label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="w-full bg-black/60 border border-cyan-500/30 rounded-xl px-4 py-2 text-white focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-200"
                  >
                    <option value="all">All Types</option>
                    <option value="starter">Starters</option>
                    <option value="hybrid">Hybrids</option>
                  </select>
                </div>

                {/* Rarity Filter */}
                <div className="space-y-2">
                  <label className="text-xs text-cyan-300 font-mono uppercase tracking-wide">
                    Rarity
                  </label>
                  <select
                    value={selectedRarity}
                    onChange={(e) => setSelectedRarity(e.target.value)}
                    className="w-full bg-black/60 border border-cyan-500/30 rounded-xl px-4 py-2 text-white focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-200"
                  >
                    <option value="all">All Rarities</option>
                    {availableRarities.map((rarity) => (
                      <option key={rarity} value={rarity.toString()}>
                        {getRarityName(rarity)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort By */}
                <div className="space-y-2">
                  <label className="text-xs text-cyan-300 font-mono uppercase tracking-wide">
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full bg-black/60 border border-cyan-500/30 rounded-xl px-4 py-2 text-white focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-200"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="name">Name (A-Z)</option>
                    <option value="rarity">Rarity (High-Low)</option>
                  </select>
                </div>
              </div>

              {/* Active Filters Display */}
              {(searchTerm ||
                selectedType !== "all" ||
                selectedRarity !== "all" ||
                sortBy !== "newest") && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    {searchTerm && (
                      <span className="bg-cyan-900/30 border border-cyan-500/30 text-cyan-200 px-3 py-1 rounded-full text-xs">
                        Search: "{searchTerm}"
                      </span>
                    )}
                    {selectedType !== "all" && (
                      <span className="bg-green-900/30 border border-green-500/30 text-green-200 px-3 py-1 rounded-full text-xs">
                        Type:{" "}
                        {selectedType === "starter" ? "Starters" : "Hybrids"}
                      </span>
                    )}
                    {selectedRarity !== "all" && (
                      <span className="bg-purple-900/30 border border-purple-500/30 text-purple-200 px-3 py-1 rounded-full text-xs">
                        Rarity: {getRarityName(parseInt(selectedRarity))}
                      </span>
                    )}
                    {sortBy !== "newest" && (
                      <span className="bg-magenta-900/30 border border-magenta-500/30 text-magenta-200 px-3 py-1 rounded-full text-xs">
                        Sort:{" "}
                        {sortBy === "oldest"
                          ? "Oldest"
                          : sortBy === "name"
                          ? "Name"
                          : "Rarity"}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={clearAllFilters}
                    className="text-xs text-gray-400 hover:text-cyan-300 hover:bg-cyan-500/20 rounded-xl px-3 py-1 transition-all duration-200 border border-gray-600/30 hover:border-cyan-500/30"
                  >
                    Clear All
                  </button>
                </div>
              )}

              {/* No Results Message */}
              {filteredEntities.length === 0 &&
                gameState.entities.length > 0 && (
                  <div className="mt-4 text-center py-6 bg-yellow-900/20 border border-yellow-500/30 rounded-xl">
                    <div className="text-3xl mb-2">🔍</div>
                    <p className="text-yellow-200 font-mono">
                      No entities match your filters
                    </p>
                    <button
                      onClick={clearAllFilters}
                      className="mt-2 text-xs text-yellow-300 hover:text-yellow-100 hover:bg-yellow-500/20 rounded-lg px-3 py-1 transition-all duration-200"
                    >
                      Clear filters to see all entities
                    </button>
                  </div>
                )}
            </div>
          )}

          {/* Entity Display Section */}
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
            <div className="space-y-8">
              {/* Starter Entities - Compact List */}
              {filteredStarters.length > 0 && (
                <div className="bg-black/40 backdrop-blur-lg border border-green-500/30 rounded-2xl p-6 shadow-lg shadow-green-500/10">
                  <h3 className="text-xl font-bold text-green-300 mb-4 flex items-center">
                    <span className="mr-2">🌟</span>
                    STARTER_ENTITIES
                    <span className="ml-2 text-xs text-cyan-400 bg-cyan-900/30 px-2 py-1 rounded-full">
                      {filteredStarters.length}
                    </span>
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {filteredStarters.map((entity, index) => {
                      const entityIdentifier = entity.name;
                      const isSelected =
                        selectedEntities.includes(entityIdentifier);

                      return (
                        <div
                          key={`starter-${entity.name}-${index}`}
                          className={`
                            relative flex items-center space-x-3 p-3 rounded-xl transition-all duration-300 cursor-pointer border-2
                            ${
                              isSelected
                                ? "bg-cyan-500/20 border-cyan-400/70 shadow-lg shadow-cyan-400/30"
                                : "bg-green-900/20 border-green-500/30 hover:border-green-400/50 hover:bg-green-900/30"
                            }
                            ${
                              isMergeMode &&
                              gameState.entities.length >= 2 &&
                              !mergeInProgress
                                ? "hover:scale-105"
                                : ""
                            }
                          `}
                          onClick={() => {
                            if (
                              isMergeMode &&
                              gameState.entities.length >= 2 &&
                              !mergeInProgress
                            ) {
                              handleEntitySelect(entityIdentifier);
                            } else {
                              handleEntityClick(entity);
                            }
                          }}
                          title={entity.name}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white truncate">
                              {entity.name}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="flex-shrink-0 bg-cyan-500 text-black rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                              ✓
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {isMergeMode && (
                    <p className="text-green-200 text-xs mt-3 font-mono opacity-75">
                      💡 Click starter entities to select them for fusion
                    </p>
                  )}
                </div>
              )}

              {/* Hybrid Entities - Large Cards */}
              {filteredHybrids.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-magenta-300 mb-4 flex items-center">
                    <span className="mr-2">🔮</span>
                    HYBRID_CREATURES
                    <span className="ml-2 text-xs text-cyan-400 bg-cyan-900/30 px-2 py-1 rounded-full">
                      {filteredHybrids.length}
                    </span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredHybrids.map((entity, index) => {
                      const entityIdentifier = entity.tokenId;

                      return (
                        <EntityCard
                          key={entity.tokenId}
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
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pending Merges Section */}
        {gameState.pendingRequests.length > 0 && (
          <div className="mt-8">
            <PendingMergeList
              pendingRequests={gameState.pendingRequests}
              hatchTimers={hatchTimers}
              autoFinalizingRequests={autoFinalizingRequests}
              onFinalize={finalizeMerge}
              address={gameState.address!}
              className="mb-6"
            />
          </div>
        )}

        {/* Hatch Timers - Legacy display (can be removed once PendingMergeList is fully integrated) */}
        {Object.keys(hatchTimers).length > 0 &&
          gameState.pendingRequests.length === 0 && (
            <div className="mt-8 bg-black/40 backdrop-blur-lg border border-yellow-500/30 rounded-2xl p-6 shadow-lg shadow-yellow-500/10">
              <h3 className="text-xl font-bold text-yellow-300 mb-4 flex items-center">
                <span className="mr-2">⏳</span>
                INCUBATION_CHAMBER
                <span className="ml-2 text-xs text-cyan-400 bg-cyan-900/30 px-2 py-1 rounded-full">
                  {Object.keys(hatchTimers).length}
                </span>
              </h3>
              <div className="space-y-3">
                {Object.entries(hatchTimers).map(([requestId, timeLeft]) => (
                  <div
                    key={requestId}
                    className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-3 flex items-center justify-between"
                  >
                    <span className="text-yellow-200 font-mono text-sm">
                      REQUEST #{requestId.slice(0, 8)}...
                    </span>
                    <span className="text-yellow-300 font-bold">
                      {timeLeft > 0 ? `${timeLeft}s` : "READY_TO_HATCH"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
      </div>

      {/* Sticky Fusion Laboratory - Bottom Right */}
      {gameState.entities.length >= 2 && (
        <div className="fixed bottom-6 right-6 z-50">
          <div className="bg-black/90 backdrop-blur-lg border border-magenta-500/50 rounded-2xl p-4 shadow-2xl shadow-magenta-500/20 max-w-xs">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-magenta-300 flex items-center">
                <span className="mr-1">⚡</span>
                FUSION
              </h3>
              <div className="text-xs text-cyan-400 bg-cyan-900/30 px-2 py-1 rounded-full">
                {selectedEntities.length}/2
              </div>
            </div>

            {selectedEntities.length > 0 && (
              <div className="mb-3 text-xs text-magenta-200 font-mono bg-magenta-900/20 border border-magenta-500/30 rounded-lg px-2 py-1">
                #{selectedEntities.join(", #")}
              </div>
            )}

            <div className="space-y-2">
              {/* Merge Mode Toggle */}
              <button
                onClick={toggleMergeMode}
                className={`w-full text-xs font-bold py-2 px-3 rounded-xl transition-all duration-300 border ${
                  isMergeMode
                    ? "bg-red-600/80 hover:bg-red-500/80 text-white border-red-400/50"
                    : "bg-purple-600/80 hover:bg-purple-500/80 text-white border-purple-400/50"
                }`}
              >
                {isMergeMode ? "❌ EXIT" : "⚙️ SELECT"}
              </button>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                {selectedEntities.length > 0 && (
                  <button
                    onClick={() => setSelectedEntities([])}
                    className="flex-1 text-xs text-gray-300 hover:text-cyan-300 hover:bg-cyan-500/20 rounded-xl px-2 py-2 transition-all duration-300 border border-gray-600/30 hover:border-cyan-500/30"
                  >
                    CLEAR
                  </button>
                )}

                {selectedEntities.length === 2 && (
                  <button
                    onClick={handleMerge}
                    disabled={gameState.loading || mergeInProgress}
                    className="flex-1 bg-gradient-to-r from-magenta-600 to-pink-600 hover:from-magenta-500 hover:to-pink-500 disabled:opacity-50 text-white font-bold text-xs py-2 px-3 rounded-xl transition-all duration-300"
                  >
                    {mergeInProgress ? (
                      <span className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-3 w-3 border-b border-white mr-1"></div>
                        FUSE
                      </span>
                    ) : (
                      "🔮 FUSE"
                    )}
                  </button>
                )}
              </div>
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
  );
}
