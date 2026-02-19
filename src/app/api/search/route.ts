import { NextRequest, NextResponse } from "next/server";
import { searchProducts } from "@/services/product.service";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const products = await searchProducts(query, 5);
    return NextResponse.json(products);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
