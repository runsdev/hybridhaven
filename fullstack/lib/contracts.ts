import { ethers } from "ethers";
import { ContractAddresses } from "@/types/game";
import { fetchMetadataFromIPFS, formatIPFSUrl } from "./ipfs";

// Updated Contract ABIs for the new contract structure
export const NFT_CONTRACT_ABI = [
  // Entity and token management - updated to use metadataURI
  "function getEntity(uint256 tokenId) external view returns (tuple(uint256 tokenId, string name, uint8 rarity, string metadataURI, string parent1, string parent2, uint256 createdAt, bool isStarter))",
  "function getTokensByOwner(address owner) external view returns (uint256[])",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function totalSupply() public view returns (uint256)",
  "function exists(uint256 tokenId) external view returns (bool)",

  // Minting functions (owner only) - only mintHybridEntity exists
  "function mintHybridEntity(address to, string name, uint8 rarity, string metadataURI, string parent1, string parent2) external returns (uint256)",

  // Metadata management
  "function updateEntityMetadata(uint256 tokenId, string metadataURI) external",
  "function setBaseTokenURI(string baseURI) external",
  "function tokenURI(uint256 tokenId) public view returns (string)",
  "function freezeMetadata(uint256 tokenId) external",
  "function batchFreezeMetadata(uint256 fromTokenId, uint256 toTokenId) external",

  // ERC721 standard
  "function name() public view returns (string)",
  "function symbol() public view returns (string)",
  "function transferFrom(address from, address to, uint256 tokenId) external",
  "function approve(address to, uint256 tokenId) external",
  "function getApproved(uint256 tokenId) external view returns (address)",
  "function setApprovalForAll(address operator, bool approved) external",
  "function isApprovedForAll(address owner, address operator) external view returns (bool)",

  // Events
  "event EntityMinted(address indexed to, uint256 indexed tokenId, string name, uint8 rarity)",
  "event MetadataUpdate(uint256 indexed tokenId)",
  "event BatchMetadataUpdate(uint256 fromTokenId, uint256 toTokenId)",
  "event PermanentURI(string value, uint256 indexed id)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)",
  "event ApprovalForAll(address indexed owner, address indexed operator, bool approved)",
];

export const GAME_CONTRACT_ABI = [
  // Core game functions - requestMerge requires payment
  "function requestMerge(string entity1Name, string entity2Name, bool entity1IsStarter, bool entity2IsStarter, uint256 entity1TokenId, uint256 entity2TokenId) external payable",
  "function completeMerge(uint256 requestId, string newEntityName, string metadataURI) external",
  "function cancelMergeRequest(uint256 requestId) external",

  // Game state queries
  "function getMergeRequest(uint256 requestId) external view returns (tuple(address player, string entity1Name, string entity2Name, bool entity1IsStarter, bool entity2IsStarter, uint256 entity1TokenId, uint256 entity2TokenId, uint256 requestId, bool fulfilled, uint256 timestamp))",
  "function getPendingRequests(address player) external view returns (uint256[])",
  "function canPlayerMerge(address player) external view returns (bool)",
  "function timeUntilNextMerge(address player) external view returns (uint256)",
  "function isRandomnessReady(uint256 requestId) external view returns (bool)",
  "function getRequestRandomness(uint256 requestId) external view returns (uint256)",

  // Configuration getters
  "function mergeCooldown() external view returns (uint256)",
  "function lastMergeTime(address player) external view returns (uint256)",
  "function getNFTContract() external view returns (address)",
  "function getVRFConsumer() external view returns (address)",
  "function getBackendAddress() external view returns (address)",

  // Contract management (owner only)
  "function setBackendAddress(address backendAddress) external",
  "function setNFTContract(address nftContract) external",
  "function setVRFConsumer(address vrfConsumer) external",
  "function updateMergeCooldown(uint256 newCooldown) external",

  // Starter entities
  "function getStarterEntities() external view returns (string[])",
  "function isValidStarterEntity(string name) external view returns (bool)",

  // Events
  "event MergeRequested(address indexed player, string entity1Name, string entity2Name, uint256 requestId)",
  "event MergeCompleted(address indexed player, uint256 newEntityId, uint8 rarity, uint256 requestId)",
  "event BackendAddressUpdated(address indexed oldAddress, address indexed newAddress)",
  "event NFTContractUpdated(address indexed oldAddress, address indexed newAddress)",
  "event VRFConsumerUpdated(address indexed oldAddress, address indexed newAddress)",
];

