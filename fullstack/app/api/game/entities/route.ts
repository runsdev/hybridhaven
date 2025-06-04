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

    const entities = await backendService.getPlayerEntities(address);

    const pendingRequests = await backendService.getPendingRequests(address);

    const canMerge = await backendService.canPlayerMerge(address);

    const responseData = {
      success: true,
      entities,
      pendingRequests: pendingRequests.map((id) => id.toString()), // Convert BigInt to string for JSON
      canMerge,
    };

    return NextResponse.json(responseData);
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch entities",
      },
      { status: 500 }
    );
  }
}
