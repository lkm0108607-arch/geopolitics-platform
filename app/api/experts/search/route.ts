import { NextRequest, NextResponse } from "next/server";
import { Expert } from "@/types";
import { getAllExperts } from "@/data/experts";

/**
 * GET /api/experts/search
 *
 * Query params:
 *   q      - search query (matches name, nameEn, affiliation, domains, country)
 *   domain - filter by exact domain
 *   page   - page number (default 1)
 *   limit  - results per page (default 20, max 100)
 */

const GENERATED_FILE_COUNT = 100;

function matchesQuery(expert: Expert, q: string): boolean {
  return (
    expert.name.toLowerCase().includes(q) ||
    expert.nameEn.toLowerCase().includes(q) ||
    expert.affiliation.toLowerCase().includes(q) ||
    expert.country.toLowerCase().includes(q) ||
    expert.domains.some((d) => d.toLowerCase().includes(q))
  );
}

function matchesDomain(expert: Expert, domain: string): boolean {
  return expert.domains.includes(domain as never);
}

function filterExpert(expert: Expert, q: string | null, domain: string | null): boolean {
  if (domain && !matchesDomain(expert, domain)) return false;
  if (q && !matchesQuery(expert, q)) return false;
  return true;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim().toLowerCase() || null;
  const domain = searchParams.get("domain") || null;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

  const skipCount = (page - 1) * limit;
  const needed = skipCount + limit; // total items we need to collect to fill this page

  const collected: Expert[] = [];
  let totalMatches = 0;

  // --- Phase 1: Search the loaded (~10K) experts first ---
  const loadedExperts = getAllExperts();
  for (const expert of loadedExperts) {
    if (filterExpert(expert, q, domain)) {
      totalMatches++;
      collected.push(expert);
    }
  }

  // --- Phase 2: Lazily import generated files ---
  // If we already have enough results and don't need more for pagination count,
  // we still need to scan remaining files for the total count.
  // Strategy: load files until we have enough results for the current page,
  // then continue scanning remaining files only for counting (skip pushing to collected).

  let hasEnoughResults = collected.length >= needed;

  for (let i = 1; i <= GENERATED_FILE_COUNT; i++) {
    const fileNum = String(i).padStart(3, "0");
    try {
      const mod = await import(`@/data/expertsGen_${fileNum}`);
      const experts: Expert[] = mod[`eg${fileNum}`];
      if (!experts) continue;

      for (const expert of experts) {
        if (filterExpert(expert, q, domain)) {
          totalMatches++;
          if (!hasEnoughResults) {
            collected.push(expert);
            if (collected.length >= needed) {
              hasEnoughResults = true;
            }
          }
        }
      }
    } catch {
      // File doesn't exist or import error - skip
      continue;
    }
  }

  // Sort all collected by credibilityScore descending
  collected.sort((a, b) => b.credibilityScore - a.credibilityScore);

  // Paginate
  const results = collected.slice(skipCount, skipCount + limit);
  const totalPages = Math.ceil(totalMatches / limit);

  return NextResponse.json({
    results,
    total: totalMatches,
    page,
    totalPages,
  });
}
