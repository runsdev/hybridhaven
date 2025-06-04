import { Entity } from "@/types/game";
import { formatIPFSUrl } from "@/lib/utils";
import { getStarterEmoji } from "@/lib/utils";

export default function EntityCard({
  entity,
  selected,
  onClick,
}: {
  entity: Entity;
  selected: boolean;
  onSelect: () => void;
  canSelect: boolean;
  onClick: (entity: Entity) => void;
}) {
  const getRarityStars = (rarity: number) => "⭐".repeat(rarity);

  const getRarityColor = (rarity: number) => {
    const colors = {
      1: "border-gray-400/50 bg-gray-900/30 shadow-gray-500/20",
      2: "border-green-400/50 bg-green-900/30 shadow-green-500/20",
      3: "border-blue-400/50 bg-blue-900/30 shadow-blue-500/20",
      4: "border-purple-400/50 bg-purple-900/30 shadow-purple-500/20",
      5: "border-yellow-400/50 bg-yellow-900/30 shadow-yellow-500/20",
    };
    return (
      colors[rarity as keyof typeof colors] ||
      "border-gray-400/50 bg-gray-900/30 shadow-gray-500/20"
    );
  };

  const getRarityHoverGlow = (rarity: number) => {
    const glows = {
      1: "hover:shadow-gray-400/40 hover:border-gray-300/70",
      2: "hover:shadow-green-400/40 hover:border-green-300/70",
      3: "hover:shadow-blue-400/40 hover:border-blue-300/70",
      4: "hover:shadow-purple-400/40 hover:border-purple-300/70",
      5: "hover:shadow-yellow-400/40 hover:border-yellow-300/70",
    };
    return (
      glows[rarity as keyof typeof glows] ||
      "hover:shadow-gray-400/40 hover:border-gray-300/70"
    );
  };

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

  return (
    <div
      className={`
        relative rounded-2xl p-4 transition-all duration-300 transform hover:scale-105 cursor-pointer backdrop-blur-lg
        ${getRarityColor(entity.rarity)}
        ${getRarityHoverGlow(entity.rarity)}
        ${
          selected
            ? "ring-2 ring-cyan-400 ring-offset-2 ring-offset-black shadow-2xl shadow-cyan-400/50 scale-105"
            : ""
        }
        border-2 hover:shadow-2xl group
      `}
      onClick={() => onClick(entity)}
    >
      {/* Cyberpunk corner decorations */}
      <div className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2 border-cyan-400/60 rounded-tl-lg"></div>
      <div className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 border-cyan-400/60 rounded-tr-lg"></div>
      <div className="absolute bottom-2 left-2 w-3 h-3 border-l-2 border-b-2 border-cyan-400/60 rounded-bl-lg"></div>
      <div className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 border-cyan-400/60 rounded-br-lg"></div>

      {/* Entity Image with cyberpunk styling */}
      <div className="aspect-square bg-gradient-to-br from-gray-800/80 via-black/60 to-gray-800/80 rounded-xl mb-4 flex items-center justify-center overflow-hidden border border-cyan-500/30 shadow-inner">
        {entity.imageURI && entity.imageURI !== "" ? (
          <img
            src={formatIPFSUrl(entity.imageURI)}
            alt={entity.name}
            className="w-full h-full object-cover transition-all duration-300 group-hover:brightness-110 group-hover:contrast-110"
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
          <div className="text-4xl flex items-center justify-center w-full h-full transition-all duration-300 group-hover:scale-110">
            {getStarterEmoji(entity.name)}
          </div>
        )}

        {/* Glowing overlay effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-cyan-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      </div>

      {/* Entity Info with cyberpunk styling */}
      <div className="space-y-3">
        <h3
          className="font-bold text-white text-lg truncate group-hover:text-cyan-100 transition-colors duration-300"
          title={entity.name}
        >
          {entity.name}
        </h3>

        <div className="flex items-center justify-between">
          <span className="text-sm text-cyan-300 font-mono bg-cyan-900/30 px-2 py-1 rounded-lg border border-cyan-500/30">
            #{entity.tokenId}
          </span>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-mono">
              {getRarityStars(entity.rarity)}
            </span>
            <span className="text-xs text-gray-300 font-mono bg-black/40 px-2 py-1 rounded-lg uppercase tracking-wide">
              {getRarityName(entity.rarity)}
            </span>
          </div>
        </div>

        {!entity.isStarter && entity.parent1 && entity.parent2 && (
          <div className="text-xs text-fuchsia-300 bg-fuchsia-900/30 border border-fuchsia-500/30 rounded-xl px-3 py-2 font-mono">
            <span className="text-fuchsia-400">◆</span> {entity.parent1} +{" "}
            {entity.parent2}
          </div>
        )}

        {entity.isStarter && (
          <div className="text-xs text-green-300 bg-green-900/30 border border-green-500/30 rounded-xl px-3 py-2 font-mono flex items-center">
            <span className="text-green-400 mr-2">◆</span>
            STARTER_ENTITY
          </div>
        )}
      </div>

      {/* Selection Indicator with cyberpunk styling */}
      {selected && (
        <div className="absolute top-3 right-3 bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-black rounded-full w-8 h-8 flex items-center justify-center text-lg font-bold shadow-lg shadow-cyan-500/50 animate-pulse border-2 border-cyan-300">
          ✓
        </div>
      )}

      {/* Animated border glow on hover */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute inset-0 rounded-2xl border border-cyan-400/30 animate-pulse"></div>
      </div>
    </div>
  );
}
