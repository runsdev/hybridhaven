/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { GoogleGenAI } from "@google/genai";
import { pinata } from "@/utils/config";

// Validate environment variables
function validateIPFSEnvironment() {
  if (!process.env.PINATA_JWT || !process.env.NEXT_PUBLIC_GATEWAY_URL) {
    throw new Error("PINATA_JWT and NEXT_PUBLIC_GATEWAY_URL are required");
  }
}

export async function generateAndUploadHybridImage(
  entity1Name: string,
  entity2Name: string,
  rarity: number
): Promise<{ metadataURI: string; imageURI: string; metadata: any }> {
  try {
    const description = await generateHybridDescription(
      entity1Name,
      entity2Name,
      rarity
    );
    const hybridName = await generateHybridName(
      entity1Name,
      entity2Name,
      description
    );

    // Generate image using Google AI
    let imageBuffer: Buffer;
    try {
      const prompt = `Create a fantasy creature that is a hybrid fusion of ${entity1Name} and ${entity2Name}. 
        The creature should be ${getRarityDescriptor(
          rarity
        )} tier quality with magical ethereal effects. 
        Style: digital art, fantasy game character, detailed, vibrant colors, magical aura.
        Background: mystical environment suitable for a ${getRarityDescriptor(
          rarity
        )} rarity creature.`;

      imageBuffer = await createPlaceholderImage(
        entity1Name,
        entity2Name,
        rarity,
        description
      );
    } catch (aiError) {
      console.warn("AI image generation failed, using fallback:", aiError);
      imageBuffer = await createSVGFallback(
        entity1Name,
        entity2Name,
        rarity,
        description
      );
    }

    // 1. Upload image first and get the image URI
    const imageFilename = `${hybridName}-${Date.now()}.png`;
    const imageURI = await uploadImageWithMetadata(imageBuffer, imageFilename, {
      name: hybridName,
      rarity: rarity.toString(),
      parent1: entity1Name,
      parent2: entity2Name,
      type: "Hybrid",
      game: "HybridHaven",
    });

    console.log("🖼️ [IPFS] Image uploaded:", imageURI);

    // 2. Create metadata JSON with proper image reference
    const metadata = {
      name: hybridName,
      description,
      image: formatIPFSUrl(imageURI), // Use HTTP URL for the image
      external_url: "https://hybridhaven.runs.my.id",
      background_color: getRarityHexColor(rarity).replace("#", ""), // Remove # for OpenSea
      attributes: [
        {
          trait_type: "Rarity",
          value: getRarityDescriptor(rarity),
        },
        {
          trait_type: "Star Rating",
          value: rarity,
          max_value: 5,
          display_type: "number",
        },
        {
          trait_type: "Type",
          value: "Hybrid",
        },
        {
          trait_type: "Parent 1",
          value: entity1Name,
        },
        {
          trait_type: "Parent 2",
          value: entity2Name,
        },
        {
          trait_type: "Generation",
          value: "F1",
          display_type: "string",
        },
        {
          trait_type: "Created Date",
          value: Math.floor(Date.now() / 1000),
          display_type: "date",
        },
      ],
      // OpenSea collection information
      collection: {
        name: "HybridHaven Entities",
        family: "HybridHaven",
      },
      // Additional OpenSea fields
      animation_url: null,
      youtube_url: null,
    };

    // 3. Upload metadata JSON to IPFS
    console.log("📄 [IPFS] Uploading metadata JSON to IPFS...");
    const metadataFilename = `${hybridName}-metadata-${Date.now()}.json`;
    const metadataURI = await uploadMetadataJSON(metadata, metadataFilename);
    console.log("✅ [IPFS] Metadata JSON uploaded:", metadataURI);

    // Return both URIs - contract uses metadataURI, frontend can use both
    return {
      metadataURI, // Points to JSON file for contract
      imageURI, // Points to image file for direct access
      metadata, // The actual metadata object
    };
  } catch (error) {
    console.error("Error generating hybrid image and metadata:", error);
    throw new Error("Failed to generate hybrid content");
  }
}

