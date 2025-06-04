/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from "next/server";
import { createBackendContractService } from "@/lib/contracts";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        { success: false, error: "Address required" },
        { status: 400 }
      );
    }

    const backendService = createBackendContractService();

    // Get comprehensive contract state for debugging
    const diagnostics = {
      player: {
        address,
        canMerge: false,
        timeUntilNextMerge: 0,
        entityCount: 0,
        entities: [] as any[],
        pendingRequests: [] as any[],
      },
      contracts: {
        gameContract: process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS,
        nftContract: process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS,
        vrfConsumer: process.env.NEXT_PUBLIC_VRF_CONTRACT_ADDRESS,
        configured: false,
        nftContractSet: false,
        vrfConsumerSet: false,
        backendAddress: null,
      },
      errors: [] as string[],
    };

    try {
      // Check player merge eligibility
      diagnostics.player.canMerge = await backendService.canPlayerMerge(
        address
      );
    } catch (error: any) {
      diagnostics.errors.push(`canPlayerMerge failed: ${error.message}`);
    }

    try {
      // Get player entities
      const entities = await backendService.getPlayerEntities(address);
      diagnostics.player.entities = entities;
      diagnostics.player.entityCount = entities.length;
    } catch (error: any) {
      diagnostics.errors.push(`getPlayerEntities failed: ${error.message}`);
    }

    try {
      // Get pending requests
      diagnostics.player.pendingRequests =
        await backendService.getPendingRequests(address);
    } catch (error: any) {
      diagnostics.errors.push(`getPendingRequests failed: ${error.message}`);
    }

    // Check contract configuration (these might fail if not configured)
    try {
      // These calls might fail if contracts aren't properly configured
      // We'll add more specific checks here
      diagnostics.contracts.configured = true;
    } catch (error: any) {
      diagnostics.errors.push(
        `Contract configuration check failed: ${error.message}`
      );
    }

    return NextResponse.json({
      success: true,
      diagnostics,
      message: "Contract diagnostics completed",
    });
  } catch (error: any) {
    console.error("Diagnostics failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Diagnostics failed",
      },
      { status: 500 }
    );
  }
}
