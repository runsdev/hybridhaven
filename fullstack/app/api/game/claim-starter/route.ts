import { NextRequest, NextResponse } from "next/server";
import { createBackendContractService } from "@/lib/contracts";

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();

    if (!address) {
      return NextResponse.json(
        { success: false, error: "Address required" },
        { status: 400 }
      );
    }

    const backendService = createBackendContractService();

    // Check if user already has a starter entity
    const hasStarter = await backendService.hasStarterEntity(address);
    if (hasStarter) {
      return NextResponse.json(
        {
          success: false,
          error: "You have already claimed your starter collection",
        },
        { status: 400 }
      );
    }

    // Claim complete starter collection (35 entities)
    const receipt = await backendService.claimStarterEntity(address);

    // Get all new entities (should be 35 starter entities)
    const entities = await backendService.getPlayerEntities(address);
    const starterEntities = entities.filter((entity) => entity.isStarter);

    return NextResponse.json({
      success: true,
      message: `Successfully claimed ${starterEntities.length} starter entities`,
      totalEntities: starterEntities.length,
      entities: starterEntities,
    });
  } catch (error: any) {
    console.error("Error claiming starter collection:", error);

    // Better error handling for specific contract errors
    let errorMessage = "Failed to claim starter collection";

    if (error.message.includes("Already claimed starter entities")) {
      errorMessage = "You have already claimed your starter collection";
    } else if (error.message.includes("execution reverted")) {
      errorMessage =
        "Transaction failed. You may have already claimed your starter entities";
    } else if (error.message.includes("user rejected")) {
      errorMessage = "Transaction was cancelled by user";
    } else if (error.message.includes("insufficient funds")) {
      errorMessage = "Insufficient ETH for gas fees";
    }

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