export const VRF_CONTRACT_ABI = [
  // Core VRF functions
  "function requestRandomWords(bool enableNativePayment) external returns (uint256)",
  "function getRequestStatus(uint256 requestId) external view returns (bool fulfilled, uint256[] randomWords)",

  // Configuration getters
  "function s_subscriptionId() external view returns (uint256)",
  "function keyHash() external view returns (bytes32)",
  "function callbackGasLimit() external view returns (uint32)",
  "function requestConfirmations() external view returns (uint16)",
  "function numWords() external view returns (uint32)",
  "function lastRequestId() external view returns (uint256)",
  "function requestIds(uint256 index) external view returns (uint256)",

  // Request status mapping
  "function s_requests(uint256 requestId) external view returns (bool fulfilled, bool exists, uint256[] randomWords)",

  // Events
  "event RequestSent(uint256 requestId, uint32 numWords)",
  "event RequestFulfilled(uint256 requestId, uint256[] randomWords)",
];

// Helper function to fetch and parse NFT metadata following ERC-721 standard
async function fetchEntityMetadata(metadataURI: string) {
  if (!metadataURI) {
    return {
      imageURI: "",
      description: "",
      attributes: [],
    };
  }

  try {
    // Fetch the metadata JSON from IPFS
    const metadata = await fetchMetadataFromIPFS(metadataURI);

    return {
      imageURI: formatIPFSUrl(metadata.image || ""), // Extract image field from metadata
      description: metadata.description || "",
      attributes: metadata.attributes || [],
    };
  } catch (error) {
    console.warn("Failed to fetch metadata:", error);
    return {
      imageURI: "",
      description: "",
      attributes: [],
    };
  }
}

// Helper function to serialize bigint and other non-JSON types
function serializeContractResponse(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === "bigint") {
    return obj.toString();
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeContractResponse);
  }

  if (typeof obj === "object") {
    const serialized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      serialized[key] = serializeContractResponse(value);
    }
    return serialized;
  }

  return obj;
}

// Contract addresses with validation
export const CONTRACT_ADDRESSES: ContractAddresses = (() => {
  return {
    gameContract: process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS!,
    nftContract: process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS!,
    vrfConsumer: process.env.NEXT_PUBLIC_VRF_CONTRACT_ADDRESS!,
  };
})();

// Network configuration
export const NETWORK_CONFIG = {
  chainId: 11155111, // Sepolia testnet
  chainName: "Sepolia",
  rpcUrl:
    process.env.NEXT_PUBLIC_RPC_URL ||
    "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
  blockExplorer: "https://sepolia.etherscan.io",
};

// Backend contract service for API routes
export class BackendContractService {
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;
  private gameContract: ethers.Contract;
  private nftContract: ethers.Contract;
  private vrfContract: ethers.Contract;

  constructor() {
    if (!process.env.BACKEND_PRIVATE_KEY) {
      throw new Error("BACKEND_PRIVATE_KEY not found in environment variables");
    }

    this.provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
    this.signer = new ethers.Wallet(
      process.env.BACKEND_PRIVATE_KEY,
      this.provider
    );

    this.gameContract = new ethers.Contract(
      CONTRACT_ADDRESSES.gameContract,
      GAME_CONTRACT_ABI,
      this.signer
    );

    this.nftContract = new ethers.Contract(
      CONTRACT_ADDRESSES.nftContract,
      NFT_CONTRACT_ABI,
      this.signer
    );

    this.vrfContract = new ethers.Contract(
      CONTRACT_ADDRESSES.vrfConsumer,
      VRF_CONTRACT_ABI,
      this.signer
    );
  }

