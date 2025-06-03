import { useState, useEffect, useCallback, useRef } from "react";
import { Entity, GameState, MergeResponse, HatchTimer } from "@/types/game";
import { contractService } from "@/lib/contracts";

// Global tracking to prevent duplicate auto-finalize calls across component re-renders
const globalAutoFinalizingRequests = new Set<bigint>();
const globalCompletedRequests = new Set<bigint>();

// VRF timing constants
const VRF_EXPECTED_TIME = 120; // 2 minutes in seconds
const VRF_POLL_INTERVAL = 10; // Poll every 10 seconds
const VRF_MAX_WAIT_TIME = 300; // 5 minutes max wait

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
  const [finalizeInProgress, setFinalizeInProgress] = useState<bigint[]>([]);
  const [autoFinalizingRequests, setAutoFinalizingRequests] = useState<
    Set<bigint>
  >(new Set());

  // Hatch timer state for VRF requests
  const [hatchTimers, setHatchTimers] = useState<Map<bigint, HatchTimer>>(
    new Map()
  );

  // Use ref to track latest state for callbacks
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  // Start hatch timer for a VRF request
  const startHatchTimer = useCallback(
    (requestId: bigint, entity1Name: string, entity2Name: string) => {
      const startTime = Date.now();
      const endTime = startTime + VRF_EXPECTED_TIME * 1000;

      const timer: HatchTimer = {
        requestId,
        entity1Name,
        entity2Name,
        startTime,
        endTime,
        duration: VRF_EXPECTED_TIME,
        stage: "waiting",
        progress: 0,
      };

      setHatchTimers((prev) => new Map(prev).set(requestId, timer));

      // Start the timer update interval
      const interval = setInterval(() => {
        const now = Date.now();
        const elapsed = (now - startTime) / 1000;
        const progress = Math.min(elapsed / VRF_EXPECTED_TIME, 1);

        let stage: HatchTimer["stage"] = "waiting";
        if (progress >= 0.8) {
          stage = "almost_ready";
        } else if (progress >= 0.5) {
          stage = "incubating";
        }

        setHatchTimers((prev) => {
          const newMap = new Map(prev);
          const currentTimer = newMap.get(requestId);
          if (currentTimer) {
            newMap.set(requestId, {
              ...currentTimer,
              progress,
              stage,
            });
          }
          return newMap;
        });

        // Clean up interval when timer expires or request is completed
        if (progress >= 1 || !hatchTimers.has(requestId)) {
          clearInterval(interval);
        }
      }, 1000); // Update every second for smooth animation

      return interval;
    },
    []
  );

  // Complete hatch timer when merge is finalized
  const completeHatchTimer = useCallback((requestId: bigint) => {
    setHatchTimers((prev) => {
      const newMap = new Map(prev);
      const timer = newMap.get(requestId);
      if (timer) {
        newMap.set(requestId, {
          ...timer,
          stage: "hatched",
          progress: 1,
        });

        // Remove timer after animation completes
        setTimeout(() => {
          setHatchTimers((current) => {
            const updated = new Map(current);
            updated.delete(requestId);
            return updated;
          });
        }, 3000);
      }
      return newMap;
    });
  }, []);

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
        // Convert pending requests to bigint array
        const pendingRequests = data.pendingRequests
          ? data.pendingRequests.map((id: any) => BigInt(id))
          : [];

        setGameState((prev) => ({
          ...prev,
          entities: data.entities || [],
          pendingRequests,
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

  // Add NFT to MetaMask wallet (only for hybrid entities)
  const addNFTToWallet = useCallback(
    async (tokenId: number, entity: Entity) => {
      if (
        typeof window !== "undefined" &&
        window.ethereum &&
        !entity.isStarter
      ) {
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

  // Enhanced auto-finalize merge with VRF timing and hatch timer
  const autoFinalizeMerge = useCallback(
    async (requestId: bigint, entity1Name?: string, entity2Name?: string) => {
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

      console.log(
        `🥚 Starting VRF hatch process for merge request ${requestId}`
      );

      // Start hatch timer if entity names are provided
      if (entity1Name && entity2Name) {
        startHatchTimer(requestId, entity1Name, entity2Name);
      }

      // Add to both local and global tracking
      setAutoFinalizingRequests((prev) => new Set(prev).add(requestId));
      globalAutoFinalizingRequests.add(requestId);

      // VRF polling with exponential backoff
      const pollVRF = async (attempt: number = 0): Promise<void> => {
        const maxAttempts = Math.ceil(VRF_MAX_WAIT_TIME / VRF_POLL_INTERVAL);

        if (attempt >= maxAttempts) {
          console.log(
            `⏰ VRF timeout for request ${requestId} after ${VRF_MAX_WAIT_TIME}s`
          );
          setGameState((prev) => ({
            ...prev,
            error: `VRF request ${requestId} timed out. Please try manual finalization.`,
          }));
          return;
        }

        try {
          console.log(
            `🔍 Polling VRF for request ${requestId} (attempt ${attempt + 1})`
          );

          const response = await fetch("/api/game/merge", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              address: currentAddress,
              requestId: requestId.toString(), // Convert bigint to string for JSON
            }),
          });

          const data = await response.json();

          if (data.success) {
            console.log(`✅ Merge ${requestId} finalized successfully:`, data);

            // Mark as completed globally
            globalCompletedRequests.add(requestId);
            globalAutoFinalizingRequests.delete(requestId);

            // Complete the hatch timer
            completeHatchTimer(requestId);

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
            return;
          } else {
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
              completeHatchTimer(requestId);

              // Don't set error state, just refresh data to get latest state
              await loadPlayerData(currentAddress);
              return; // Stop trying to finalize this request
            }

            // Handle authorization errors - this indicates the request belongs to a different wallet
            if (
              data.error.includes("Unauthorized") ||
              data.error.includes("belongs to")
            ) {
              console.log(
                `🚫 Authorization error for request ${requestId}:`,
                data.error
              );

              // Mark as completed to stop polling
              globalCompletedRequests.add(requestId);
              globalAutoFinalizingRequests.delete(requestId);
              completeHatchTimer(requestId);

              // Set a user-friendly error message
              setGameState((prev) => ({
                ...prev,
                error:
                  "This merge request was created with a different wallet. Please connect the correct wallet or ignore this request.",
              }));
              return;
            }

            // Continue polling for VRF delays
            if (data.error.includes("VRF randomness not yet fulfilled")) {
              console.log(
                `⏳ VRF not ready for request ${requestId}, continuing to poll...`
              );

              // Calculate next poll interval with exponential backoff (max 30s)
              const nextInterval = Math.min(
                VRF_POLL_INTERVAL * Math.pow(1.2, attempt),
                30
              );
              setTimeout(() => pollVRF(attempt + 1), nextInterval * 1000);
              return;
            }

            // For other errors, log and retry with longer delay
            console.log(`⚠️ Merge ${requestId} error:`, data.error);
            setTimeout(() => pollVRF(attempt + 1), VRF_POLL_INTERVAL * 1000);
          }
        } catch (error: any) {
          console.log(`⏳ Merge ${requestId} polling error:`, error.message);

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
            completeHatchTimer(requestId);

            await loadPlayerData(currentAddress);
            return; // Stop trying to finalize this request
          }

          // Continue polling for network errors
          setTimeout(() => pollVRF(attempt + 1), VRF_POLL_INTERVAL * 1000);
        }
      };

      // Start polling immediately
      setTimeout(() => pollVRF(0), 1000); // Start after 1 second

      // Cleanup tracking after max wait time
      setTimeout(() => {
        setAutoFinalizingRequests((prev) => {
          const newSet = new Set(prev);
          newSet.delete(requestId);
          return newSet;
        });
        globalAutoFinalizingRequests.delete(requestId);
      }, VRF_MAX_WAIT_TIME * 1000);
    },
    [loadPlayerData, addNFTToWallet, startHatchTimer, completeHatchTimer]
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
  }, [loadPlayerData]);

  // Updated request merge to handle virtual starter entities
  const requestMerge = useCallback(
    async (entity1: Entity, entity2: Entity) => {
      if (!gameState.address || mergeInProgress) return;

      setMergeInProgress(true);
      setGameState((prev) => ({ ...prev, error: null }));

      try {
        console.log(
          `Requesting merge for entities ${entity1.name} and ${entity2.name}`
        );

        // Validate entities
        if (!entity1 || !entity2) {
          throw new Error("One or both selected entities not found");
        }

        if (
          entity1.name === entity2.name &&
          !entity1.isStarter &&
          !entity2.isStarter &&
          entity1.tokenId === entity2.tokenId
        ) {
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

        // Prepare merge data for the new contract signature
        const entity1TokenId = entity1.isStarter ? 0 : entity1.tokenId;
        const entity2TokenId = entity2.isStarter ? 0 : entity2.tokenId;

        // Initiate merge transaction via contract
        console.log(
          `Initiating merge transaction for entities ${entity1.name} (starter: ${entity1.isStarter}) and ${entity2.name} (starter: ${entity2.isStarter})`
        );

        const txResult = await contractService.requestMerge(
          entity1.name,
          entity2.name,
          entity1.isStarter,
          entity2.isStarter,
          entity1TokenId,
          entity2TokenId
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
                // Pass entity names to start hatch timer
                autoFinalizeMerge(latestRequestId, entity1.name, entity2.name);
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
      mergeInProgress,
      loadPlayerData,
      autoFinalizeMerge,
      autoFinalizingRequests,
    ]
  );

  const finalizeMerge = useCallback(
    async (requestId: bigint) => {
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
            requestId: requestId.toString(), // Convert bigint to string for JSON
          }),
        });

        const data = await response.json();

        if (data.success) {
          console.log("Merge finalized successfully:", data);

          // Refresh player data to show new entity and remove pending request
          await loadPlayerData(gameState.address);

          // Complete the hatch timer for this request
          completeHatchTimer(requestId);

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
    [gameState.address, finalizeInProgress, loadPlayerData, completeHatchTimer]
  );

  const clearError = useCallback(() => {
    setGameState((prev) => ({ ...prev, error: null }));
  }, []);

  const refreshData = useCallback(async () => {
    if (gameState.address) {
      await loadPlayerData(gameState.address);
    }
  }, [gameState.address, loadPlayerData]);

  // Claim starter entities for new players
  const claimStarterEntity = useCallback(async () => {
    if (!gameState.address) return;

    setGameState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch("/api/game/claim-starter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: gameState.address }),
      });

      const data = await response.json();

      if (data.success) {
        await loadPlayerData(gameState.address);
        return data;
      } else {
        throw new Error(data.error || "Failed to claim starter entities");
      }
    } catch (error: any) {
      console.error("Failed to claim starter entities:", error);
      setGameState((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
      throw error;
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
    requestMerge,
    finalizeMerge,
    loadPlayerData,
    refreshData,
    clearError,
    addNFTToWallet, // Export the function for manual use
    claimStarterEntity, // Export the claimStarterEntity function
    hatchTimers, // Expose hatch timers state
    startHatchTimer, // Expose function to start hatch timer
    completeHatchTimer, // Expose function to complete hatch timer
  };
}
