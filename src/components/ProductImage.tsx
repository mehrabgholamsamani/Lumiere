import { useState } from "react";
import type { Product } from "../types";

type Props = {
  product: Pick<Product, "id" | "category" | "name">;
  className?: string;
  style?: React.CSSProperties;
  alt?: string;
  loading?: "lazy" | "eager";
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


export function ProductImage({ product, className, style, alt, loading = "lazy" }: Props) {
  const [attempt, setAttempt] = useState(0);

  const { folder, prefix } = folderFor(product.category);


  const baseIdx = (hashStr(product.id) % 12) + 1;
  const idx = ((baseIdx + attempt - 1) % 12) + 1;

  const src = `/images/pool/${folder}/${prefix}${idx}.webp`;

  return (
    <img
      className={className}
      style={style}
      src={src}
      alt={alt ?? product.name}
      loading={loading}
      onError={() => {

        setAttempt((a) => (a < 11 ? a + 1 : a));
      }}
    />
  );
}