  // Get all starter entities from contract
  async getStarterEntities(): Promise<string[]> {
    try {
      const starterEntities = await this.gameContract.getStarterEntities();
      return starterEntities;
    } catch (error) {
      console.error("Error fetching starter entities:", error);
      return [
        "Fire",
        "Water",
        "Earth",
        "Air",
        "Light",
        "Shadow",
        "Metal",
        "Crystal",
        "Lightning",
        "Ice",
        "Plant",
        "Beast",
        "Aquatic",
        "Avian",
        "Insect",
        "Stellar",
        "Lunar",
        "Solar",
        "Void",
        "Nebula",
        "Forest",
        "Desert",
        "Ocean",
        "Mountain",
        "Swamp",
        "Wolf",
        "Tiger",
        "Eagle",
        "Bear",
        "Fox",
        "Oak",
        "Rose",
        "Cactus",
        "Lotus",
        "Fern",
      ];
    }
  }

  // Get player entities - now properly fetches metadata and extracts image URLs
  async getPlayerEntities(address: string) {
    try {
      // Get actual NFTs owned by the player
      const tokenIds = await this.nftContract.getTokensByOwner(address);
      const hybridEntities = [];

      for (const tokenId of tokenIds) {
        const entity = await this.nftContract.getEntity(tokenId);

        // Fetch metadata and extract image URL following NFT standard
        const metadata = await fetchEntityMetadata(String(entity.metadataURI));

        hybridEntities.push({
          tokenId: Number(entity.tokenId),
          name: String(entity.name),
          rarity: Number(entity.rarity),
          imageURI: metadata.imageURI, // Now properly extracted from metadata JSON
          parent1: String(entity.parent1),
          parent2: String(entity.parent2),
          createdAt: Number(entity.createdAt),
          isStarter: false, // All minted NFTs are hybrids
          description:
            metadata.description ||
            `A ${entity.rarity}-star hybrid created from ${entity.parent1} and ${entity.parent2}`,
          metadataURI: String(entity.metadataURI), // Store the actual metadataURI
        });
      }

      // Get starter entities and create virtual entities
      const starterNames = await this.getStarterEntities();
      const starterEntities = starterNames.map((name, index) => ({
        tokenId: 0, // Virtual starter entities have tokenId 0
        name,
        rarity: 1,
        imageURI: "", // Starter entities don't have images stored on-chain
        parent1: "",
        parent2: "",
        createdAt: Date.now(),
        isStarter: true,
        description: `A starter entity: ${name}`,
        metadataURI: "",
      }));

      // Return both starter and hybrid entities
      return [...starterEntities, ...hybridEntities];
    } catch (error) {
      console.error("Error fetching player entities:", error);
      throw new Error("Failed to fetch player entities from blockchain");
    }
  }

  // Updated request merge method for new contract signature
  async requestMerge(
    entity1Name: string,
    entity2Name: string,
    entity1IsStarter: boolean,
    entity2IsStarter: boolean,
    entity1TokenId: number,
    entity2TokenId: number
  ) {
    console.log("🔗 [CONTRACT] Starting blockchain merge request");
    console.log("📋 [CONTRACT] Contract parameters:", {
      entity1Name,
      entity2Name,
      entity1IsStarter,
      entity2IsStarter,
      entity1TokenId,
      entity2TokenId,
    });

    // Include the required payment of 0.0001 ETH
    const paymentAmount = ethers.parseEther("0.0001");
    console.log(
      "💰 [CONTRACT] Payment amount:",
      ethers.formatEther(paymentAmount),
      "ETH"
    );

    try {
      console.log("📝 [CONTRACT] Calling gameContract.requestMerge...");
      const tx = await this.gameContract!.requestMerge(
        entity1Name,
        entity2Name,
        entity1IsStarter,
        entity2IsStarter,
        entity1TokenId,
        entity2TokenId,
        { value: paymentAmount } // Add the payment here
      );

      console.log("⏳ [CONTRACT] Transaction submitted:", {
        hash: tx.hash,
        gasLimit: tx.gasLimit?.toString(),
        gasPrice: tx.gasPrice?.toString(),
        value: ethers.formatEther(tx.value || 0),
      });

      console.log("⏳ [CONTRACT] Waiting for transaction confirmation...");
      const receipt = await tx.wait();

      console.log("✅ [CONTRACT] Transaction confirmed:", {
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status,
        gasUsed: receipt.gasUsed?.toString(),
        effectiveGasPrice: receipt.effectiveGasPrice?.toString(),
      });

      return {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status,
      };
    } catch (error: any) {
      console.error("❌ [CONTRACT] Blockchain transaction failed:", error);
      console.log("🔍 [CONTRACT] Error details:", {
        message: error.message,
        code: error.code,
        data: error.data,
        reason: error.reason,
        method: error.method,
        transaction: error.transaction,
      });
      throw error;
    }
  }

