/* eslint-disable */

import { NextRequest, NextResponse } from "next/server";
import { createBackendContractService } from "@/lib/contracts";
import { formatIPFSUrl } from "@/lib/utils";

// GET /api/metadata/[tokenId] - OpenSea compatible metadata endpoint
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ tokenId: string }> }
) {
  const params = await props.params;
  console.log("🌐 [METADATA API] OpenSea metadata request received");

  try {
    const tokenId = parseInt(params.tokenId);
    console.log("📥 [METADATA API] Token ID:", tokenId);

    if (isNaN(tokenId) || tokenId < 1) {
      console.log("❌ [METADATA API] Invalid token ID");
      return NextResponse.json({ error: "Invalid token ID" }, { status: 400 });
    }

    console.log("🔗 [METADATA API] Creating backend service...");
    const backendService = createBackendContractService();

    console.log("📋 [METADATA API] Fetching entity from blockchain...");
    const entity = await backendService.getEntity(tokenId);

    console.log("📊 [METADATA API] Entity data:", {
      name: entity.name,
      rarity: entity.rarity,
      metadataURI: entity.metadataURI,
      parent1: entity.parent1,
      parent2: entity.parent2,
      isStarter: entity.isStarter,
    });

    // Extract image CID from metadataURI if it's an IPFS hash
    let imageUrl = "";
    if (entity.metadataURI && entity.metadataURI.startsWith("ipfs://")) {
      // Extract the CID from the metadata URI and use it as image URL
      const cid = entity.metadataURI.replace("ipfs://", "");
      imageUrl = `https://${process.env.NEXT_PUBLIC_GATEWAY_URL}/ipfs/${cid}`;
    } else if (entity.metadataURI) {
      // If it's already a full URL, use it as is
      imageUrl = entity.metadataURI;
    } else {
      // Fallback to a default image
      imageUrl = `https://${process.env.NEXT_PUBLIC_GATEWAY_URL}/ipfs/QmDefaultImageHash`;
    }

    // Create OpenSea-compatible metadata
    const metadata = {
      name: entity.name,
      description:
        entity.description ||
        `A ${entity.rarity}-star ${
          entity.isStarter ? "starter" : "hybrid"
        } entity${
          !entity.isStarter && entity.parent1 && entity.parent2
            ? ` created from ${entity.parent1} and ${entity.parent2}`
            : ""
        }`,
      image: imageUrl, // Use the properly formatted image URL
      external_url: "https://hybridhaven.runs.my.id",
      background_color: getRarityHexColor(entity.rarity),
      attributes: [
        {
          trait_type: "Rarity",
          value: getRarityDescriptor(entity.rarity),
          max_value: 5,
        },
        {
          trait_type: "Star Rating",
          value: entity.rarity,
          max_value: 5,
          display_type: "number",
        },
        {
          trait_type: "Type",
          value: entity.isStarter ? "Starter" : "Hybrid",
        },
        ...(entity.parent1
          ? [
              {
                trait_type: "Parent 1",
                value: entity.parent1,
              },
            ]
          : []),
        ...(entity.parent2
          ? [
              {
                trait_type: "Parent 2",
                value: entity.parent2,
              },
            ]
          : []),
        {
          trait_type: "Generation",
          value: calculateGenerationCode(
            entity.isStarter,
            entity.parent1,
            entity.parent2
          ),
          display_type: "string",
        },
        {
          trait_type: "Generation Level",
          value: calculateGenerationLevel(
            entity.isStarter,
            entity.parent1,
            entity.parent2
          ),
          max_value: 10,
          display_type: "number",
        },
        {
          trait_type: "Lineage Type",
          value: getLineageDescription(
            entity.isStarter,
            entity.parent1,
            entity.parent2
          ),
          display_type: "string",
        },
        {
          trait_type: "Created Date",
          value: entity.createdAt,
          display_type: "date",
        },
      ],
      properties: {
        rarity: entity.rarity,
        type: entity.isStarter ? "Starter" : "Hybrid",
        ...(entity.parent1 && { parent1: entity.parent1 }),
        ...(entity.parent2 && { parent2: entity.parent2 }),
        created_at: new Date(entity.createdAt * 1000).toISOString(),
        token_id: tokenId,
      },
    };

    console.log("✅ [METADATA API] Metadata prepared:", {
      name: metadata.name,
      description: metadata.description.slice(0, 100) + "...",
      imageUrl: metadata.image,
      attributesCount: metadata.attributes.length,
    });

    // Set appropriate headers for OpenSea
    return NextResponse.json(metadata, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error: any) {
    console.error("❌ [METADATA API] Error fetching metadata:", error);
    console.log("🔍 [METADATA API] Error details:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    // Handle specific errors
    let errorMessage = "Failed to fetch metadata";
    let statusCode = 500;

    if (
      error.message.includes("token does not exist") ||
      error.message.includes("ERC721NonexistentToken")
    ) {
      errorMessage = "Token does not exist";
      statusCode = 404;
    } else if (error.message.includes("invalid token ID")) {
      errorMessage = "Invalid token ID";
      statusCode = 400;
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}

function getRarityDescriptor(rarity: number): string {
  const descriptors = {
    1: "Common",
    2: "Uncommon",
    3: "Rare",
    4: "Epic",
    5: "Legendary",
  };
  return descriptors[rarity as keyof typeof descriptors] || "Common";
}

function getRarityHexColor(rarity: number): string {
  const colors = {
    1: "9CA3AF", // Gray (without #)
    2: "10B981", // Green
    3: "3B82F6", // Blue
    4: "8B5CF6", // Purple
    5: "F59E0B", // Gold
  };
  return colors[rarity as keyof typeof colors] || colors[1];
}

function calculateGenerationCode(
  isStarter: boolean,
  parent1: string,
  parent2: string
): string {
  if (isStarter) return "G0";
  const p1Gen = parent1.startsWith("G") ? parseInt(parent1.slice(1)) : 0;
  const p2Gen = parent2.startsWith("G") ? parseInt(parent2.slice(1)) : 0;
  return `F${Math.max(p1Gen, p2Gen) + 1}`;
}

function calculateGenerationLevel(
  isStarter: boolean,
  parent1: string,
  parent2: string
): number {
  if (isStarter) return 0;
  const p1Gen = parent1.startsWith("G") ? parseInt(parent1.slice(1)) : 0;
  const p2Gen = parent2.startsWith("G") ? parseInt(parent2.slice(1)) : 0;
  return Math.max(p1Gen, p2Gen);
}

function getLineageDescription(
  isStarter: boolean,
  parent1: string,
  parent2: string
): string {
  if (isStarter) return "Pure Starter";
  const types = [];
  if (parent1.startsWith("G")) types.push("Genetic");
  if (parent2.startsWith("G")) types.push("Genetic");
  if (types.length === 0) types.push("Hybrid");
  return types.join(" / ");
}
