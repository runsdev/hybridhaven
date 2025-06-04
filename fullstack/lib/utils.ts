export function formatIPFSUrl(ipfsHash: string): string {
  if (ipfsHash.startsWith("ipfs://")) {
    return `https://gateway.pinata.cloud/ipfs/${ipfsHash.replace(
      "ipfs://",
      ""
    )}`;
  }
  return ipfsHash;
}

export function calculateRarity(randomValue: bigint): number {
  console.log("Random Value:", randomValue.toString());
  if (randomValue <= BigInt(10)) return 5; //  0.1% chance for 5-star
  if (randomValue <= BigInt(1000)) return 4; //  9.9% chance for 4-star
  if (randomValue <= BigInt(5000)) return 3; // 40.0% chance for 3-star
  if (randomValue <= BigInt(7000)) return 2; // 30.0% chance for 2-star
  return 1; // 20.0% chance for 1-star
}

export function getRarityDescriptor(rarity: number): string {
  const descriptors = {
    1: "Common",
    2: "Uncommon",
    3: "Rare",
    4: "Epic",
    5: "Legendary",
  };
  return descriptors[rarity as keyof typeof descriptors] || "Common";
}

export function getRarityHexColor(rarity: number): string {
  const colors = {
    1: "9CA3AF", // Gray (without #)
    2: "10B981", // Green
    3: "3B82F6", // Blue
    4: "8B5CF6", // Purple
    5: "F59E0B", // Gold
  };
  return colors[rarity as keyof typeof colors] || colors[1];
}

export function getStarterEmoji(name: string): string {
  const emojiMap: { [key: string]: string } = {
    Fire: "🔥",
    Water: "💧",
    Earth: "🌍",
    Air: "💨",
    Light: "✨",
    Shadow: "🌑",
    Metal: "🔩",
    Crystal: "💎",
    Lightning: "⚡",
    Ice: "🧊",
    Plant: "🌱",
    Beast: "🐺",
    Aquatic: "🌊",
    Avian: "🦅",
    Insect: "🐛",
    Stellar: "⭐",
    Lunar: "🌙",
    Solar: "☀️",
    Void: "🕳️",
    Nebula: "🌌",
    Forest: "🌲",
    Desert: "🏜️",
    Ocean: "🌊",
    Mountain: "⛰️",
    Wolf: "🐺",
    Tiger: "🐅",
    Eagle: "🦅",
    Bear: "🐻",
    Fox: "🦊",
    Oak: "🌳",
    Rose: "🌹",
    Cactus: "🌵",
    Lotus: "🪷",
    Fern: "🌿",
    Butterfly: "🦋",
  };
  return emojiMap[name] || "⭐";
}
