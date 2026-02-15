export type Category = "Rings" | "Necklaces" | "Earrings" | "Bracelets" | "High Jewellery" | "Gifts";
export type Brand = "Kalevala" | "Lumoava" | "Lapponia" | "Lumière";
export type Collection = "Modern" | "Originals" | "Limited drops" | "Heritage" | "Signature" | "Gift Sets";
export type GemShape = "Round" | "Oval" | "Pear" | "Emerald" | "Marquise" | "None";
export type MaterialGroup = "Silver" | "Gold" | "Vermeil" | "Mixed";

export type Product = {
  id: string;
  name: string;
  category: Category;
  priceCents: number;
  material: string;
  materialGroup: MaterialGroup;
  gemstones: string;
  gemShape: GemShape;
  brand: Brand;
  collection: Collection;
  description: string;
  rating: number;
  image: string;
  badge?: "New" | "Bestseller" | "Limited";
};

export type CartItem = { productId: string; qty: number };
export type SortMode = "Featured" | "Price: Low → High" | "Price: High → Low" | "Rating";