async function generateHybridDescription(
  entity1: string,
  entity2: string,
  rarity: number
): Promise<string> {
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || "",
    });

    const config = {
      responseMimeType: "text/plain",
    };

    const model = "gemini-2.0-flash";

    const contents = [
      {
        role: "user",
        parts: [
          {
            text: `Create a detailed fantasy description for a hybrid creature that combines "${entity1}" and "${entity2}". 
            This is a ${rarity}-star rarity creature (1=common, 5=legendary). 
            
            The description should be 2-3 sentences and include:
            - Physical characteristics from both parent entities
            - Special abilities or powers (more powerful for higher rarity)
            - Mystical or elemental properties
            
            Keep it engaging and suitable for a fantasy NFT game. Don't mention NFT or blockchain.`,
          },
        ],
      },
    ];

    const response = await ai.models.generateContentStream({
      model,
      config,
      contents,
    });

    let description = "";
    for await (const chunk of response) {
      description += chunk.text || "";
    }

    return description.trim();
  } catch (error) {
    console.error("Error generating description:", error);
    // Fallback description
    return `A mystical fusion of ${entity1} and ${entity2}, this ${rarity}-star creature embodies the combined essence of its legendary parents.`;
  }
}

// async function generateShortHybridDescription(
//   entity1: string,
//   entity2: string,
//   rarity: number
// ): Promise<string> {
//   try {
//     const ai = new GoogleGenAI({
//       apiKey: process.env.GEMINI_API_KEY || "",
//     });

//     const config = {
//       responseMimeType: "text/plain",
//     };

//     const model = "gemini-2.0-flash";

//     const contents = [
//       {
//         role: "user",
//         parts: [
//           {
//             text: `Create a short, engaging description for a hybrid creature that combines "${entity1}" and "${entity2}".
//             This is a ${rarity}-star rarity creature (1=common, 5=legendary).

//             The description MUST be less than 200 characters and include:
//             - Unique traits from both parent entities
//             - A hint of its mystical or elemental nature

//             Keep it concise and suitable for a fantasy NFT game. Don't mention NFT or blockchain and don't use any markdown syntax.`,
//           },
//         ],
//       },
//     ];

//     const response = await ai.models.generateContentStream({
//       model,
//       config,
//       contents,
//     });

//     let description = "";
//     for await (const chunk of response) {
//       description += chunk.text || "";
//     }

//     return description.trim();
//   } catch (error) {
//     console.error("Error generating short description:", error);
//     // Fallback description
//     return `A mystical fusion of ${entity1} and ${entity2}, this ${rarity}-star creature embodies the combined essence of its legendary parents.`;
//   }
// }

async function generateHybridName(
  entity1: string,
  entity2: string,
  desc: string
): Promise<string> {
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || "",
    });

    const config = {
      responseMimeType: "text/plain",
    };

    const model = "gemini-2.0-flash";

    const contents = [
      {
        role: "user",
        parts: [
          {
            text: `Create a creative hybrid name by combining "${entity1}" and "${entity2}". 
            The name should be a single word or two that represents a fusion of both entities based on description ${desc}. So just return the name without any additional text and markdown formatting such as **name**.`,
          },
        ],
      },
    ];

    const response = await ai.models.generateContentStream({
      model,
      config,
      contents,
    });

    let name = "";
    for await (const chunk of response) {
      name += chunk.text || "";
    }

    return name.trim();
  } catch (error) {
    console.error("Error generating hybrid name:", error);
    // Fallback to portmanteau
    const part1 = entity1.slice(0, Math.ceil(entity1.length / 2));
    const part2 = entity2.slice(Math.floor(entity2.length / 2));
    return part1 + part2;
  }
}

