import { NextRequest, NextResponse } from "next/server";
import { fetchMetadataFromKeyValues, fetchMetadataFromIPFS } from "@/lib/ipfs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const metadataURI = searchParams.get("uri");
    const cid = searchParams.get("cid");

    // Handle new key-value approach using CID
    if (cid) {
      try {
        // Fetch metadata from IPFS key-value pairs using the image CID
        const metadata = await fetchMetadataFromKeyValues(cid);

        return NextResponse.json({
          success: true,
          metadata,
        });
      } catch (error: any) {
        console.error("Error fetching key-value metadata:", error);
        return NextResponse.json(
          {
            success: false,
            error: error.message || "Failed to fetch key-value metadata",
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
