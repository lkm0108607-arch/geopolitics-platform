export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt: string;
  category: NewsCategory;
  tags: string[];
  relevance: RelevanceTag[];
}

export type NewsCategory =
  | "국제정치"
  | "한국경제"
  | "금·은·원자재"
  | "주식·ETF"
  | "외환·통화"
  | "에너지"
  | "미중관계"
  | "러우전쟁"
  | "중동"
  | "한반도";

export type RelevanceTag =
  | "금투자"
  | "은투자"
  | "달러환율"
  | "원달러"
  | "코스피"
  | "나스닥"
  | "S&P500"
  | "원유"
  | "방산주"
  | "반도체"
  | "안전자산"
  | "인플레이션"
  | "금리";

export interface NewsFeed {
  category: NewsCategory;
  query: string;
  koQuery: string;
}

export const NEWS_FEEDS: NewsFeed[] = [
  { category: "금·은·원자재",  query: "gold silver price commodity investing",  koQuery: "금 은 원자재 가격 투자" },
  { category: "외환·통화",     query: "dollar won exchange rate currency forex", koQuery: "달러 원화 환율 외환" },
  { category: "주식·ETF",      query: "stock market S&P500 KOSPI ETF",          koQuery: "주식 코스피 ETF 증시" },
  { category: "한국경제",       query: "Korea economy KRW BOK interest rate",    koQuery: "한국 경제 한국은행 금리" },
  { category: "미중관계",       query: "US China trade war tech sanctions",       koQuery: "미중 무역 반도체 제재" },
  { category: "러우전쟁",       query: "Russia Ukraine war ceasefire NATO",       koQuery: "러시아 우크라이나 전쟁 휴전" },
  { category: "중동",           query: "Israel Iran Middle East oil OPEC",        koQuery: "이스라엘 이란 중동 유가" },
  { category: "한반도",         query: "North Korea missile nuclear ICBM",        koQuery: "북한 미사일 핵 한반도" },
  { category: "에너지",         query: "oil price OPEC energy natural gas",       koQuery: "유가 OPEC 에너지 천연가스" },
  { category: "국제정치",       query: "geopolitics international security G7",   koQuery: "국제정치 외교 안보 G7" },
];

function simpleXmlDecode(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/<[^>]+>/g, "")
    .trim();
}

function extractTag(xml: string, tag: string): string {
  const cdata = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i"));
  if (cdata) return simpleXmlDecode(cdata[1]);
  const direct = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  if (direct) return simpleXmlDecode(direct[1]);
  return "";
}

function extractLink(itemXml: string): string {
  // Try <link>...</link> first
  const link = itemXml.match(/<link>(https?:\/\/[^\s<]+)<\/link>/);
  if (link) return link[1];
  // Try <link href="..." />
  const href = itemXml.match(/href="(https?:\/\/[^"]+)"/);
  if (href) return href[1];
  return "";
}

function parseRssXml(xml: string, category: NewsCategory): NewsItem[] {
  const items: NewsItem[] = [];
  const itemMatches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)];

  itemMatches.slice(0, 12).forEach((match, idx) => {
    const content = match[1];
    const title = extractTag(content, "title");
    const description = extractTag(content, "description");
    const pubDate = extractTag(content, "pubDate");
    const source = extractTag(content, "source") || extractTag(content, "dc:source") || "외신";
    const link = extractLink(content);

    if (!title) return;

    const relevance = inferRelevance(title + " " + description);

    items.push({
      id: `${category}-${idx}-${Date.now()}`,
      title: title.slice(0, 120),
      summary: description.slice(0, 200) || title,
      source: source || inferSource(link),
      url: link,
      publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      category,
      tags: [],
      relevance,
    });
  });

  return items;
}

function inferSource(url: string): string {
  if (url.includes("reuters")) return "Reuters";
  if (url.includes("bloomberg")) return "Bloomberg";
  if (url.includes("wsj.com")) return "WSJ";
  if (url.includes("ft.com")) return "FT";
  if (url.includes("nytimes")) return "NYT";
  if (url.includes("bbc.")) return "BBC";
  if (url.includes("yonhap")) return "연합뉴스";
  if (url.includes("joins.com") || url.includes("joongang")) return "중앙일보";
  if (url.includes("chosun")) return "조선일보";
  if (url.includes("hani.co.kr")) return "한겨레";
  if (url.includes("mk.co.kr")) return "매일경제";
  if (url.includes("hankyung")) return "한국경제";
  if (url.includes("news.google")) return "Google News";
  return "뉴스";
}

function inferRelevance(text: string): RelevanceTag[] {
  const t = text.toLowerCase();
  const tags: RelevanceTag[] = [];
  if (/gold|금값|금\s*가격|골드/.test(t)) tags.push("금투자");
  if (/silver|은값|은\s*가격/.test(t)) tags.push("은투자");
  if (/dollar|달러|usd/.test(t)) tags.push("달러환율");
  if (/won|원화|원달러|krw/.test(t)) tags.push("원달러");
  if (/kospi|코스피|코스닥/.test(t)) tags.push("코스피");
  if (/nasdaq|나스닥/.test(t)) tags.push("나스닥");
  if (/s&p|s&p500|sp500/.test(t)) tags.push("S&P500");
  if (/oil|crude|wti|brent|유가|원유/.test(t)) tags.push("원유");
  if (/defense|방산|lockheed|raytheon/.test(t)) tags.push("방산주");
  if (/semiconductor|chip|반도체|tsmc|삼성/.test(t)) tags.push("반도체");
  if (/safe haven|안전자산|gold|yen|엔화/.test(t)) tags.push("안전자산");
  if (/inflation|인플레|cpi|pce/.test(t)) tags.push("인플레이션");
  if (/rate|금리|fed|기준금리/.test(t)) tags.push("금리");
  return tags;
}

async function fetchFeed(feed: NewsFeed): Promise<NewsItem[]> {
  const urls = [
    `https://news.google.com/rss/search?q=${encodeURIComponent(feed.query)}&hl=en&gl=US&ceid=US:en`,
    `https://news.google.com/rss/search?q=${encodeURIComponent(feed.koQuery)}&hl=ko&gl=KR&ceid=KR:ko`,
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        next: { revalidate: 300 },
        headers: { "User-Agent": "Mozilla/5.0 GeoInsight/1.0" },
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) continue;
      const xml = await res.text();
      const items = parseRssXml(xml, feed.category);
      if (items.length > 0) return items;
    } catch {
      // try next url
    }
  }
  return [];
}

export async function fetchAllNews(): Promise<NewsItem[]> {
  const results = await Promise.allSettled(NEWS_FEEDS.map(fetchFeed));
  const all: NewsItem[] = [];
  results.forEach((r) => {
    if (r.status === "fulfilled") all.push(...r.value);
  });
  return all.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

export async function fetchNewsByCategory(category: NewsCategory): Promise<NewsItem[]> {
  const feed = NEWS_FEEDS.find((f) => f.category === category);
  if (!feed) return [];
  return fetchFeed(feed);
}