  async completeMerge(
    requestId: number | string | bigint,
    newEntityName: string,
    metadataURI: string
  ) {
    try {
      // Convert to BigInt to handle large numbers properly and avoid overflow
      const requestIdBigInt = BigInt(requestId);
      // Updated to match actual contract signature
      const tx = await this.gameContract.completeMerge(
        requestIdBigInt,
        newEntityName,
        metadataURI
      );
      const receipt = await tx.wait();

      // Parse the MergeCompleted event
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = this.gameContract.interface.parseLog(log);
          return parsed?.name === "MergeCompleted";
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = this.gameContract.interface.parseLog(event);
        return {
          newEntityId: Number(parsed?.args?.newEntityId),
          player: String(parsed?.args?.player),
          rarity: Number(parsed?.args?.rarity),
          requestId: Number(parsed?.args?.requestId),
          transactionHash: receipt.hash,
        };
      }

      return { transactionHash: receipt.hash };
    } catch (error: any) {
      console.error("Error completing merge:", error);

      // Handle specific smart contract errors more gracefully
      if (
        error?.reason === "Request already fulfilled" ||
        error?.message?.includes("Request already fulfilled")
      ) {
        throw new Error("Request already fulfilled");
      }

      // For other errors, provide more context
      if (error?.reason) {
        throw new Error(`Smart contract error: ${error.reason}`);
      }

      throw error;
    }
  }

  async getMergeRequest(requestId: number | string | bigint) {
    try {
      // Convert to BigInt to handle large numbers properly and avoid overflow
      const requestIdBigInt = BigInt(requestId);
      const result = await this.gameContract.getMergeRequest(requestIdBigInt);
      return {
        player: String(result.player),
        entity1Name: String(result.entity1Name),
        entity2Name: String(result.entity2Name),
        entity1IsStarter: Boolean(result.entity1IsStarter),
        entity2IsStarter: Boolean(result.entity2IsStarter),
        entity1TokenId: Number(result.entity1TokenId),
        entity2TokenId: Number(result.entity2TokenId),
        requestId: Number(result.requestId),
        fulfilled: Boolean(result.fulfilled),
        timestamp: Number(result.timestamp),
      };
    } catch (error) {
      console.error("Error fetching merge request:", error);
      throw error;
    }
  }

  async canPlayerMerge(address: string): Promise<boolean> {
    try {
      return await this.gameContract.canPlayerMerge(address);
    } catch (error) {
      console.error("Error checking if player can merge:", error);
      return false;
    }
  }

  async getNFTContractAddress(): Promise<string> {
    try {
      return await this.gameContract.getNFTContract();
    } catch (error) {
      console.error("Error getting NFT contract address:", error);
      return CONTRACT_ADDRESSES.nftContract;
    }
  }

  async getPendingRequests(address: string): Promise<bigint[]> {
    try {
      const requests = await this.gameContract.getPendingRequests(address);
      return requests.map((id: any) => BigInt(id));
    } catch (error) {
      console.error("Error fetching pending requests:", error);
      return [];
    }
  }

  // Get entity by token ID for metadata API - now properly fetches metadata
  async getEntity(tokenId: number) {
    try {
      const entity = await this.nftContract.getEntity(tokenId);

      // Fetch metadata and extract image URL following NFT standard
      const metadata = await fetchEntityMetadata(String(entity.metadataURI));

      return {
        tokenId: Number(entity.tokenId),
        name: String(entity.name),
        rarity: Number(entity.rarity),
        imageURI: metadata.imageURI, // Now properly extracted from metadata JSON
        parent1: String(entity.parent1),
        parent2: String(entity.parent2),
        createdAt: Number(entity.createdAt),
        isStarter: Boolean(entity.isStarter),
        description:
          metadata.description ||
          `A ${entity.rarity}-star ${
            entity.isStarter ? "starter" : "hybrid"
          } entity${
            !entity.isStarter && entity.parent1 && entity.parent2
              ? ` created from ${entity.parent1} and ${entity.parent2}`
              : ""
          }`,
        metadataURI: String(entity.metadataURI), // Store the actual metadataURI
        attributes: metadata.attributes, // Include NFT attributes
      };
    } catch (error) {
      console.error("Error fetching entity:", error);
      throw error;
    }
  }

  // Get randomness result for VRF requests
  async getRandomnessResult(requestId: bigint): Promise<number> {
    try {
      // Convert to BigInt to handle large numbers properly and avoid overflow
      const requestIdBigInt = BigInt(requestId);
      console.log("🎲 [CONTRACT] Checking VRF status for request:", {
        originalRequestId: requestId.toString(),
        convertedRequestId: requestIdBigInt.toString(),
      });

      // Use getRequestStatus instead of getRandomnessResult
      const result = await this.vrfContract.getRequestStatus(requestIdBigInt);
      console.log("🎲 [CONTRACT] VRF status result:", {
        fulfilled: result.fulfilled,
        randomWordsLength: result.randomWords?.length || 0,
        randomWords:
          result.randomWords?.map((w: { toString: () => any }) =>
            w.toString()
          ) || [],
      });

      // Check if the request is fulfilled and has randomness
      if (
        !result.fulfilled ||
        !result.randomWords ||
        result.randomWords.length === 0
      ) {
        console.log("⏳ [CONTRACT] VRF not fulfilled yet");
        return 0; // Return 0 to indicate VRF not yet fulfilled
      }

      // Return the first random word as the randomness value
      const randomness = Number(result.randomWords[0]);
      console.log("✅ [CONTRACT] VRF randomness obtained:", { randomness });
      return randomness;
    } catch (error: any) {
      console.error("❌ [CONTRACT] Error getting VRF randomness:", error);
      console.log("🔍 [CONTRACT] VRF error details:", {
        message: error.message,
        reason: error.reason,
        code: error.code,
        data: error.data,
      });

      // Check if this is a "request not found" error
      if (
        error.reason === "request not found" ||
        error.message.includes("request not found")
      ) {
        console.log(
          "🚨 [CONTRACT] VRF request not found - checking game contract integration"
        );

        // Let's try to check if the game contract has the VRF request ID
        try {
          // Use the original requestId parameter that's already in scope
          const gameRequest = await this.gameContract.getMergeRequest(
            BigInt(requestId)
          );
          console.log("🔍 [CONTRACT] Game contract merge request:", {
            player: gameRequest.player,
            entity1Name: gameRequest.entity1Name,
            entity2Name: gameRequest.entity2Name,
            fulfilled: gameRequest.fulfilled,
            timestamp: gameRequest.timestamp,
          });

          // Check if the game contract is properly connected to VRF
          const vrfConsumerAddress = await this.gameContract.getVRFConsumer();
          console.log(
            "🔗 [CONTRACT] VRF Consumer address from game contract:",
            vrfConsumerAddress
          );
          console.log(
            "🔗 [CONTRACT] Our VRF contract address:",
            this.vrfContract.target
          );

          if (
            vrfConsumerAddress.toLowerCase() !==
            this.vrfContract.target.toString().toLowerCase()
          ) {
            console.log(
              "🚨 [CONTRACT] VRF ADDRESS MISMATCH! Game contract is using different VRF consumer"
            );
          }
        } catch (gameError) {
          console.error(
            "❌ [CONTRACT] Error checking game contract:",
            gameError
          );
        }
      }

      return 0; // Return 0 to indicate VRF not ready
    }
  }
}