async function createPlaceholderImage(
  entity1: string,
  entity2: string,
  rarity: number,
  description: string
): Promise<Buffer> {
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || "",
    });

    const config = {
      responseModalities: ["IMAGE", "TEXT"],
      responseMimeType: "text/plain",
    };

    const model = "gemini-2.0-flash-preview-image-generation";
    const rarityDescriptor = getRarityDescriptor(rarity);

    const imagePrompt = `Generate an image of a fantasy creature that is a hybrid fusion of ${entity1} and ${entity2}. 

Style: High-quality digital fantasy art, detailed illustration, vibrant colors
Rarity: ${rarityDescriptor} (${rarity}-star)
Composition: Full body portrait, centered, fantasy background
Lighting: Magical, ethereal glow that matches the rarity level

Details: 
- Combine visual elements from both ${entity1} and ${entity2}
- ${rarityDescriptor} creatures should have more elaborate and mystical features
- Include magical auras or energy effects appropriate for rarity level
- Fantasy game character design aesthetic
- Professional illustration quality

The creature should embody: ${description}

Art style: Fantasy game illustration, detailed, colorful, magical atmosphere`;

    const contents = [
      {
        role: "user",
        parts: [
          {
            text: imagePrompt,
          },
        ],
      },
    ];

    const response = await ai.models.generateContentStream({
      model,
      config,
      contents,
    });

    for await (const chunk of response) {
      if (
        !chunk.candidates ||
        !chunk.candidates[0].content ||
        !chunk.candidates[0].content.parts
      ) {
        continue;
      }
      if (chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
        const inlineData = chunk.candidates[0].content.parts[0].inlineData;
        const buffer = Buffer.from(inlineData.data || "", "base64");
        console.log(
          `Successfully generated ${buffer.length} byte image for ${entity1} + ${entity2}`
        );
        return buffer;
      }
    }

    // If no image was generated, fall back to SVG
    console.warn("No image generated by Gemini, falling back to SVG");
    return createSVGFallback(entity1, entity2, rarity, description);
  } catch (error) {
    console.error("Error generating image with Gemini:", error);
    // Fallback to SVG if Gemini image generation fails
    return createSVGFallback(entity1, entity2, rarity, description);
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

async function createSVGFallback(
  entity1: string,
  entity2: string,
  rarity: number,
  description: string
): Promise<Buffer> {
  // Original SVG creation code as fallback
  const width = 512;
  const height = 512;
  const rarityColor = getRarityHexColor(rarity);
  const stars = "⭐".repeat(rarity);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${rarityColor};stop-opacity:0.3" />
          <stop offset="100%" style="stop-color:#1a1a2e;stop-opacity:1" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <rect width="100%" height="100%" fill="url(#bg)"/>
      
      <!-- Border with rarity color -->
      <rect x="10" y="10" width="${width - 20}" height="${height - 20}" 
            fill="none" stroke="${rarityColor}" stroke-width="4" rx="20" filter="url(#glow)"/>
      
      <!-- Title -->
      <text x="50%" y="80" text-anchor="middle" font-family="Arial, sans-serif" 
            font-size="24" font-weight="bold" fill="white">
        ${entity1} + ${entity2}
      </text>
      
      <!-- Hybrid symbol -->
      <circle cx="256" cy="200" r="60" fill="${rarityColor}" opacity="0.2"/>
      <text x="50%" y="210" text-anchor="middle" font-family="Arial, sans-serif" 
            font-size="48" fill="white">🔮</text>
      
      <!-- Rarity stars -->
      <text x="50%" y="300" text-anchor="middle" font-family="Arial, sans-serif" 
            font-size="32" fill="${rarityColor}">${stars}</text>
      
      <!-- Type label -->
      <text x="50%" y="350" text-anchor="middle" font-family="Arial, sans-serif" 
            font-size="16" fill="#cccccc">HYBRID ENTITY</text>
      
      <!-- Description (truncated) -->
      <text x="50%" y="420" text-anchor="middle" font-family="Arial, sans-serif" 
            font-size="12" fill="#aaaaaa">
        <tspan x="50%" dy="0">${description.slice(0, 60)}...</tspan>
      </text>
      
      <!-- Footer -->
      <text x="50%" y="480" text-anchor="middle" font-family="Arial, sans-serif" 
            font-size="14" fill="#666666">HybridHaven</text>
    </svg>
  `;

  return Buffer.from(svg, "utf-8");
}

function getRarityHexColor(rarity: number): string {
  const colors = {
    1: "#9CA3AF", // Gray
    2: "#10B981", // Green
    3: "#3B82F6", // Blue
    4: "#8B5CF6", // Purple
    5: "#F59E0B", // Gold
  };
  return colors[rarity as keyof typeof colors] || colors[1];
}

function getRarityColor(rarity: number): string {
  const colors = {
    1: "gray",
    2: "green",
    3: "blue",
    4: "purple",
    5: "gold",
  };
  return colors[rarity as keyof typeof colors] || "gray";
}

export async function uploadImageToIPFS(
  imageBuffer: Buffer,
  filename: string
): Promise<string> {
  try {
    // Upload using the new SDK
    const upload = await pinata.upload.public.file(
      new File([new Uint8Array(imageBuffer)], filename)
    );
    return `${upload.cid}`;
  } catch (error) {
    console.error("Error uploading to IPFS:", error);
    throw new Error("Failed to upload image to IPFS");
  }
}

export async function uploadImageWithMetadata(
  imageBuffer: Buffer,
  filename: string,
  metadata: any
): Promise<string> {
  try {
    // Upload with minimal key-value pairs to stay under character limits
    const upload = await pinata.upload.public
      .file(new File([new Uint8Array(imageBuffer)], filename))
      .keyvalues({
        name: (metadata.name || "").slice(0, 245), // Limit to 50 chars
        rarity: metadata.rarity?.toString() || "1",
        parent1: (metadata.parent1 || "").slice(0, 30), // Limit to 30 chars
        parent2: (metadata.parent2 || "").slice(0, 30), // Limit to 30 chars
        type: "Hybrid",
        game: "HybridHaven",
      });

    return `${upload.cid}`;
  } catch (error) {
    console.error("Error uploading image with metadata to IPFS:", error);

    // Fallback: upload without metadata if keyvalues fail
    try {
      console.log("Fallback: uploading without metadata...");
      const fallbackUpload = await pinata.upload.public.file(
        new File([new Uint8Array(imageBuffer)], filename)
      );
      return `${fallbackUpload.cid}`;
    } catch (fallbackError) {
      console.error("Fallback upload also failed:", fallbackError);
      throw new Error("Failed to upload image to IPFS");
    }
  }
}

// Upload JSON metadata to IPFS
export async function uploadMetadataJSON(
  metadata: any,
  filename: string
): Promise<string> {
  try {
    // Convert metadata to JSON string
    const jsonString = JSON.stringify(metadata, null, 2);
    const jsonBuffer = Buffer.from(jsonString, "utf-8");

    // Upload JSON file to IPFS
    const upload = await pinata.upload.public.file(
      new File([new Uint8Array(jsonBuffer)], filename, {
        type: "application/json",
      })
    );

    console.log(`✅ [IPFS] JSON metadata uploaded: ${upload.cid}`);
    return `${upload.cid}`;
  } catch (error) {
    console.error("Error uploading JSON metadata to IPFS:", error);
    throw new Error("Failed to upload JSON metadata to IPFS");
  }
}

// New function to retrieve metadata from key-value store
export async function fetchMetadataFromKeyValues(
  ipfsHash: string
): Promise<any> {
  try {
    const files = await pinata.files.public.list().keyvalues({
      game: "HybridHaven",
    });

    // Find the file by IPFS hash
    const targetFile = files.files?.find((file) => file.cid === ipfsHash);

    if (!targetFile || !targetFile.keyvalues) {
      throw new Error("No metadata found for this file");
    }

    // Convert key-values back to metadata format
    const keyvalues = targetFile.keyvalues;

    let imageUri = "";
    if (keyvalues.type === "Hybrid") {
      imageUri = formatIPFSUrl(`ipfs://${ipfsHash}`);
    }

    const metadata = {
      name: keyvalues.name || "",
      description: keyvalues.description || "",
      image: imageUri, // Properly formatted HTTP URL for the image
      attributes: [
        { trait_type: "Rarity", value: parseInt(keyvalues.rarity || "1") },
        { trait_type: "Parent 1", value: keyvalues.parent1 || "" },
        { trait_type: "Parent 2", value: keyvalues.parent2 || "" },
        { trait_type: "Type", value: keyvalues.type || "Entity" },
      ].filter((attr) => attr.value !== ""), // Remove empty attributes
      external_url: keyvalues.external_url || "",
      background_color: keyvalues.background_color || "gray",
      created_at: keyvalues.created_at || "",
    };

    return metadata;
  } catch (error) {
    throw new Error("Failed to fetch metadata from IPFS key-values");
  }
}

