import { NextRequest, NextResponse } from "next/server";
import Redis from "ioredis";

// ─── Types ──────────────────────────────────────────────────────────────────

interface LeaderboardEntry {
  nickname: string;
  totalAssets: number;
  totalPnL: number;
  totalPnLPct: number;
  holdingsCount: number;
  tradeCount: number;
  topHolding: string | null;
  updatedAt: string;
}

// ─── Redis Connection ───────────────────────────────────────────────────────

const REDIS_KEY = "leaderboard";

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.REDIS_URL;
  if (!url) return null;
  redis = new Redis(url, { maxRetriesPerRequest: 2, lazyConnect: true });
  return redis;
}

// In-memory fallback
const memoryStore: Map<string, LeaderboardEntry> = new Map();

// ─── GET: Fetch leaderboard ─────────────────────────────────────────────────

export async function GET() {
  try {
    const r = getRedis();
    let entries: LeaderboardEntry[];
    let persistent = false;

    if (r) {
      try {
        const data = await r.hgetall(REDIS_KEY);
        entries = Object.values(data).map((v) => JSON.parse(v as string));
        persistent = true;
      } catch {
        entries = Array.from(memoryStore.values());
      }
    } else {
      entries = Array.from(memoryStore.values());
    }

    entries.sort((a, b) => b.totalPnLPct - a.totalPnLPct);

    return NextResponse.json(
      { entries, persistent },
      {
        headers: {
          "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── DELETE: Clear all leaderboard entries ───────────────────────────────

export async function DELETE() {
  try {
    const r = getRedis();
    if (r) {
      try { await r.del(REDIS_KEY); } catch { /* ignore */ }
    }
    memoryStore.clear();
    return NextResponse.json({ success: true, message: "리더보드가 초기화되었습니다." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── POST: Submit/update user's ranking ─────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nickname, totalAssets, totalPnL, totalPnLPct, holdingsCount, tradeCount, topHolding } = body;

    if (!nickname || typeof nickname !== "string") {
      return NextResponse.json({ error: "닉네임이 필요합니다." }, { status: 400 });
    }
    if (typeof totalAssets !== "number" || typeof totalPnL !== "number") {
      return NextResponse.json({ error: "잘못된 데이터입니다." }, { status: 400 });
    }

    const entry: LeaderboardEntry = {
      nickname: nickname.slice(0, 20),
      totalAssets: Math.round(totalAssets),
      totalPnL: Math.round(totalPnL),
      totalPnLPct: parseFloat((totalPnLPct ?? 0).toFixed(2)),
      holdingsCount: holdingsCount ?? 0,
      tradeCount: tradeCount ?? 0,
      topHolding: topHolding ?? null,
      updatedAt: new Date().toISOString(),
    };

    const r = getRedis();
    let persistent = false;

    if (r) {
      try {
        await r.hset(REDIS_KEY, nickname, JSON.stringify(entry));
        persistent = true;
      } catch {
        memoryStore.set(nickname, entry);
      }
    } else {
      memoryStore.set(nickname, entry);
    }

    return NextResponse.json({ success: true, entry, persistent });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