// Frontend contract service (existing code with fixes)
export class ContractService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;
  private gameContract: ethers.Contract | null = null;
  private nftContract: ethers.Contract | null = null;
  private vrfContract: ethers.Contract | null = null;
  private initialized: boolean = false;

  async initialize() {
    if (typeof window !== "undefined" && window.ethereum && !this.initialized) {
      try {
        this.provider = new ethers.BrowserProvider(window.ethereum);
        this.signer = await this.provider.getSigner();

        this.gameContract = new ethers.Contract(
          CONTRACT_ADDRESSES.gameContract,
          GAME_CONTRACT_ABI,
          this.signer
        );

        this.nftContract = new ethers.Contract(
          CONTRACT_ADDRESSES.nftContract,
          NFT_CONTRACT_ABI,
          this.signer
        );

        this.vrfContract = new ethers.Contract(
          CONTRACT_ADDRESSES.vrfConsumer,
          VRF_CONTRACT_ABI,
          this.provider
        );

        this.initialized = true;
        console.log("Contracts initialized successfully");
      } catch (error) {
        console.error("Failed to initialize contracts:", error);
        throw error;
      }
    }
  }

  isInitialized(): boolean {
    return (
      this.initialized &&
      this.gameContract !== null &&
      this.nftContract !== null &&
      this.vrfContract !== null
    );
  }

  async connectWallet(): Promise<string | null> {
    if (!window.ethereum) {
      throw new Error("MetaMask not installed");
    }

    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      await this.initialize();

      const address = await this.signer?.getAddress();
      return address || null;
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      throw error;
    }
  }

  // Get all starter entities
  async getStarterEntities(): Promise<string[]> {
    if (!this.isInitialized()) {
      throw new Error(
        "Contracts not initialized. Please connect your wallet first."
      );
    }
    try {
      const starterEntities = await this.gameContract!.getStarterEntities();
      return starterEntities;
    } catch (error) {
      console.error("Error fetching starter entities:", error);
      // Fallback to hardcoded list
      return [
        "Fire",
        "Water",
        "Earth",
        "Air",
        "Light",
        "Shadow",
        "Metal",
        "Crystal",
        "Lightning",
        "Ice",
        "Plant",
        "Beast",
        "Aquatic",
        "Avian",
        "Insect",
        "Stellar",
        "Lunar",
        "Solar",
        "Void",
        "Nebula",
        "Forest",
        "Desert",
        "Ocean",
        "Mountain",
        "Swamp",
        "Wolf",
        "Tiger",
        "Eagle",
        "Bear",
        "Fox",
        "Oak",
        "Rose",
        "Cactus",
        "Lotus",
        "Fern",
      ];
    }
  }

  // Get player entities - now returns both virtual starters and real hybrid NFTs
  async getPlayerEntities(address: string) {
    if (!this.isInitialized()) {
      throw new Error(
        "Contracts not initialized. Please connect your wallet first."
      );
    }

    // Get actual NFTs owned by the player
    const tokenIds = await this.nftContract!.getTokensByOwner(address);
    const hybridEntities = [];

    for (const tokenId of tokenIds) {
      const entity = await this.nftContract!.getEntity(tokenId);

      // Fetch metadata and extract image URL following NFT standard
      const metadata = await fetchEntityMetadata(String(entity.metadataURI));

      hybridEntities.push({
        tokenId: Number(entity.tokenId),
        name: String(entity.name),
        rarity: Number(entity.rarity),
        imageURI: metadata.imageURI, // Now properly extracted from metadata JSON
        parent1: String(entity.parent1),
        parent2: String(entity.parent2),
        createdAt: Number(entity.createdAt),
        isStarter: false, // All minted NFTs are hybrids
        description:
          metadata.description ||
          `A ${entity.rarity}-star hybrid created from ${entity.parent1} and ${entity.parent2}`,
        metadataURI: String(entity.metadataURI), // Store the actual metadataURI
      });
    }

    // Get starter entities and create virtual entities
    const starterNames = await this.getStarterEntities();
    const starterEntities = starterNames.map((name, index) => ({
      tokenId: 0, // Virtual starter entities have tokenId 0
      name,
      rarity: 1,
      imageURI: "", // Starter entities don't have images stored on-chain
      parent1: "",
      parent2: "",
      createdAt: Date.now(),
      isStarter: true,
      description: `A starter entity: ${name}`,
      metadataURI: "",
    }));

    // Return both starter and hybrid entities
    return [...starterEntities, ...hybridEntities];
  }

  // Updated request merge for new contract signature
  async requestMerge(
    entity1Name: string,
    entity2Name: string,
    entity1IsStarter: boolean,
    entity2IsStarter: boolean,
    entity1TokenId: number,
    entity2TokenId: number
  ) {
    console.log("🔗 [CONTRACT] Starting blockchain merge request");
    console.log("📋 [CONTRACT] Contract parameters:", {
      entity1Name,
      entity2Name,
      entity1IsStarter,
      entity2IsStarter,
      entity1TokenId,
      entity2TokenId,
    });

    if (!this.isInitialized()) {
      console.log("❌ [CONTRACT] Contract not initialized");
      throw new Error(
        "Contracts not initialized. Please connect your wallet first."
      );
    }

    // Include the required payment of 0.0001 ETH
    const paymentAmount = ethers.parseEther("0.0001");
    console.log(
      "💰 [CONTRACT] Payment amount:",
      ethers.formatEther(paymentAmount),
      "ETH"
    );

    try {
      console.log("📝 [CONTRACT] Calling gameContract.requestMerge...");
      const tx = await this.gameContract!.requestMerge(
        entity1Name,
        entity2Name,
        entity1IsStarter,
        entity2IsStarter,
        entity1TokenId,
        entity2TokenId,
        { value: paymentAmount } // Add the payment here
      );

      console.log("⏳ [CONTRACT] Transaction submitted:", {
        hash: tx.hash,
        gasLimit: tx.gasLimit?.toString(),
        gasPrice: tx.gasPrice?.toString(),
        value: ethers.formatEther(tx.value || 0),
      });

      console.log("⏳ [CONTRACT] Waiting for transaction confirmation...");
      const receipt = await tx.wait();

      console.log("✅ [CONTRACT] Transaction confirmed:", {
        hash: receipt.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status,
        gasUsed: receipt.gasUsed?.toString(),
        effectiveGasPrice: receipt.effectiveGasPrice?.toString(),
      });

      return {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status,
      };
    } catch (error: any) {
      console.error("❌ [CONTRACT] Blockchain transaction failed:", error);
      console.log("🔍 [CONTRACT] Error details:", {
        message: error.message,
        code: error.code,
        data: error.data,
        reason: error.reason,
        method: error.method,
        transaction: error.transaction,
      });
      throw error;
    }
  }

  async completeMerge(
    requestId: number | string | bigint,
    newEntityName: string,
    metadataURI: string
  ) {
    if (!this.isInitialized()) {
      throw new Error(
        "Contracts not initialized. Please connect your wallet first."
      );
    }
    try {
      // Convert to BigInt to handle large numbers properly and avoid overflow
      const requestIdBigInt = BigInt(requestId);
      // Updated to match actual contract signature
      const tx = await this.gameContract!.completeMerge(
        requestIdBigInt,
        newEntityName,
        metadataURI
      );
      const receipt = await tx.wait();

      // Parse the MergeCompleted event
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = this.gameContract!.interface.parseLog(log);
          return parsed?.name === "MergeCompleted";
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = this.gameContract!.interface.parseLog(event);
        return {
          newEntityId: Number(parsed?.args?.newEntityId),
          player: String(parsed?.args?.player),
          rarity: Number(parsed?.args?.rarity),
          requestId: Number(parsed?.args?.requestId),
          transactionHash: receipt.hash,
        };
      }

      return { transactionHash: receipt.hash };
    } catch (error: any) {
      console.error("Error completing merge:", error);

      // Handle specific smart contract errors more gracefully
      if (
        error?.reason === "Request already fulfilled" ||
        error?.message?.includes("Request already fulfilled")
      ) {
        throw new Error("Request already fulfilled");
      }

      // For other errors, provide more context
      if (error?.reason) {
        throw new Error(`Smart contract error: ${error.reason}`);
      }

      throw error;
    }
  }

  async getMergeRequest(requestId: number | string | bigint) {
    if (!this.isInitialized()) {
      throw new Error(
        "Contracts not initialized. Please connect your wallet first."
      );
    }
    // Convert to BigInt to handle large numbers properly and avoid overflow
    const requestIdBigInt = BigInt(requestId);
    const result = await this.gameContract!.getMergeRequest(requestIdBigInt);
    return {
      player: String(result.player),
      entity1Name: String(result.entity1Name),
      entity2Name: String(result.entity2Name),
      entity1IsStarter: Boolean(result.entity1IsStarter),
      entity2IsStarter: Boolean(result.entity2IsStarter),
      entity1TokenId: Number(result.entity1TokenId),
      entity2TokenId: Number(result.entity2TokenId),
      requestId: Number(result.requestId),
      fulfilled: Boolean(result.fulfilled),
      timestamp: Number(result.timestamp),
    };
  }

  async canPlayerMerge(address: string): Promise<boolean> {
    if (!this.isInitialized()) {
      throw new Error(
        "Contracts not initialized. Please connect your wallet first."
      );
    }
    try {
      return await this.gameContract!.canPlayerMerge(address);
    } catch (error) {
      console.error("Error checking if player can merge:", error);
      return false;
    }
  }

  async getNFTContractAddress(): Promise<string> {
    if (!this.isInitialized()) {
      throw new Error(
        "Contracts not initialized. Please connect your wallet first."
      );
    }
    try {
      return await this.gameContract!.getNFTContract();
    } catch (error) {
      console.error("Error getting NFT contract address:", error);
      return CONTRACT_ADDRESSES.nftContract;
    }
  }

  async getPendingRequests(address: string): Promise<number[]> {
    if (!this.isInitialized()) {
      throw new Error(
        "Contracts not initialized. Please connect your wallet first."
      );
    }
    try {
      const requests = await this.gameContract!.getPendingRequests(address);
      return requests.map((id: any) => Number(id));
    } catch (error) {
      console.error("Error fetching pending requests:", error);
      return [];
    }
  }

  async requestRandomness(): Promise<number> {
    if (!this.isInitialized()) {
      throw new Error(
        "Contracts not initialized. Please connect your wallet first."
      );
    }
    try {
      const tx = await this.vrfContract!.requestRandomWords(1);
      const receipt = await tx.wait();

      // Parse the RequestSent event
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = this.vrfContract!.interface.parseLog(log);
          return parsed?.name === "RequestSent";
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = this.vrfContract!.interface.parseLog(event);
        return Number(parsed?.args?.requestId);
      }

      throw new Error("RequestSent event not found");
    } catch (error) {
      console.error("Error requesting randomness:", error);
      throw error;
    }
  }

  async getRandomnessResult(
    requestId: number | string | bigint
  ): Promise<number> {
    if (!this.isInitialized()) {
      throw new Error(
        "Contracts not initialized. Please connect your wallet first."
      );
    }
    try {
      // Convert to BigInt to handle large numbers properly and avoid overflow
      const requestIdBigInt = BigInt(requestId);
      // Use getRequestStatus instead of getRandomnessResult
      const result = await this.vrfContract!.getRequestStatus(requestIdBigInt);

      // Check if the request is fulfilled and has randomness
      if (
        !result.fulfilled ||
        !result.randomWords ||
        result.randomWords.length === 0
      ) {
        return 0; // Return 0 to indicate VRF not yet fulfilled
      }

      // Return the first random word as the randomness value
      return Number(result.randomWords[0]);
    } catch (error) {
      console.error("Error getting randomness result:", error);
      return 0; // Return 0 to indicate VRF not ready
    }
  }

  async getRequestStatus(
    requestId: number
  ): Promise<{ fulfilled: boolean; randomWords: number[] }> {
    if (!this.isInitialized()) {
      throw new Error(
        "Contracts not initialized. Please connect your wallet first."
      );
    }
    try {
      const result = await this.vrfContract!.getRequestStatus(requestId);
      return {
        fulfilled: Boolean(result.fulfilled),
        randomWords: Array.from(result.randomWords).map((word) => Number(word)),
      };
    } catch (error) {
      console.error("Error getting request status:", error);
      throw error;
    }
  }
}

// Export backend service factory and contract service instance
export function createBackendContractService(): BackendContractService {
  return new BackendContractService();
}

export const contractService = new ContractService();