// Update metadata for an existing file
export async function updateFileMetadata(
  fileId: string,
  newMetadata: Partial<any>
): Promise<void> {
  try {
    // Prepare key-values for update
    const keyvalues: Record<string, string> = {};

    if (newMetadata.name !== undefined) keyvalues.name = newMetadata.name;
    if (newMetadata.description !== undefined)
      keyvalues.description = newMetadata.description;
    if (newMetadata.rarity !== undefined)
      keyvalues.rarity = newMetadata.rarity.toString();
    if (newMetadata.parent1 !== undefined)
      keyvalues.parent1 = newMetadata.parent1;
    if (newMetadata.parent2 !== undefined)
      keyvalues.parent2 = newMetadata.parent2;
    if (newMetadata.type !== undefined) keyvalues.type = newMetadata.type;
    if (newMetadata.background_color !== undefined)
      keyvalues.background_color = newMetadata.background_color;
    if (newMetadata.external_url !== undefined)
      keyvalues.external_url = newMetadata.external_url;

    await pinata.files.public.update({
      id: fileId,
      keyvalues: keyvalues,
    });
  } catch (error) {
    console.error("Error updating file metadata:", error);
    throw new Error("Failed to update file metadata");
  }
}

// Function to search entities by metadata
export async function searchEntitiesByMetadata(filters: {
  rarity?: number;
  parent1?: string;
  parent2?: string;
  type?: string;
}): Promise<any[]> {
  try {
    // Build key-value filters
    let query = pinata.files.public.list().keyvalues({ game: "HybridHaven" });

    if (filters.rarity) {
      query = query.keyvalues({ rarity: filters.rarity.toString() });
    }
    if (filters.parent1) {
      query = query.keyvalues({ parent1: filters.parent1 });
    }
    if (filters.parent2) {
      query = query.keyvalues({ parent2: filters.parent2 });
    }
    if (filters.type) {
      query = query.keyvalues({ type: filters.type });
    }

    const result = await query;
    const files = result.files || [];

    // Convert files to metadata format
    return files.map((file) => {
      const kv = file.keyvalues || {};
      return {
        ipfsHash: file.cid,
        imageURI: `ipfs://${file.cid}`,
        name: kv.name || "",
        description: kv.description || "",
        rarity: parseInt(kv.rarity || "1"),
        parent1: kv.parent1 || "",
        parent2: kv.parent2 || "",
        type: kv.type || "Entity",
        background_color: kv.background_color || "gray",
        external_url: kv.external_url || "",
        created_at: kv.created_at || "",
        attributes: [
          { trait_type: "Rarity", value: parseInt(kv.rarity || "1") },
          { trait_type: "Parent 1", value: kv.parent1 || "" },
          { trait_type: "Parent 2", value: kv.parent2 || "" },
          { trait_type: "Type", value: kv.type || "Entity" },
        ].filter((attr) => attr.value !== ""),
      };
    });
  } catch (error) {
    console.error("Error searching entities by metadata:", error);
    throw new Error("Failed to search entities");
  }
}

