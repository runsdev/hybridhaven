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

    return NextResponse.json({
      success: true,
      entities,
      pendingRequests,
      canMerge,
    });
  } catch (error: any) {
    console.error("Error fetching entities:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch entities",
      },
      { status: 500 }
    );
  }
}
