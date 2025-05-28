import { NextRequest, NextResponse } from "next/server";
import { createBackendContractService } from "@/lib/contracts";
import { generateAndUploadHybridImage } from "@/lib/ipfs";
import { calculateRarity } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const { address, entity1Id, entity2Id } = await request.json();

    if (!address || !entity1Id || !entity2Id) {
      return NextResponse.json(
        {
          success: false,
          error: "Address and entity IDs required",
        },
        { status: 400 }
      );
    }

    const backendService = createBackendContractService();

    // Check if player can merge
    const canMerge = await backendService.canPlayerMerge(address);
    if (!canMerge) {
      return NextResponse.json(
        {
          success: false,
          error: "Merge cooldown active or insufficient entities",
        },
        { status: 400 }
      );
    }

    // Get entity details to validate ownership and get names
    const entities = await backendService.getPlayerEntities(address);
    const entity1 = entities.find((e) => e.tokenId === entity1Id);
    const entity2 = entities.find((e) => e.tokenId === entity2Id);

    if (!entity1 || !entity2) {
      return NextResponse.json(
        {
          success: false,
          error: "One or both entities not found or not owned by player",
        },
        { status: 400 }
      );
    }

    // Note: The actual merge request should be initiated by the player's wallet on the frontend
    // This backend endpoint is for processing the completion after VRF fulfillment
    // For now, we'll return instructions for the frontend to handle the transaction

    return NextResponse.json({
      success: true,
      message:
        "Please initiate the merge transaction from your wallet. The backend will process the completion once randomness is fulfilled.",
      entities: {
        entity1: { id: entity1Id, name: entity1.name },
        entity2: { id: entity2Id, name: entity2.name },
      },
    });
  } catch (error: any) {
    console.error("Error preparing merge:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to prepare merge",
      },
      { status: 500 }
    );
  }
}

// Handle merge completion after VRF fulfillment (called by backend monitoring)
export async function PUT(request: NextRequest) {
  try {
    const { requestId, entity1Name, entity2Name, forceRarity } =
      await request.json();

    if (!requestId || !entity1Name || !entity2Name) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required parameters",
        },
        { status: 400 }
      );
    }

    const backendService = createBackendContractService();

    // Get the merge request details
    const mergeRequest = await backendService.getMergeRequest(requestId);
    if (!mergeRequest.player || mergeRequest.fulfilled) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or already fulfilled merge request",
        },
        { status: 400 }
      );
    }

    // Check if VRF has been fulfilled by getting randomness result
    let randomness: number;
    try {
      randomness = await backendService.getRandomnessResult(requestId);
      if (randomness === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "VRF randomness not yet fulfilled",
          },
          { status: 400 }
        );
      }
    } catch (error) {
      // If we can't get VRF result, use provided rarity or generate random one for testing
      console.warn("Could not get VRF result, using fallback rarity:", error);
      randomness = forceRarity
        ? forceRarity * 1000
        : Math.floor(Math.random() * 10000) + 1;
    }

    // Calculate rarity from randomness (this is done in the smart contract, but we need it for AI generation)
    const rarity = calculateRarity(BigInt(randomness));

    // Generate AI image and upload to IPFS
    const { imageURI, metadata } = await generateAndUploadHybridImage(
      entity1Name,
      entity2Name,
      rarity
    );

    // Complete merge on blockchain - updated to match actual contract signature
    const completionResult = await backendService.completeMerge(
      requestId,
      metadata.name,
      imageURI
    );

    return NextResponse.json({
      success: true,
      newEntityId: completionResult.newEntityId,
      name: metadata.name,
      rarity: completionResult.rarity, // Get rarity from blockchain result
      imageURI,
      metadata,
    });
  } catch (error: any) {
    console.error("Error completing merge:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to complete merge",
      },
      { status: 500 }
    );
  }
}

