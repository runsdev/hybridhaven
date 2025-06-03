// Game entity structure - updated for virtual starter entities
export interface Entity {
  tokenId: number; // 0 for starter entities (virtual), actual ID for hybrid NFTs
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
  entities: Entity[]; // Now includes both virtual starters and real hybrid NFTs
  pendingRequests: bigint[];
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
    entity1: { name: string; isStarter: boolean };
    entity2: { name: string; isStarter: boolean };
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
  pendingRequests?: bigint[];
  canMerge?: boolean;
  error?: string;
}

// Contract addresses interface
export interface ContractAddresses {
  gameContract: string;
  nftContract: string;
  vrfConsumer: string;
}

// Updated merge request structure to match new contract
export interface MergeRequest {
  player: string;
  entity1Name: string;
  entity2Name: string;
  entity1IsStarter: boolean;
  entity2IsStarter: boolean;
  entity1TokenId: number;
  entity2TokenId: number;
  requestId: bigint;
  fulfilled: boolean;
  timestamp: number;
}

// VRF request result
export interface VRFResult {
  fulfilled: boolean;
  randomWords: bigint[];
}

// Hatch timer for VRF requests
export interface HatchTimer {
  requestId: bigint;
  entity1Name: string;
  entity2Name: string;
  startTime: number;
  endTime: number;
  duration: number;
  progress: number; // 0 to 1
  stage: "waiting" | "incubating" | "almost_ready" | "hatched";
}

// Transaction result interface
export interface TransactionResult {
  transactionHash: string;
  blockNumber?: number;
  status?: number;
}
