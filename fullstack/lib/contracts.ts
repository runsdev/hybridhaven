import { ethers } from "ethers";
import { ContractAddresses } from "@/types/game";

// Complete Contract ABIs from the actual smart contracts
export const NFT_CONTRACT_ABI = [
  "function claimStarterEntity() external",
  "function claimStarterEntityFor(address to) external",
  "function getEntity(uint256 tokenId) external view returns (tuple(uint256 tokenId, string name, uint8 rarity, string imageURI, string parent1, string parent2, uint256 createdAt, bool isStarter))",
  "function getTokensByOwner(address owner) external view returns (uint256[])",
  "function hasStarterEntity(address user) external view returns (bool)",
  "function ownerOf(uint256 tokenId) external view returns (address)",
  "function balanceOf(address owner) external view returns (uint256)",
  "function mintHybridEntity(address to, string name, uint8 rarity, string imageURI, string parent1, string parent2) external returns (uint256)",
  "function updateEntityImage(uint256 tokenId, string imageURI) external",
  "event EntityMinted(address indexed to, uint256 indexed tokenId, string name, uint8 rarity)",
  "event StarterEntityClaimed(address indexed user, uint256 indexed tokenId, string name)",
];

export const GAME_CONTRACT_ABI = [
  "function requestMerge(uint256 entity1Id, uint256 entity2Id) external",
  "function completeMerge(uint256 requestId, string newEntityName, string imageURI) external",
  "function getMergeRequest(uint256 requestId) external view returns (tuple(address player, uint256 entity1Id, uint256 entity2Id, uint256 requestId, bool fulfilled, uint256 timestamp))",
  "function getPendingRequests(address player) external view returns (uint256[])",
  "function canPlayerMerge(address player) external view returns (bool)",
  "function timeUntilNextMerge(address player) external view returns (uint256)",
  "function mergeCooldown() external view returns (uint256)",
  "function getNFTContract() external view returns (address)",
  "function getVRFConsumer() external view returns (address)",
  "function getBackendAddress() external view returns (address)",
  "function setBackendAddress(address _backendAddress) external",
  "function setNFTContract(address _nftContract) external",
  "function setVRFConsumer(address _vrfConsumer) external",
  "event MergeRequested(address indexed player, uint256 entity1Id, uint256 entity2Id, uint256 requestId)",
  "event MergeCompleted(address indexed player, uint256 newEntityId, uint8 rarity, uint256 requestId)",
];

