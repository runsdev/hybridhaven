/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from "next/server";
import { createBackendContractService } from "@/lib/contracts";

export async function GET(request: NextRequest) {
  console.log(
    "🌐 [API] GET /api/game/entities - Player entities request received"
  );

  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    console.log("📥 [API] Request parameters:", {
      address: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null,
      hasAddress: !!address,
    });

    if (!address) {
      console.log("❌ [API] Missing address parameter");
      return NextResponse.json(
        { success: false, error: "Address required" },
        { status: 400 }
      );
    }

    console.log("🔗 [API] Creating backend service...");
    const backendService = createBackendContractService();

    console.log("📋 [API] Fetching player entities...");
    const entities = await backendService.getPlayerEntities(address);
    console.log("📊 [API] Player entities loaded:", {
      total: entities.length,
      starters: entities.filter((e) => e.isStarter).length,
      hybrids: entities.filter((e) => !e.isStarter).length,
      starterNames: entities
        .filter((e) => e.isStarter)
        .map((e) => e.name)
        .slice(0, 5),
      hybridNames: entities.filter((e) => !e.isStarter).map((e) => e.name),
    });

    console.log("🔍 [API] Fetching pending requests...");
    const pendingRequests = await backendService.getPendingRequests(address);
    console.log("📋 [API] Pending requests:", {
      count: pendingRequests.length,
      requestIds: pendingRequests,
    });

    console.log("⏰ [API] Checking merge cooldown...");
    const canMerge = await backendService.canPlayerMerge(address);
    console.log("🔍 [API] Merge cooldown status:", { canMerge });

    const responseData = {
      success: true,
      entities,
      pendingRequests: pendingRequests.map((id) => id.toString()), // Convert BigInt to string for JSON
      canMerge,
    };

    console.log("✅ [API] Entities response prepared:", {
      success: true,
      entitiesCount: entities.length,
      pendingRequestsCount: pendingRequests.length,
      canMerge,
    });

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error("❌ [API] Error fetching entities:", error);
    console.log("🔍 [API] Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch entities",
      },
      { status: 500 }
    );
  }
}
