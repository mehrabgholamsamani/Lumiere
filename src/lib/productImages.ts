import type { Product } from "../types";



const POOL_COUNTS: Record<string, number> = {
  Rings: 10,
  Necklaces: 6,
  Jewellery: 9,
  "High Jewellery": 9,
  Gifts: 9,
};

function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function folderFor(category: string) {
  switch (category) {
    case "Rings":
      return { folder: "rings", prefix: "ring" };
    case "Necklaces":
      return { folder: "necklaces", prefix: "necklace" };
    case "Jewellery":
      return { folder: "jewellery", prefix: "jewellery" };
    case "High Jewellery":
      return { folder: "high-jewellery", prefix: "high-jewellery" };
    case "Gifts":
      return { folder: "gifts", prefix: "gift" };
    default:
      return { folder: "jewellery", prefix: "jewellery" };
  }
}

export function getProductImage(product: Pick<Product, "id" | "category">) {
  const { folder, prefix } = folderFor(product.category);
  const total = POOL_COUNTS[product.category] ?? 10;
  const idx = (hashStr(product.id) % total) + 1;
  return `/images/pool/${folder}/${prefix}${idx}.webp`;
}

export function setPoolCount(category: keyof typeof POOL_COUNTS, count: number) {
  POOL_COUNTS[category] = count;
}