export const VRF_CONTRACT_ABI = [
  "function requestRandomWords() external returns (uint256 requestId)",
  "function getRequestStatus(uint256 requestId) external view returns (bool fulfilled, uint256[] memory randomWords)",
  "function getRandomnessResult(uint256 requestId) external view returns (uint256)",
  "function lastRequestId() external view returns (uint256)",
  "function addAuthorizedCaller(address _caller) external",
  "function removeAuthorizedCaller(address _caller) external",
  "function setSubscriptionId(uint256 _subscriptionId) external",
  "function setKeyHash(bytes32 _keyHash) external",
  "function setVRFConfig(uint32 _callbackGasLimit, uint16 _requestConfirmations, uint32 _numWords) external",
  "function getConfig() external view returns (uint256 subscriptionId, bytes32 keyHashValue, uint32 gasLimit, uint16 confirmations, uint32 words)",
  "event RequestSent(uint256 requestId, uint32 numWords)",
  "event RequestFulfilled(uint256 requestId, uint256[] randomWords)",
];

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

  async getPlayerEntities(address: string) {
    try {
      const tokenIds = await this.nftContract.getTokensByOwner(address);
      const entities = [];

      for (const tokenId of tokenIds) {
        const entity = await this.nftContract.getEntity(tokenId);
        entities.push({
          tokenId: Number(entity.tokenId),
          name: String(entity.name),
          rarity: Number(entity.rarity),
          imageURI: String(entity.imageURI),
          parent1: String(entity.parent1),
          parent2: String(entity.parent2),
          createdAt: Number(entity.createdAt),
          isStarter: Boolean(entity.isStarter),
        });
      }

      return entities;
    } catch (error) {
      console.error("Error fetching player entities:", error);
      throw new Error("Failed to fetch player entities from blockchain");
    }
  }

  async hasStarterEntity(address: string): Promise<boolean> {
    try {
      const result = await this.nftContract.hasStarterEntity(address);
      return Boolean(result);
    } catch (error) {
      console.error("Error checking starter entity:", error);
      throw new Error("Failed to check starter entity status");
    }
  }

  async claimStarterEntity(playerAddress: string) {
    try {
      // Use the new claimStarterEntityFor function to mint to the specified address
      const tx = await this.nftContract.claimStarterEntityFor(playerAddress);
      const receipt = await tx.wait();

      // Serialize the receipt to avoid Set objects
      return serializeContractResponse({
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status,
      });
    } catch (error) {
      console.error("Error claiming starter entity:", error);
      throw new Error("Failed to claim starter entities");
    }
  }

  async canPlayerMerge(address: string): Promise<boolean> {
    try {
      const result = await this.gameContract.canPlayerMerge(address);
      return Boolean(result);
    } catch (error) {
      console.error("Error checking merge eligibility:", error);
      return false;
    }
  }

  async getPendingRequests(address: string) {
    try {
      const result = await this.gameContract.getPendingRequests(address);
      return Array.from(result).map((id) => Number(id));
    } catch (error) {
      console.error("Error fetching pending requests:", error);
      return [];
    }
  }

  async requestMerge(entity1Id: number, entity2Id: number) {
    try {
      const tx = await this.gameContract.requestMerge(entity1Id, entity2Id);
      const receipt = await tx.wait();

      // Parse the MergeRequested event to get the request ID
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = this.gameContract.interface.parseLog(log);
          return parsed?.name === "MergeRequested";
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = this.gameContract.interface.parseLog(event);
        return {
          requestId: Number(parsed?.args?.requestId),
          player: String(parsed?.args?.player),
          entity1Id: Number(parsed?.args?.entity1Id),
          entity2Id: Number(parsed?.args?.entity2Id),
          transactionHash: receipt.hash,
        };
      }

      throw new Error("MergeRequested event not found in transaction");
    } catch (error) {
      console.error("Error requesting merge:", error);
      throw error;
    }
  }

  async completeMerge(
    requestId: number,
    newEntityName: string,
    imageURI: string
  ) {
    try {
      // Updated to match actual contract signature
      const tx = await this.gameContract.completeMerge(
        requestId,
        newEntityName,
        imageURI
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

  async getMergeRequest(requestId: number) {
    try {
      const result = await this.gameContract.getMergeRequest(requestId);
      return {
        player: String(result.player),
        entity1Id: Number(result.entity1Id),
        entity2Id: Number(result.entity2Id),
        requestId: Number(result.requestId),
        fulfilled: Boolean(result.fulfilled),
        timestamp: Number(result.timestamp),
      };
    } catch (error) {
      console.error("Error fetching merge request:", error);
      throw error;
    }
  }

  async requestRandomness(): Promise<number> {
    try {
      const tx = await this.vrfContract.requestRandomWords(1);
      const receipt = await tx.wait();

      // Parse the RequestSent event
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = this.vrfContract.interface.parseLog(log);
          return parsed?.name === "RequestSent";
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = this.vrfContract.interface.parseLog(event);
        return Number(parsed?.args?.requestId);
      }

      throw new Error("RequestSent event not found");
    } catch (error) {
      console.error("Error requesting randomness:", error);
      throw error;
    }
  }

  async getRandomnessResult(requestId: number): Promise<number> {
    try {
      // Use the specific method from ChainlinkVRFConsumer
      const result = await this.vrfContract.getRandomnessResult(requestId);
      return Number(result);
    } catch (error) {
      console.error("Error getting randomness result:", error);
      throw error;
    }
  }

  async getRequestStatus(
    requestId: number
  ): Promise<{ fulfilled: boolean; randomWords: number[] }> {
    try {
      const result = await this.vrfContract.getRequestStatus(requestId);
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

  async getPlayerEntities(address: string) {
    if (!this.isInitialized()) {
      throw new Error(
        "Contracts not initialized. Please connect your wallet first."
      );
    }

    const tokenIds = await this.nftContract!.getTokensByOwner(address);
    const entities = [];

    for (const tokenId of tokenIds) {
      const entity = await this.nftContract!.getEntity(tokenId);
      entities.push({
        tokenId: Number(entity.tokenId),
        name: String(entity.name),
        rarity: Number(entity.rarity),
        imageURI: String(entity.imageURI),
        parent1: String(entity.parent1),
        parent2: String(entity.parent2),
        createdAt: Number(entity.createdAt),
        isStarter: Boolean(entity.isStarter),
      });
    }

    return entities;
  }

  async hasStarterEntity(address: string): Promise<boolean> {
    if (!this.isInitialized()) {
      throw new Error(
        "Contracts not initialized. Please connect your wallet first."
      );
    }
    const result = await this.nftContract!.hasStarterEntity(address);
    return Boolean(result);
  }

  async claimStarterEntity() {
    if (!this.isInitialized()) {
      throw new Error(
        "Contracts not initialized. Please connect your wallet first."
      );
    }
    // Updated to match actual contract behavior - claims ALL starter entities
    const tx = await this.nftContract!.claimStarterEntity();
    const receipt = await tx.wait();
    return {
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      status: receipt.status,
    };
  }

  async requestMerge(entity1Id: number, entity2Id: number) {
    if (!this.isInitialized()) {
      throw new Error(
        "Contracts not initialized. Please connect your wallet first."
      );
    }
    const tx = await this.gameContract!.requestMerge(entity1Id, entity2Id);
    const receipt = await tx.wait();
    return {
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      status: receipt.status,
    };
  }

  async canPlayerMerge(address: string): Promise<boolean> {
    if (!this.isInitialized()) {
      throw new Error(
        "Contracts not initialized. Please connect your wallet first."
      );
    }
    const result = await this.gameContract!.canPlayerMerge(address);
    return Boolean(result);
  }

  async getPendingRequests(address: string) {
    if (!this.isInitialized()) {
      throw new Error(
        "Contracts not initialized. Please connect your wallet first."
      );
    }
    const result = await this.gameContract!.getPendingRequests(address);
    return Array.from(result).map((id) => Number(id));
  }

  async getMergeRequest(requestId: number) {
    if (!this.isInitialized()) {
      throw new Error(
        "Contracts not initialized. Please connect your wallet first."
      );
    }
    const result = await this.gameContract!.getMergeRequest(requestId);
    return {
      player: String(result.player),
      entity1Id: Number(result.entity1Id),
      entity2Id: Number(result.entity2Id),
      requestId: Number(result.requestId),
      fulfilled: Boolean(result.fulfilled),
      timestamp: Number(result.timestamp),
    };
  }

  async getNFTContractAddress(): Promise<string> {
    return CONTRACT_ADDRESSES.nftContract;
  }
}

export const contractService = new ContractService();

// Export backend service factory
export function createBackendContractService(): BackendContractService {
  return new BackendContractService();
}
