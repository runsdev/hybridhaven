import { ExternalProvider } from "@ethersproject/providers";

declare global {
  interface Window {
    ethereum?: ExternalProvider & {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, handler: (...args: any[]) => void) => void;
      removeListener: (
        event: string,
        handler: (...args: any[]) => void
      ) => void;
      selectedAddress?: string;
      chainId?: string;
    };
  }
}

declare namespace NodeJS {
  interface ProcessEnv {
    // Public environment variables (accessible in frontend)
    NEXT_PUBLIC_GAME_CONTRACT_ADDRESS: string;
    NEXT_PUBLIC_NFT_CONTRACT_ADDRESS: string;
    NEXT_PUBLIC_VRF_CONTRACT_ADDRESS: string;
    NEXT_PUBLIC_RPC_URL: string;

    // Server-side only environment variables
    GOOGLE_AI_API_KEY: string;
    PINATA_API_KEY: string;
    PINATA_SECRET_API_KEY: string;
    BACKEND_PRIVATE_KEY: string;
  }
}

export {};