// Legacy function for backwards compatibility - now fetches from key-values
export async function fetchMetadataFromIPFS(metadataURI: string): Promise<any> {
  try {
    // Extract IPFS hash from URI
    const ipfsHash = metadataURI.replace("ipfs://", "");

    // Try to fetch from key-values first (new method)
    try {
      return await fetchMetadataFromKeyValues(ipfsHash);
    } catch (keyValueError) {
      // Fallback to traditional HTTP fetch for old metadata files
      const httpUrl = formatIPFSUrl(metadataURI);
      const response = await fetch(httpUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch metadata: ${response.status} ${response.statusText}`
        );
      }

      return await response.json();
    }
  } catch (error) {
    console.error("Error fetching metadata from IPFS:", error);
    throw new Error("Failed to fetch metadata from IPFS");
  }
}

// Helper function to format IPFS URLs (used by both frontend and backend)
export function formatIPFSUrl(ipfsUrl: string): string {
  if (!ipfsUrl) return "";

  // Handle different IPFS URL formats
  if (ipfsUrl.startsWith("ipfs://")) {
    const hash = ipfsUrl.replace("ipfs://", "");
    // Use the configured gateway from environment
    const gateway =
      process.env.NEXT_PUBLIC_GATEWAY_URL || "gateway.pinata.cloud";
    return `https://${gateway}/ipfs/${hash}`;
  }

  // Already a HTTP URL - check if it has double ipfs prefix
  if (ipfsUrl.startsWith("http")) {
    // Fix double IPFS prefix issue like: https://gateway.com/ipfs/ipfs://hash
    if (ipfsUrl.includes("/ipfs/ipfs://")) {
      const parts = ipfsUrl.split("/ipfs/ipfs://");
      if (parts.length === 2) {
        const baseUrl = parts[0];
        const hash = parts[1];
        return `${baseUrl}/ipfs/${hash}`;
      }
    }
    return ipfsUrl;
  }

  if (ipfsUrl.startsWith("Qm") || ipfsUrl.startsWith("bafy")) {
    const gateway =
      process.env.NEXT_PUBLIC_GATEWAY_URL || "gateway.pinata.cloud";
    return `https://${gateway}/ipfs/${ipfsUrl}`;
  }

  // For any other format, assume it's a hash
  const gateway = process.env.NEXT_PUBLIC_GATEWAY_URL || "gateway.pinata.cloud";
  return `https://${gateway}/ipfs/${ipfsUrl}`;
}

// Sanitize filename to be URL-safe and shorter
function sanitizeFilename(name: string): string {
  // Remove any non-alphanumeric characters (except spaces)
  const sanitized = name.replace(/[^a-zA-Z0-9 ]/g, "");

  // Replace spaces with underscores
  const withUnderscores = sanitized.replace(/ +/g, "_");

  // Truncate to max 50 characters
  return withUnderscores.substring(0, 50);
}
