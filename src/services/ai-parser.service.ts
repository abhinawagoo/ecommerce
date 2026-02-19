import OpenAI from "openai";
import type { ParsedProductData } from "@/types/telegram";

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

const VALID_CATEGORIES = ["sneakers", "running", "formal", "casual", "sandals", "boots"];
const VALID_GENDERS = ["men", "women", "kids", "unisex"];

const COLOR_HEX_MAP: Record<string, string> = {
  black: "#000000",
  white: "#FFFFFF",
  red: "#DC2626",
  blue: "#2563EB",
  green: "#16A34A",
  yellow: "#EAB308",
  orange: "#EA580C",
  pink: "#EC4899",
  purple: "#9333EA",
  brown: "#92400E",
  grey: "#6B7280",
  gray: "#6B7280",
  navy: "#1E3A5F",
  beige: "#D4C5A9",
  cream: "#FFFDD0",
  teal: "#0D9488",
  maroon: "#7F1D1D",
  olive: "#65A30D",
  silver: "#C0C0C0",
  gold: "#D4AF37",
  tan: "#D2B48C",
  coral: "#F97316",
  mint: "#A7F3D0",
  burgundy: "#800020",
  khaki: "#C3B091",
  multicolor: "#808080",
};

const SYSTEM_PROMPT = `You are a product data parser for a shoe & fashion ecommerce store. Extract structured product data from the raw text provided. The text is typically a casual product listing from a supplier.

Rules:
- name: Clean product name (brand + model + key color/variant). Title case.
- brand: Detect the brand. Common brands: Nike, Adidas, Puma, Reebok, New Balance, Converse, Vans, ASICS, Skechers, Crocs, Bata, Woodland, Red Tape, Campus, Sparx. If unclear, use "Unbranded".
- category: One of: ${VALID_CATEGORIES.join(", ")}. Infer from product type.
- gender: One of: ${VALID_GENDERS.join(", ")}. Infer from text or default to "men".
- sizes: Array of size strings. Parse formats like "40-41-42-43-44", "6 7 8 9 10", "UK 7-11", "40/41/42". Return individual sizes as strings.
- sale_price: The selling price in INR (number, no decimals). Parse formats like "2199/-", "Rs.2199", "₹2,199", "2199".
- mrp: Original MRP if mentioned. If not mentioned, calculate as sale_price × 1.4 rounded to nearest 99.
- description: A clean, compelling 1-2 sentence product description suitable for an ecommerce listing.
- slug: URL-friendly slug from the name (lowercase, hyphens, no special chars).
- color: Primary color name (e.g., "White", "Black", "Blue"). Title case.
- is_featured: Set true if the text mentions premium, exclusive, limited, trending, or bestseller. Otherwise false.

Return ONLY valid JSON matching the schema.`;

const JSON_SCHEMA = {
  name: "parsed_product",
  strict: true,
  schema: {
    type: "object" as const,
    properties: {
      name: { type: "string" as const },
      brand: { type: "string" as const },
      category: { type: "string" as const, enum: VALID_CATEGORIES },
      gender: { type: "string" as const, enum: VALID_GENDERS },
      sizes: { type: "array" as const, items: { type: "string" as const } },
      sale_price: { type: "number" as const },
      mrp: { type: "number" as const },
      description: { type: "string" as const },
      slug: { type: "string" as const },
      color: { type: "string" as const },
      is_featured: { type: "boolean" as const },
    },
    required: [
      "name", "brand", "category", "gender", "sizes",
      "sale_price", "mrp", "description", "slug", "color", "is_featured",
    ],
    additionalProperties: false,
  },
};

export async function parseProductText(rawText: string): Promise<ParsedProductData> {
  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: rawText },
    ],
    response_format: {
      type: "json_schema",
      json_schema: JSON_SCHEMA,
    },
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("Empty response from OpenAI");

  const parsed = JSON.parse(content) as Omit<ParsedProductData, "color_hex">;

  // Add color_hex based on parsed color
  const colorLower = parsed.color.toLowerCase();
  const color_hex = COLOR_HEX_MAP[colorLower] ?? "#808080";

  return { ...parsed, color_hex };
}
