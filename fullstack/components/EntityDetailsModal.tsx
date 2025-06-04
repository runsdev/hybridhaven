import { Entity } from "@/types/game";
import { useState, useEffect } from "react";
import { formatIPFSUrl } from "@/lib/utils";
import { getStarterEmoji } from "@/lib/utils";

export default function EntityDetailsModal({
  entity,
  onClose,
  addNFTToWallet,
}: {
  entity: Entity;
  onClose: () => void;
  addNFTToWallet: (tokenId: number, entity: Entity) => Promise<void>;
}) {
  const [ipfsMetadata, setIpfsMetadata] = useState<any>(null);
  const [openSeaMetadata, setOpenSeaMetadata] = useState<any>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);

  // Fetch both IPFS and OpenSea metadata when modal opens
  useEffect(() => {
    let cancelled = false;

    const fetchMetadata = async () => {
      if (entity.isStarter) return;

      setMetadataLoading(true);
      setMetadataError(null);

      try {
        // Fetch OpenSea-compatible metadata
        if (entity.tokenId > 0) {
          try {
            const openSeaResponse = await fetch(
              `/api/metadata/${entity.tokenId}`
            );
            const openSeaData = await openSeaResponse.json();
            if (!cancelled && !openSeaData.error) {
              setOpenSeaMetadata(openSeaData);
            }
          } catch (error) {
            if (!cancelled) {
              console.warn("Could not fetch OpenSea metadata:", error);
            }
          }
        }

        // Fetch IPFS key-value metadata if available
        if (entity.imageURI) {
          try {
            // Extract CID from entity.imageURI (could be ipfs:// or https:// URL)
            let cid = entity.imageURI;

            // If it's an ipfs:// URI, extract the hash
            if (cid.startsWith("ipfs://")) {
              cid = cid.replace("ipfs://", "");
            }
            // If it's an HTTPS URL, extract the CID from the path
            else if (cid.startsWith("http")) {
              const matches = cid.match(/\/ipfs\/([a-zA-Z0-9]+)/);
              if (matches && matches[1]) {
                cid = matches[1];
              } else {
                console.warn("Could not extract CID from URL:", cid);
                return; // Skip IPFS metadata fetch if we can't extract CID
              }
            }

            const ipfsResponse = await fetch(
              `/api/game/metadata?cid=${encodeURIComponent(cid)}`
            );
            const ipfsData = await ipfsResponse.json();
            if (!cancelled && ipfsData.success) {
              setIpfsMetadata(ipfsData.metadata);
            }
          } catch (error) {
            if (!cancelled) {
              console.warn("Could not fetch IPFS metadata:", error);
            }
          }
        }
      } catch (error: any) {
        if (!cancelled) {
          console.error("Error fetching metadata:", error);
          setMetadataError("Failed to load metadata");
        }
      } finally {
        if (!cancelled) {
          setMetadataLoading(false);
        }
      }
    };

    fetchMetadata();

    // Cleanup function to prevent state updates if component unmounts
    return () => {
      cancelled = true;
    };
  }, [entity.tokenId, entity.imageURI, entity.isStarter]);

  const getRarityStars = (rarity: number) => "⭐".repeat(rarity);

  const getRarityName = (rarity: number) => {
    const names = {
      1: "COMMON",
      2: "UNCOMMON",
      3: "RARE",
      4: "EPIC",
      5: "LEGENDARY",
    };
    return names[rarity as keyof typeof names] || "COMMON";
  };

  const getRarityColor = (rarity: number) => {
    const colors = {
      1: "border-gray-400/50 shadow-gray-500/20",
      2: "border-green-400/50 shadow-green-500/20",
      3: "border-blue-400/50 shadow-blue-500/20",
      4: "border-purple-400/50 shadow-purple-500/20",
      5: "border-yellow-400/50 shadow-yellow-500/20",
    };
    return (
      colors[rarity as keyof typeof colors] ||
      "border-gray-400/50 shadow-gray-500/20"
    );
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Use OpenSea metadata if available, fallback to IPFS or entity data
  const displayMetadata = openSeaMetadata || ipfsMetadata;
  const displayDescription = displayMetadata?.description || entity.description;

  // OpenSea marketplace URL
  const openSeaUrl =
    entity.tokenId > 0
      ? `https://testnets.opensea.io/assets/sepolia/${process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS}/${entity.tokenId}`
      : null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-lg flex items-center justify-center z-50 p-4">
      <div
        className={`bg-gradient-to-br from-gray-900/95 via-black/90 to-gray-900/95 backdrop-blur-xl border-2 ${getRarityColor(
          entity.rarity
        )} rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl`}
      >
        {/* Cyberpunk corner decorations */}
        <div className="absolute top-3 left-3 w-6 h-6 border-l-2 border-t-2 border-cyan-400/60 rounded-tl-xl"></div>
        <div className="absolute top-3 right-3 w-6 h-6 border-r-2 border-t-2 border-cyan-400/60 rounded-tr-xl"></div>
        <div className="absolute bottom-3 left-3 w-6 h-6 border-l-2 border-b-2 border-cyan-400/60 rounded-bl-xl"></div>
        <div className="absolute bottom-3 right-3 w-6 h-6 border-r-2 border-b-2 border-cyan-400/60 rounded-br-xl"></div>

        <div className="p-8 space-y-8 relative">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-magenta-400 to-green-400 bg-clip-text text-transparent flex items-center space-x-3">
                <span>{entity.name}</span>
                <span className="text-2xl">
                  {getRarityStars(entity.rarity)}
                </span>
              </h2>
              <div className="flex items-center space-x-4">
                <span
                  className={`px-3 py-1 rounded-xl text-sm font-mono uppercase tracking-wide bg-black/40 border ${getRarityColor(
                    entity.rarity
                  )} text-white`}
                >
                  {getRarityName(entity.rarity)}
                </span>
                <span className="px-3 py-1 rounded-xl text-sm font-mono bg-cyan-900/30 border border-cyan-500/30 text-cyan-300">
                  {entity.isStarter ? "STARTER_ENTITY" : "HYBRID_ENTITY"}
                </span>
              </div>
              {entity.tokenId > 0 && (
                <p className="text-sm text-cyan-400 font-mono bg-cyan-900/20 px-3 py-1 rounded-xl inline-block border border-cyan-500/30">
                  TOKEN_ID: #{entity.tokenId}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-cyan-300 transition-all duration-300 text-3xl hover:bg-red-500/20 rounded-full w-12 h-12 flex items-center justify-center border border-gray-600/30 hover:border-red-400/50"
            >
              ✕
            </button>
          </div>

          {/* Image */}
          <div className="aspect-square bg-gradient-to-br from-gray-800/80 via-black/60 to-gray-800/80 rounded-2xl overflow-hidden border-2 border-cyan-500/30 shadow-2xl shadow-cyan-500/10">
            {entity.imageURI && entity.imageURI !== "" ? (
              <img
                src={formatIPFSUrl(entity.imageURI)}
                alt={entity.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Fallback to emoji if image fails to load
                  e.currentTarget.style.display = "none";
                  const fallback = e.currentTarget
                    .nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
            ) : null}
            {entity.isStarter && (
              <div className="text-8xl flex items-center justify-center w-full h-full">
                {getStarterEmoji(entity.name)}
              </div>
            )}
          </div>

          {/* Description */}
          {displayDescription && (
            <div className="space-y-4">
              <h4 className="text-xl font-bold text-cyan-300 flex items-center">
                <span className="mr-2">📝</span>
                ENTITY_DESCRIPTION
              </h4>
              <p className="text-cyan-200 leading-relaxed bg-black/30 border border-cyan-500/30 rounded-2xl p-4 backdrop-blur-sm">
                {displayDescription}
              </p>
            </div>
          )}

          {/* OpenSea Metadata Display */}
          {openSeaMetadata && (
            <div className="space-y-6">
              <h4 className="text-xl font-bold text-blue-300 flex items-center">
                <span className="mr-2">🌊</span>
                OPENSEA_METADATA
                <span className="ml-3 text-xs text-green-400 bg-green-900/30 px-3 py-1 rounded-full border border-green-500/30">
                  ✅ COMPATIBLE
                </span>
              </h4>

              {/* Attributes Grid */}
              {openSeaMetadata.attributes &&
                openSeaMetadata.attributes.length > 0 && (
                  <div className="bg-black/40 border border-blue-500/30 rounded-2xl p-6 backdrop-blur-sm">
                    <h5 className="text-lg font-bold text-blue-300 mb-4 flex items-center">
                      <span className="mr-2">🏷️</span>
                      TRAITS_&_PROPERTIES
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {openSeaMetadata.attributes.map(
                        (attr: any, index: number) => (
                          <div
                            key={index}
                            className="bg-gradient-to-br from-gray-800/80 to-black/60 rounded-xl p-4 border border-gray-600/30 hover:border-cyan-400/50 transition-all duration-300"
                          >
                            <div className="text-xs text-cyan-400 uppercase tracking-wide font-mono mb-1">
                              {attr.trait_type}
                            </div>
                            <div className="text-white font-bold text-lg">
                              {attr.display_type === "date"
                                ? new Date(
                                    attr.value * 1000
                                  ).toLocaleDateString()
                                : attr.value}
                              {attr.max_value && ` / ${attr.max_value}`}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
            </div>
          )}

          {/* Entity Details */}
          <div className="space-y-6">
            <h4 className="text-xl font-bold text-magenta-300 flex items-center">
              <span className="mr-2">🔍</span>
              ENTITY_DETAILS
            </h4>
            <div className="bg-black/40 border border-magenta-500/30 rounded-2xl p-6 backdrop-blur-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-gray-800/50 to-black/30 rounded-xl p-4 border border-gray-600/30">
                    <span className="text-gray-400 text-sm font-mono uppercase tracking-wide">
                      RARITY:
                    </span>
                    <div className="text-white font-bold text-lg mt-1">
                      {getRarityName(entity.rarity)}{" "}
                      {getRarityStars(entity.rarity)}
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-gray-800/50 to-black/30 rounded-xl p-4 border border-gray-600/30">
                    <span className="text-gray-400 text-sm font-mono uppercase tracking-wide">
                      TYPE:
                    </span>
                    <div className="text-white font-bold text-lg mt-1">
                      {entity.isStarter ? "STARTER_ENTITY" : "HYBRID_ENTITY"}
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  {!entity.isStarter && entity.parent1 && entity.parent2 && (
                    <>
                      <div className="bg-gradient-to-r from-gray-800/50 to-black/30 rounded-xl p-4 border border-gray-600/30">
                        <span className="text-gray-400 text-sm font-mono uppercase tracking-wide">
                          PARENT_1:
                        </span>
                        <div className="text-magenta-300 font-bold text-lg mt-1">
                          {entity.parent1}
                        </div>
                      </div>
                      <div className="bg-gradient-to-r from-gray-800/50 to-black/30 rounded-xl p-4 border border-gray-600/30">
                        <span className="text-gray-400 text-sm font-mono uppercase tracking-wide">
                          PARENT_2:
                        </span>
                        <div className="text-magenta-300 font-bold text-lg mt-1">
                          {entity.parent2}
                        </div>
                      </div>
                    </>
                  )}
                  <div className="bg-gradient-to-r from-gray-800/50 to-black/30 rounded-xl p-4 border border-gray-600/30">
                    <span className="text-gray-400 text-sm font-mono uppercase tracking-wide">
                      CREATED:
                    </span>
                    <div className="text-green-300 font-bold text-lg mt-1">
                      {formatDate(entity.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            {entity.tokenId > 0 && (
              <>
                <button
                  onClick={() => addNFTToWallet(entity.tokenId, entity)}
                  className="bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 hover:from-orange-500 hover:via-red-500 hover:to-pink-500 text-white font-bold py-3 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-2xl shadow-orange-500/25 border border-orange-400/30 hover:border-orange-300/50 flex items-center justify-center space-x-3"
                >
                  <span className="text-xl">🦊</span>
                  <span className="font-mono">ADD_TO_METAMASK</span>
                </button>
                {openSeaUrl && (
                  <a
                    href={openSeaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-500 hover:via-purple-500 hover:to-indigo-500 text-white font-bold py-3 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-2xl shadow-blue-500/25 border border-blue-400/30 hover:border-blue-300/50 flex items-center justify-center space-x-3"
                  >
                    <span className="text-xl">🌊</span>
                    <span className="font-mono">VIEW_ON_OPENSEA</span>
                  </a>
                )}
              </>
            )}
          </div>

          {/* Metadata Loading/Error States */}
          {metadataLoading && !entity.isStarter && (
            <div className="bg-blue-500/20 backdrop-blur-lg border border-blue-400/50 rounded-2xl p-4">
              <div className="flex items-center space-x-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
                <span className="text-blue-200 font-mono">
                  LOADING_METADATA...
                </span>
              </div>
            </div>
          )}

          {metadataError && !entity.isStarter && (
            <div className="bg-red-500/20 backdrop-blur-lg border border-red-400/50 rounded-2xl p-4">
              <div className="text-red-200 font-mono">
                <strong>⚠️ METADATA_ERROR:</strong> {metadataError}
              </div>
            </div>
          )}

          {/* Note for Starter Entities */}
          {entity.isStarter && (
            <div className="bg-green-500/20 backdrop-blur-lg border border-green-400/50 rounded-2xl p-4">
              <div className="text-green-200 font-mono">
                <strong className="text-green-300">💡 STARTER_ENTITY:</strong>{" "}
                This is a virtual starter entity. Merge it with another entity
                to create a real NFT!
              </div>
            </div>
          )}

          {/* Raw Metadata (for debugging) */}
          {(openSeaMetadata || ipfsMetadata) && (
            <details className="bg-black/40 border border-gray-600/30 rounded-2xl backdrop-blur-sm">
              <summary className="p-4 cursor-pointer text-gray-300 hover:text-cyan-300 transition-colors font-mono">
                <span className="text-sm">
                  🔍 VIEW_RAW_METADATA [CLICK_TO_EXPAND]
                </span>
              </summary>
              <div className="px-6 pb-6 space-y-6">
                {openSeaMetadata && (
                  <div>
                    <h6 className="text-sm font-bold text-blue-400 mb-3 font-mono">
                      OPENSEA_METADATA:
                    </h6>
                    <pre className="bg-black/60 border border-blue-500/30 rounded-xl p-4 text-xs text-cyan-300 overflow-auto max-h-64 font-mono">
                      {JSON.stringify(openSeaMetadata, null, 2)}
                    </pre>
                  </div>
                )}
                {ipfsMetadata && (
                  <div>
                    <h6 className="text-sm font-bold text-green-400 mb-3 font-mono">
                      IPFS_KEY-VALUE_METADATA:
                    </h6>
                    <pre className="bg-black/60 border border-green-500/30 rounded-xl p-4 text-xs text-green-300 overflow-auto max-h-64 font-mono">
                      {JSON.stringify(ipfsMetadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
