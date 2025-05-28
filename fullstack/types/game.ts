// Game entity structure
export interface Entity {
  tokenId: number;
  name: string;
  description: string;
  rarity: number;
  imageURI: string;
  metadataURI: string;
  parent1: string;
  parent2: string;
  createdAt: number;
  isStarter: boolean;
}

// Game state interface
export interface GameState {
  connected: boolean;
  address: string | null;
  entities: Entity[];
  pendingRequests: number[];
  loading: boolean;
  error: string | null;
}

// API Response interfaces
export interface MergeResponse {
  success: boolean;
  message?: string;
  newEntityId?: number;
  name?: string;
  rarity?: number;
  imageURI?: string;
  metadata?: any;
  entities?: {
    entity1: { id: number; name: string };
    entity2: { id: number; name: string };
  };
  error?: string;
}

export interface StarterEntityResponse {
  success: boolean;
  message?: string;
  totalEntities?: number;
  entities?: Entity[];
  error?: string;
}

export interface EntitiesResponse {
  success: boolean;
  entities?: Entity[];
  pendingRequests?: number[];
  canMerge?: boolean;
  error?: string;
}

// Contract addresses interface
export interface ContractAddresses {
  gameContract: string;
  nftContract: string;
  vrfConsumer: string;
}

// Merge request structure (from smart contract)
export interface MergeRequest {
  player: string;
  entity1Id: number;
  entity2Id: number;
  requestId: number;
  fulfilled: boolean;
  timestamp: number;
}

// VRF request result
export interface VRFResult {
  fulfilled: boolean;
  randomWords: bigint[];
}

// Transaction result interface
export interface TransactionResult {
  transactionHash: string;
  blockNumber?: number;
  status?: number;
}
