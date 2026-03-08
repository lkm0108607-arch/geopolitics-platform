import { NextRequest, NextResponse } from "next/server";
import { fetchAllNews, fetchNewsByCategory, NewsCategory } from "@/lib/newsApi";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") as NewsCategory | null;

  try {
    const news = category ? await fetchNewsByCategory(category) : await fetchAllNews();

    return NextResponse.json(
      { ok: true, news, fetchedAt: new Date().toISOString() },
      {
        headers: {
          "Cache-Control": "s-maxage=300, stale-while-revalidate=60",
        },
      }
    );
  } catch (err) {
    console.error("News fetch error:", err);
    return NextResponse.json({ ok: false, news: [], error: "뉴스를 불러오지 못했습니다." }, { status: 500 });
  }
}
