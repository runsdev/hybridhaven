/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from "next/server";
import { createBackendContractService } from "@/lib/contracts";
import { generateAndUploadHybridImage } from "@/lib/ipfs";
import { calculateRarity } from "@/lib/utils";

export async function POST(request: NextRequest) {
  console.log(
    "🌐 [API] POST /api/game/merge - Merge preparation request received"
  );

  try {
    const body = await request.json();
    console.log("📥 [API] Request body:", {
      hasAddress: !!body.address,
      hasEntity1: !!body.entity1,
      hasEntity2: !!body.entity2,
      entity1Name: body.entity1?.name,
      entity2Name: body.entity2?.name,
      entity1IsStarter: body.entity1?.isStarter,
      entity2IsStarter: body.entity2?.isStarter,
    });

    const { address, entity1, entity2 } = body;

    if (!address || !entity1 || !entity2) {
      console.log("❌ [API] Missing required fields:", {
        hasAddress: !!address,
        hasEntity1: !!entity1,
        hasEntity2: !!entity2,
      });
      return NextResponse.json(
        {
          success: false,
          error: "Address and entities required",
        },
        { status: 400 }
      );
    }

    // Validate entity structure
    if (
      !entity1.name ||
      !entity2.name ||
      typeof entity1.isStarter !== "boolean" ||
      typeof entity2.isStarter !== "boolean"
    ) {
      console.log("❌ [API] Invalid entity structure:", {
        entity1Name: entity1.name,
        entity2Name: entity2.name,
        entity1IsStarter: typeof entity1.isStarter,
        entity2IsStarter: typeof entity2.isStarter,
      });
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid entity structure. Each entity must have name and isStarter properties",
        },
        { status: 400 }
      );
    }

    console.log("✅ [API] Entity structure validation passed");

    const backendService = createBackendContractService();

    // Check if player can merge
    console.log("⏰ [API] Checking merge cooldown...");
    const canMerge = await backendService.canPlayerMerge(address);
    console.log("🔍 [API] Cooldown check result:", { canMerge });

    if (!canMerge) {
      console.log("❌ [API] Merge cooldown active");
      return NextResponse.json(
        {
          success: false,
          error: "Merge cooldown active",
        },
        { status: 400 }
      );
    }

    // Get player entities to validate ownership for hybrid entities
    console.log("📋 [API] Fetching player entities for validation...");
    const entities = await backendService.getPlayerEntities(address);
    console.log("📊 [API] Player entities count:", {
      total: entities.length,
      starters: entities.filter((e) => e.isStarter).length,
      hybrids: entities.filter((e) => !e.isStarter).length,
    });

    // Validate entity ownership and get token IDs for hybrid entities
    let entity1TokenId = 0; // Default for starter entities
    let entity2TokenId = 0; // Default for starter entities

    console.log("🔍 [API] Validating entity ownership...");

    if (!entity1.isStarter) {
      console.log("🔍 [API] Validating hybrid entity 1 ownership...");
      const foundEntity1 = entities.find(
        (e) => !e.isStarter && e.name === entity1.name
      );
      if (!foundEntity1) {
        console.log("❌ [API] Entity 1 not found:", {
          searchName: entity1.name,
          availableHybrids: entities
            .filter((e) => !e.isStarter)
            .map((e) => e.name),
        });
        return NextResponse.json(
          {
            success: false,
            error: "Entity 1 not found or not owned by player",
          },
          { status: 400 }
        );
      }
      entity1TokenId = foundEntity1.tokenId;
      console.log("✅ [API] Entity 1 ownership validated:", {
        name: foundEntity1.name,
        tokenId: entity1TokenId,
      });
    }

    if (!entity2.isStarter) {
      console.log("🔍 [API] Validating hybrid entity 2 ownership...");
      const foundEntity2 = entities.find(
        (e) => !e.isStarter && e.name === entity2.name
      );
      if (!foundEntity2) {
        console.log("❌ [API] Entity 2 not found:", {
          searchName: entity2.name,
          availableHybrids: entities
            .filter((e) => !e.isStarter)
            .map((e) => e.name),
        });
        return NextResponse.json(
          {
            success: false,
            error: "Entity 2 not found or not owned by player",
          },
          { status: 400 }
        );
      }
      entity2TokenId = foundEntity2.tokenId;
      console.log("✅ [API] Entity 2 ownership validated:", {
        name: foundEntity2.name,
        tokenId: entity2TokenId,
      });
    }

    const responseData = {
      success: true,
      message:
        "Please initiate the merge transaction from your wallet. The backend will process the completion once randomness is fulfilled.",
      entities: {
        entity1: {
          name: entity1.name,
          isStarter: entity1.isStarter,
          tokenId: entity1TokenId,
        },
        entity2: {
          name: entity2.name,
          isStarter: entity2.isStarter,
          tokenId: entity2TokenId,
        },
      },
    };

    console.log("✅ [API] Merge preparation successful:", responseData);
    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error("❌ [API] Error preparing merge:", error);
    console.log("🔍 [API] Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
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
    const { metadataURI, imageURI, metadata } =
      await generateAndUploadHybridImage(entity1Name, entity2Name, rarity);

    // Complete merge on blockchain - updated to use metadataURI
    const completionResult = await backendService.completeMerge(
      requestId,
      metadata.name,
      metadataURI // Pass metadata JSON URI to contract, not image URI
    );

    return NextResponse.json({
      success: true,
      newEntityId: completionResult.newEntityId,
      name: metadata.name,
      rarity: completionResult.rarity, // Get rarity from blockchain result
      imageURI, // Frontend can use this for direct display
      metadataURI, // Contract stores this
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
  console.log(
    "🌐 [API] PATCH /api/game/merge - Merge finalization request received"
  );

  try {
    const body = await request.json();
    const { address, requestId } = body;

    console.log("📥 [API] PATCH Request parameters:", {
      address: address ? `${address.slice(0, 6)}...${address.slice(-4)}` : null,
      requestId: requestId ? requestId.toString() : null,
      hasAddress: !!address,
      hasRequestId: !!requestId,
    });

    String(requestId); // Ensure requestId is a string for validation

    if (!address || !requestId) {
      console.log("❌ [API] Missing required parameters");
      return NextResponse.json(
        {
          success: false,
          error: "Address and request ID required",
        },
        { status: 400 }
      );
    }

    console.log("🔗 [API] Creating backend contract service...");
    const backendService = createBackendContractService();

    // Convert requestId string back to bigint for contract calls
    const requestIdBigInt = BigInt(requestId);
    console.log("🔄 [API] Converted request ID:", {
      original: requestId,
      bigint: requestIdBigInt.toString(),
    });

    // Get the merge request details first
    console.log("📋 [API] Fetching merge request details...");
    let mergeRequest;
    try {
      mergeRequest = await backendService.getMergeRequest(requestIdBigInt);
      console.log(`📋 [API] Merge request ${requestId} details:`, {
        player: mergeRequest.player,
        requestingAddress: address,
        entity1Name: mergeRequest.entity1Name,
        entity2Name: mergeRequest.entity2Name,
        entity1IsStarter: mergeRequest.entity1IsStarter,
        entity2IsStarter: mergeRequest.entity2IsStarter,
        entity1TokenId: mergeRequest.entity1TokenId,
        entity2TokenId: mergeRequest.entity2TokenId,
        fulfilled: mergeRequest.fulfilled,
      });
    } catch (error) {
      console.error("Error fetching merge request:", error);
      return NextResponse.json(
        {
          success: false,
          error:
            "Failed to fetch merge request from blockchain. Please try again.",
        },
        { status: 500 }
      );
    }

    // Check if already fulfilled
    if (mergeRequest.fulfilled) {
      console.log("ℹ️ [API] Merge request already fulfilled");
      return NextResponse.json(
        {
          success: false,
          error: "This merge has already been completed",
        },
        { status: 400 }
      );
    }

    const entity1Name = mergeRequest.entity1Name;
    const entity2Name = mergeRequest.entity2Name;

    // Check if VRF has been fulfilled
    console.log("🎲 [API] Checking VRF randomness...");
    let randomness: number;
    try {
      console.log(
        `🔍 [API] Checking VRF result for request ID: ${requestIdBigInt}`
      );
      randomness = await backendService.getRandomnessResult(requestIdBigInt);
      console.log("🎲 [API] VRF randomness result:", { randomness });

      if (randomness === 0) {
        console.log("⏳ [API] VRF randomness not yet fulfilled");
        return NextResponse.json(
          {
            success: false,
            error:
              "VRF randomness not yet fulfilled. Please wait a bit longer.",
          },
          { status: 400 }
        );
      }
    } catch (error: any) {
      console.error("⚠️ [API] VRF randomness check failed:", error);
      console.log("🔍 [API] VRF error details:", {
        message: error.message,
        reason: error.reason,
        code: error.code,
      });

      if (
        error.reason === "request not found" ||
        error.message.includes("request not found")
      ) {
        console.log(
          "❌ [API] VRF request not found - this indicates the merge transaction failed"
        );
        return NextResponse.json(
          {
            success: false,
            error:
              "VRF request not found. The merge transaction may have failed. Please check the transaction status and try creating a new merge request.",
          },
          { status: 400 }
        );
      }

      // If we can't get VRF result, generate a fallback for testing
      console.warn(
        "⚠️ [API] Could not get VRF result, using fallback randomness:",
        error.message
      );
      randomness = Math.floor(Math.random() * 10000) + 1;
      console.log("🎲 [API] Using fallback randomness:", { randomness });
    }

    // Calculate rarity from randomness
    const rarity = calculateRarity(BigInt(randomness));
    console.log("⭐ [API] Calculated rarity:", { rarity, randomness });

    // Generate AI image and upload to IPFS
    console.log(
      `🧬 [API] Generating hybrid image for: ${entity1Name} + ${entity2Name} (${rarity}⭐)`
    );
    const { metadataURI, imageURI, metadata } =
      await generateAndUploadHybridImage(entity1Name, entity2Name, rarity);
    console.log("📸 [API] Image generated and uploaded:", {
      imageURI,
      metadataName: metadata.name,
    });

    // Complete merge on blockchain with better error handling
    console.log("🔗 [API] Completing merge on blockchain...");
    let completionResult;
    try {
      completionResult = await backendService.completeMerge(
        requestIdBigInt,
        metadata.name,
        metadataURI
      );
      console.log(
        "✅ [API] Blockchain merge completion successful:",
        completionResult
      );
    } catch (contractError: any) {
      console.error("❌ [API] Contract completion error:", contractError);
      console.log("🔍 [API] Contract error details:", {
        message: contractError.message,
        reason: contractError.reason,
        code: contractError.code,
        data: contractError.data,
      });

      // Check if the error indicates the merge is already complete
      if (
        contractError.message.includes("Request already fulfilled") ||
        contractError.message.includes("already fulfilled") ||
        contractError.reason === "Request already fulfilled"
      ) {
        console.log("ℹ️ [API] Merge already fulfilled");
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
        console.log("⚠️ [API] Smart contract call exception");
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

    console.log(`🎉 [API] Merge ${requestId} completed successfully:`, {
      newEntityId: completionResult.newEntityId,
      name: metadata.name,
      rarity: completionResult.rarity,
    });

    const responseData = {
      success: true,
      message: "Merge finalized successfully!",
      newEntityId: completionResult.newEntityId,
      name: metadata.name,
      rarity: completionResult.rarity,
      imageURI,
      metadata,
    };

    console.log("✅ [API] PATCH response prepared:", responseData);
    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error("❌ [API] Error finalizing merge:", error);
    console.log("🔍 [API] Final error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

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

    console.log("📝 [API] Final error message:", errorMessage);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
