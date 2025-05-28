import { useState, useEffect, useCallback, useRef } from "react";
import {
  Entity,
  GameState,
  MergeResponse,
  StarterEntityResponse,
} from "@/types/game";
import { contractService } from "@/lib/contracts";

// Global tracking to prevent duplicate auto-finalize calls across component re-renders
const globalAutoFinalizingRequests = new Set<number>();
const globalCompletedRequests = new Set<number>();

export function useGame() {
  const [gameState, setGameState] = useState<GameState>({
    connected: false,
    address: null,
    entities: [],
    pendingRequests: [],
    loading: false,
    error: null,
  });

  const [mergeInProgress, setMergeInProgress] = useState(false);
  const [finalizeInProgress, setFinalizeInProgress] = useState<number[]>([]);
  const [autoFinalizingRequests, setAutoFinalizingRequests] = useState<
    Set<number>
  >(new Set());

  // Use ref to track latest state for callbacks
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  // Cleanup function for intervals
  const clearPollInterval = useCallback((requestId: number) => {}, []);

  const loadPlayerData = useCallback(async (address: string) => {
    if (!address) return;

    try {
      setGameState((prev) => ({ ...prev, loading: true }));

      const response = await fetch(`/api/game/entities?address=${address}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        setGameState((prev) => ({
          ...prev,
          entities: data.entities || [],
          pendingRequests: data.pendingRequests || [],
          loading: false,
        }));
      } else {
        throw new Error(data.error || "Failed to load player data");
      }
    } catch (error: any) {
      console.error("Failed to load player data:", error);
      setGameState((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
    }
  }, []);

  // Add NFT to MetaMask wallet
  const addNFTToWallet = useCallback(
    async (tokenId: number, entity: Entity) => {
      if (typeof window !== "undefined" && window.ethereum) {
        try {
          // Get the NFT contract address from the contract service
          const nftContractAddress =
            await contractService.getNFTContractAddress();

          await window.ethereum.request({
            method: "wallet_watchAsset",
            params: {
              type: "ERC721",
              options: {
                address: nftContractAddress,
                tokenId: tokenId.toString(),
                image: entity.imageURI
                  ? entity.imageURI.replace(
                      "ipfs://",
                      "https://gateway.pinata.cloud/ipfs/"
                    )
                  : undefined,
                name: entity.name,
              },
            },
          });

          console.log(`✅ Added NFT ${entity.name} (#${tokenId}) to MetaMask`);
        } catch (error) {
          console.error("Failed to add NFT to MetaMask:", error);
        }
      }
    },
    []
  );

  // Auto-finalize merge - simplified without polling
  const autoFinalizeMerge = useCallback(
    async (requestId: number) => {
      const currentAddress = gameStateRef.current.address;

      // Multiple layers of protection against duplicate calls
      if (
        !currentAddress ||
        autoFinalizingRequests.has(requestId) ||
        globalAutoFinalizingRequests.has(requestId) ||
        globalCompletedRequests.has(requestId)
      ) {
        console.log(
          `⏭️ Skipping auto-finalize for request ${requestId} - already processing or completed`
        );
        return;
      }

      console.log(`Starting auto-finalization for merge request ${requestId}`);

      // Add to both local and global tracking
      setAutoFinalizingRequests((prev) => new Set(prev).add(requestId));
      globalAutoFinalizingRequests.add(requestId);

      try {
        console.log(`Attempting to finalize merge request ${requestId}`);

        const response = await fetch("/api/game/merge", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: currentAddress,
            requestId,
          }),
        });

        const data = await response.json();

        if (data.success) {
          console.log(`✅ Merge ${requestId} finalized successfully:`, data);

          // Mark as completed globally
          globalCompletedRequests.add(requestId);
          globalAutoFinalizingRequests.delete(requestId);

          // Show success notification
          setGameState((prev) => ({
            ...prev,
            error: null,
          }));

          // Refresh player data to show new entity
          await loadPlayerData(currentAddress);

          // Auto-add the new NFT to MetaMask
          if (data.newEntityId && data.name) {
            setTimeout(() => {
              // Find the newly created entity using the latest state
              const currentEntities = gameStateRef.current.entities;
              const newEntity = currentEntities.find(
                (e) => e.tokenId === data.newEntityId
              );
              if (newEntity) {
                addNFTToWallet(data.newEntityId, newEntity);
              }
            }, 2000); // Wait 2 seconds for data to be loaded
          }
        } else {
          console.log(`⏳ Merge ${requestId} not ready yet:`, data.error);

          // Handle specific error cases
          if (
            data.error.includes("Request already fulfilled") ||
            data.error.includes("already fulfilled") ||
            data.error.includes("This merge has already been completed")
          ) {
            console.log(
              `✅ Merge ${requestId} was already completed, stopping auto-finalization`
            );

            // Mark as completed globally
            globalCompletedRequests.add(requestId);
            globalAutoFinalizingRequests.delete(requestId);

            // Don't set error state, just refresh data to get latest state
            await loadPlayerData(currentAddress);
            return; // Stop trying to finalize this request
          }

          // Set a friendly message for the user only for VRF delays
          if (data.error.includes("VRF randomness not yet fulfilled")) {
            setGameState((prev) => ({
              ...prev,
              error: `Merge ${requestId} is still processing. Please wait a moment and it will complete automatically.`,
            }));
          }
        }
      } catch (error: any) {
        console.log(`⏳ Merge ${requestId} still processing:`, error.message);

        // If the request was already fulfilled, stop trying
        if (
          error.message.includes("Request already fulfilled") ||
          error.message.includes("already fulfilled")
        ) {
          console.log(
            `✅ Merge ${requestId} was already completed, stopping auto-finalization`
          );

          // Mark as completed globally
          globalCompletedRequests.add(requestId);
          globalAutoFinalizingRequests.delete(requestId);

          await loadPlayerData(currentAddress);
          return; // Stop trying to finalize this request
        }
      } finally {
        // Remove from both local and global tracking (but not from completed set)
        setAutoFinalizingRequests((prev) => {
          const newSet = new Set(prev);
          newSet.delete(requestId);
          return newSet;
        });
        globalAutoFinalizingRequests.delete(requestId);
      }
    },
    [loadPlayerData, addNFTToWallet]
  );

  const connectWallet = useCallback(async () => {
    setGameState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const address = await contractService.connectWallet();
      if (address) {
        setGameState((prev) => ({
          ...prev,
          connected: true,
          address,
          loading: false,
        }));

        // Load player data after connection
        await loadPlayerData(address);
      }
    } catch (error: any) {
      setGameState((prev) => ({
        ...prev,
        loading: false,
        error: error.message || "Failed to connect wallet",
      }));
    }
  }, []);

  const claimStarterEntity = useCallback(async () => {
    if (!gameState.address) return;

    setGameState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Call the contract directly from user's wallet instead of through API
      const result = await contractService.claimStarterEntity();

      // Refresh data to show new entities
      await loadPlayerData(gameState.address);

      setGameState((prev) => ({
        ...prev,
        loading: false,
        error: null,
      }));

      return result;
    } catch (error: any) {
      console.error("Claim failed:", error);

      let errorMessage = error.message || "Failed to claim starter entities";

      if (error.message.includes("Already claimed starter entities")) {
        errorMessage = "You have already claimed your starter collection";
      } else if (error.message.includes("execution reverted")) {
        errorMessage =
          "Transaction failed. You may have already claimed your starter entities";
      } else if (error.message.includes("user rejected")) {
        errorMessage = "Transaction was cancelled by user";
      } else if (error.message.includes("insufficient funds")) {
        errorMessage = "Insufficient ETH for gas fees";
      }

      setGameState((prev) => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));

      throw error;
    }
  }, [gameState.address, loadPlayerData]);

  const requestMerge = useCallback(
    async (entity1Id: number, entity2Id: number) => {
      if (!gameState.address || mergeInProgress) return;

      setMergeInProgress(true);
      setGameState((prev) => ({ ...prev, error: null }));

      try {
        console.log(
          `Requesting merge for entities ${entity1Id} and ${entity2Id}`
        );

        // Validate entities exist and are owned by the player
        const entity1 = gameState.entities.find((e) => e.tokenId === entity1Id);
        const entity2 = gameState.entities.find((e) => e.tokenId === entity2Id);

        if (!entity1 || !entity2) {
          throw new Error(
            "One or both selected entities not found in your collection"
          );
        }

        if (entity1Id === entity2Id) {
          throw new Error("Cannot merge an entity with itself");
        }

        // Check if player can merge (cooldown check)
        const canMerge = await contractService.canPlayerMerge(
          gameState.address
        );
        if (!canMerge) {
          throw new Error(
            "Merge cooldown active. Please wait before requesting another merge."
          );
        }

        // Initiate merge transaction via contract
        console.log(
          `Initiating merge transaction for entities ${entity1Id} and ${entity2Id}`
        );
        console.log(`Entity 1: ${entity1.name} (${entity1.tokenId})`);
        console.log(`Entity 2: ${entity2.name} (${entity2.tokenId})`);

        const txResult = await contractService.requestMerge(
          entity1Id,
          entity2Id
        );
        console.log("Merge transaction successful:", txResult);

        // Reload data to get the new pending request
        await loadPlayerData(gameState.address);

        // Start auto-finalization for the newest pending request
        // The requestId is typically the latest one after refresh
        setTimeout(async () => {
          try {
            // Get updated pending requests
            const response = await fetch(
              `/api/game/entities?address=${gameState.address}`
            );
            const data = await response.json();
            if (data.success && data.pendingRequests?.length > 0) {
              // Auto-finalize the most recent request ONLY if not already auto-finalizing
              const latestRequestId = Math.max(...data.pendingRequests);
              if (!autoFinalizingRequests.has(latestRequestId)) {
                console.log(
                  `🚀 Starting auto-finalization for request ${latestRequestId}`
                );
                autoFinalizeMerge(latestRequestId);
              } else {
                console.log(
                  `⏭️ Request ${latestRequestId} already being auto-finalized, skipping`
                );
              }
            }
          } catch (error) {
            console.error("Failed to start auto-finalization:", error);
          }
        }, 1000); // Small delay to ensure data is loaded

        return txResult;
      } catch (error: any) {
        console.error("Merge request failed:", error);

        // Provide more specific error messages
        let errorMessage = error.message || "Failed to request merge";

        if (error.message.includes("execution reverted")) {
          if (error.data === "0x1f6a65b6") {
            errorMessage =
              "Merge request failed. Please ensure you own both entities and the merge cooldown has passed.";
          } else {
            errorMessage =
              "Smart contract execution failed. Please check your entity ownership and try again.";
          }
        } else if (error.message.includes("user rejected")) {
          errorMessage = "Transaction was cancelled by user.";
        } else if (error.message.includes("insufficient funds")) {
          errorMessage =
            "Insufficient ETH for gas fees. Please add funds to your wallet.";
        }

        setGameState((prev) => ({
          ...prev,
          error: errorMessage,
        }));
        throw error;
      } finally {
        setMergeInProgress(false);
      }
    },
    [
      gameState.address,
      gameState.entities,
      mergeInProgress,
      loadPlayerData,
      autoFinalizeMerge,
    ]
  );

  const finalizeMerge = useCallback(
    async (requestId: number) => {
      if (!gameState.address || finalizeInProgress.includes(requestId)) return;

      setFinalizeInProgress((prev) => [...prev, requestId]);
      setGameState((prev) => ({ ...prev, error: null }));

      try {
        console.log(`Finalizing merge request ${requestId}`);

        const response = await fetch("/api/game/merge", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: gameState.address,
            requestId,
          }),
        });

        const data = await response.json();

        if (data.success) {
          console.log("Merge finalized successfully:", data);

          // Refresh player data to show new entity and remove pending request
          await loadPlayerData(gameState.address);

          return {
            success: true,
            newEntityId: data.newEntityId,
            name: data.name,
            rarity: data.rarity,
            imageURI: data.imageURI,
            message: data.message,
          };
        } else {
          throw new Error(data.error || "Failed to finalize merge");
        }
      } catch (error: any) {
        console.error("Finalize merge failed:", error);

        let errorMessage = error.message || "Failed to finalize merge";

        if (error.message.includes("VRF randomness not yet fulfilled")) {
          errorMessage =
            "Randomness generation is still in progress. Please wait a bit longer and try again.";
        } else if (error.message.includes("already fulfilled")) {
          errorMessage = "This merge has already been completed.";
        } else if (error.message.includes("Unauthorized")) {
          errorMessage = "You don't have permission to finalize this merge.";
        }

        setGameState((prev) => ({
          ...prev,
          error: errorMessage,
        }));
        throw error;
      } finally {
        setFinalizeInProgress((prev) => prev.filter((id) => id !== requestId));
      }
    },
    [gameState.address, finalizeInProgress, loadPlayerData]
  );

  const clearError = useCallback(() => {
    setGameState((prev) => ({ ...prev, error: null }));
  }, []);

  const refreshData = useCallback(async () => {
    if (gameState.address) {
      await loadPlayerData(gameState.address);
    }
  }, [gameState.address, loadPlayerData]);

  // Check for wallet connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window !== "undefined" && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: "eth_accounts",
          });

          if (accounts.length > 0) {
            await contractService.initialize();
            const address = accounts[0];
            setGameState((prev) => ({
              ...prev,
              connected: true,
              address,
            }));
            await loadPlayerData(address);
          }
        } catch (error) {
          console.error("Failed to check wallet connection:", error);
        }
      }
    };

    checkConnection();
  }, [loadPlayerData]);

  // Listen for account changes
  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      const handleAccountsChanged = async (accounts: string[]) => {
        if (accounts.length === 0) {
          // User disconnected
          setGameState({
            connected: false,
            address: null,
            entities: [],
            pendingRequests: [],
            loading: false,
            error: null,
          });
        } else if (accounts[0] !== gameState.address) {
          // User switched accounts
          await contractService.initialize();
          setGameState((prev) => ({
            ...prev,
            address: accounts[0],
            entities: [],
            pendingRequests: [],
          }));
          await loadPlayerData(accounts[0]);
        }
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);

      return () => {
        window.ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged
        );
      };
    }
  }, [gameState.address, loadPlayerData]);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      // No intervals to clear in the simplified version
    };
  }, []);

  // Auto-start finalization for existing pending requests when component mounts
  useEffect(() => {
    if (gameState.connected && gameState.pendingRequests.length > 0) {
      gameState.pendingRequests.forEach((requestId) => {
        if (!autoFinalizingRequests.has(requestId)) {
          console.log(
            `🔄 Auto-starting finalization for existing request ${requestId}`
          );
          autoFinalizeMerge(requestId);
        }
      });
    }
  }, [
    gameState.connected,
    gameState.pendingRequests,
    autoFinalizeMerge,
    autoFinalizingRequests,
  ]);

  return {
    gameState,
    mergeInProgress,
    finalizeInProgress,
    autoFinalizingRequests,
    connectWallet,
    claimStarterEntity,
    requestMerge,
    finalizeMerge,
    loadPlayerData,
    refreshData,
    clearError,
    addNFTToWallet, // Export the function for manual use
  };
}