// Finalize pending merge requests
export async function PATCH(request: NextRequest) {
  try {
    const { address, requestId } = await request.json();

    if (!address || !requestId) {
      return NextResponse.json(
        {
          success: false,
          error: "Address and request ID required",
        },
        { status: 400 }
      );
    }

    const backendService = createBackendContractService();

    // Get the merge request details first
    let mergeRequest;
    try {
      mergeRequest = await backendService.getMergeRequest(requestId);
    } catch (error) {
      console.error("Error fetching merge request:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Merge request not found or invalid",
        },
        { status: 400 }
      );
    }

    // Check if already fulfilled
    if (mergeRequest.fulfilled) {
      return NextResponse.json(
        {
          success: false,
          error: "This merge has already been completed",
        },
        { status: 400 }
      );
    }

    // Verify the request belongs to the player
    if (mergeRequest.player.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized: This merge request doesn't belong to you",
        },
        { status: 403 }
      );
    }

    // Get entity names for the merge - handle case where entities might be burned after merge request
    const entities = await backendService.getPlayerEntities(address);
    let entity1Name = "Unknown";
    let entity2Name = "Unknown";

    // Try to find the entities in current collection
    const entity1 = entities.find((e) => e.tokenId === mergeRequest.entity1Id);
    const entity2 = entities.find((e) => e.tokenId === mergeRequest.entity2Id);

    if (entity1) entity1Name = entity1.name;
    if (entity2) entity2Name = entity2.name;

    // If entities not found, they may have been burned after merge request
    // Use fallback names based on common patterns
    if (!entity1 || !entity2) {
      console.warn(
        `Entities ${mergeRequest.entity1Id}/${mergeRequest.entity2Id} not found in current collection, using fallback names`
      );

      // Try to get names from blockchain event logs or use generic names
      entity1Name = entity1?.name || `Entity${mergeRequest.entity1Id}`;
      entity2Name = entity2?.name || `Entity${mergeRequest.entity2Id}`;
    }

    // Check if VRF has been fulfilled
    let randomness: number;
    try {
      randomness = await backendService.getRandomnessResult(requestId);
      if (randomness === 0) {
        return NextResponse.json(
          {
            success: false,
            error:
              "VRF randomness not yet fulfilled. Please wait a bit longer.",
          },
          { status: 400 }
        );
      }
    } catch (error) {
      // If we can't get VRF result, generate a fallback for testing
      console.warn(
        "Could not get VRF result, using fallback randomness:",
        error
      );
      randomness = Math.floor(Math.random() * 10000) + 1;
    }

    // Calculate rarity from randomness
    const rarity = calculateRarity(BigInt(randomness));

    // Generate AI image and upload to IPFS
    console.log(`Generating hybrid image for: ${entity1Name} + ${entity2Name}`);
    const { imageURI, metadata } = await generateAndUploadHybridImage(
      entity1Name,
      entity2Name,
      rarity
    );

    // Complete merge on blockchain with better error handling
    let completionResult;
    try {
      completionResult = await backendService.completeMerge(
        requestId,
        metadata.name,
        imageURI
      );
    } catch (contractError: any) {
      console.error("Contract completion error:", contractError);

      // Check if the error indicates the merge is already complete
      if (
        contractError.message.includes("Request already fulfilled") ||
        contractError.message.includes("already fulfilled") ||
        contractError.reason === "Request already fulfilled"
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Request already fulfilled",
          },
          { status: 400 }
        );
      }

      // For transaction revert errors, provide more specific feedback
      if (contractError.code === "CALL_EXCEPTION") {
        return NextResponse.json(
          {
            success: false,
            error:
              contractError.reason ||
              "Smart contract execution failed. The merge request may have expired or already been processed.",
          },
          { status: 500 }
        );
      }

      throw contractError;
    }

    return NextResponse.json({
      success: true,
      message: "Merge finalized successfully!",
      newEntityId: completionResult.newEntityId,
      name: metadata.name,
      rarity: completionResult.rarity,
      imageURI,
      metadata,
    });
  } catch (error: any) {
    console.error("Error finalizing merge:", error);

    // Provide more specific error messages
    let errorMessage = "Failed to finalize merge";

    if (error.message.includes("VRF randomness not yet fulfilled")) {
      errorMessage =
        "Randomness generation is still in progress. Please wait a bit longer.";
    } else if (error.message.includes("already fulfilled")) {
      errorMessage = "This merge has already been completed.";
    } else if (error.message.includes("Failed to upload")) {
      errorMessage =
        "Failed to generate or upload hybrid image. Please try again.";
    } else if (error.code === "CALL_EXCEPTION") {
      errorMessage =
        "Smart contract execution failed. Please check the merge request status.";
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

// Background process to monitor and complete merges when VRF is fulfilled
async function processMergeCompletion(
  requestId: number,
  entity1Name: string,
  entity2Name: string,
  backendService: any
) {
  try {
    // Poll for VRF fulfillment (in production, use event listeners)
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes with 5-second intervals

    while (attempts < maxAttempts) {
      try {
        const randomness = await backendService.getRandomnessResult(requestId);

        if (randomness > 0) {
          // VRF fulfilled, complete the merge
          const rarity = calculateRarity(BigInt(randomness));

          // Generate AI image and upload to IPFS
          const { imageURI, metadata } = await generateAndUploadHybridImage(
            entity1Name,
            entity2Name,
            rarity
          );

          // Complete merge on blockchain
          const completionResult = await backendService.completeMerge(
            requestId,
            metadata.name,
            imageURI
          );

          console.log("Merge completed successfully:", {
            requestId,
            newEntityId: completionResult.newEntityId,
            name: metadata.name,
            rarity: completionResult.rarity,
            imageURI,
          });

          return;
        }
      } catch (vrfError) {
        // VRF not ready yet, continue polling
      }

      // Wait 5 seconds before next attempt
      await new Promise((resolve) => setTimeout(resolve, 5000));
      attempts++;
    }

    console.error("VRF request timed out for merge request:", requestId);
  } catch (error) {
    console.error("Error completing merge:", error);
  }
}
