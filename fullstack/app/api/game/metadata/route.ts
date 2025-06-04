/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from "next/server";
import { fetchMetadataFromIPFS } from "@/lib/ipfs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const metadataURI = searchParams.get("uri");
    let cid = searchParams.get("cid");

    // If cid is actually a full URL, extract the hash from it
    if (cid && cid.startsWith("http")) {
      // Extract CID from URLs like: https://gateway.com/ipfs/bafybeic...
      const matches = cid.match(/\/ipfs\/([a-zA-Z0-9]+)/);
      if (matches && matches[1]) {
        cid = matches[1];
      } else {
        return NextResponse.json(
          {
            success: false,
            error: "Could not extract CID from URL",
          },
          { status: 400 }
        );
      }
    }

    // Handle metadata fetching using CID (prioritize this approach)
    if (cid) {
      try {
        // Fetch JSON metadata file directly
        const metadata = await fetchMetadataFromIPFS(`ipfs://${cid}`);

        return NextResponse.json({
          success: true,
          metadata,
        });
      } catch (error) {
        console.error("Error fetching JSON metadata:", error);
        return NextResponse.json(
          {
            success: false,
            error: "Failed to fetch JSON metadata",
          },
          { status: 500 }
        );
      }
    }

    // Legacy support for old URI-based metadata
    if (!metadataURI) {
      return NextResponse.json(
        {
          success: false,
          error: "Either metadata URI or CID is required",
        },
        { status: 400 }
      );
    }

    // Fetch metadata from IPFS using traditional URI method
    const metadata = await fetchMetadataFromIPFS(metadataURI);

    return NextResponse.json({
      success: true,
      metadata,
    });
  } catch (error: any) {
    console.error("Error fetching metadata:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch metadata",
      },
      { status: 500 }
    );
  }
}
