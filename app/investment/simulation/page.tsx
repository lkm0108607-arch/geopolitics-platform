"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Wallet,
  ShoppingCart,
  BarChart3,
  User,
  Lock,
  LogOut,
  History,
  PieChart,
  RefreshCw,
  ChevronDown,
} from "lucide-react";
import { etfRecommendations, type ETFRecommendation } from "@/data/investmentStrategy";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Holding {
  ticker: string;
  shares: number;
  avgPrice: number;
}

interface Trade {
  ticker: string;
  type: "매수" | "매도";
  shares: number;
  price: number;
  total: number;
  date: string;
}

interface SimUser {
  nickname: string;
  password: string;
  balance: number;
  holdings: Holding[];
  trades: Trade[];
  createdAt: string;
}

interface StockPrice {
  currentPrice: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap: number;
  dayHigh: number;
  dayLow: number;
  name: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = "geo_sim_users";
const SESSION_KEY = "geo_sim_session";

function loadUsers(): Record<string, SimUser> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch { return {}; }
}
function saveUsers(users: Record<string, SimUser>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}
function getSession(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(SESSION_KEY);
}
function setSession(n: string) { sessionStorage.setItem(SESSION_KEY, n); }
function clearSession() { sessionStorage.removeItem(SESSION_KEY); }

function formatKRW(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "0원";
  if (Math.abs(n) >= 100000000) return (n / 100000000).toFixed(1) + "억원";
  if (Math.abs(n) >= 10000) return (n / 10000).toFixed(0) + "만원";
  return n.toLocaleString("ko-KR") + "원";
}
function formatNum(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "0";
  return n.toLocaleString("ko-KR");
}

// ─── Price Detail Panel (replaces TradingView) ──────────────────────────────

function PriceDetailPanel({ ticker, price, etfInfo }: {
  ticker: string;
  price: StockPrice | undefined;
  etfInfo: ETFRecommendation | undefined;
}) {
  if (!etfInfo) return null;

  const currentPrice = price?.currentPrice ?? etfInfo.currentPrice;
  const change = price?.change ?? 0;
  const changePct = price?.changePercent ?? 0;
  const isUp = change >= 0;

  return (
    <div className="h-full flex flex-col">
      {/* Main price display */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <p className="text-slate-500 text-sm mb-2">{etfInfo.nameKr}</p>
        <p className="text-5xl font-bold text-white mb-3">
          {formatNum(currentPrice)}<span className="text-2xl text-slate-400">원</span>
        </p>
        {price && (
          <div className={`flex items-center gap-2 text-lg font-medium ${isUp ? "text-red-400" : "text-blue-400"}`}>
            {isUp ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            <span>{isUp ? "+" : ""}{formatNum(change)}원</span>
            <span className="text-sm">({isUp ? "+" : ""}{changePct?.toFixed(2) ?? "0.00"}%)</span>
          </div>
        )}
      </div>

      {/* Price bar visualization */}
      {price && price.dayLow != null && price.dayHigh != null && price.dayHigh > price.dayLow && (
        <div className="px-6 pb-4">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>저가 {formatNum(price.dayLow)}</span>
            <span>고가 {formatNum(price.dayHigh)}</span>
          </div>
          <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="absolute h-full bg-gradient-to-r from-blue-500 via-slate-400 to-red-500 rounded-full"
              style={{ width: "100%" }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-slate-900 shadow-lg"
              style={{
                left: `${Math.min(Math.max(((currentPrice - price.dayLow) / (price.dayHigh - price.dayLow)) * 100, 0), 100)}%`,
                transform: "translate(-50%, -50%)",
              }}
            />
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-px bg-slate-800 border-t border-slate-800">
        {[
          { label: "전일 종가", value: price ? `${formatNum(price.previousClose)}원` : "-" },
          { label: "거래량", value: price?.volume != null && price.volume > 0 ? formatNum(price.volume) : "-" },
          { label: "리스크", value: etfInfo.riskLevel },
          { label: "기대수익", value: etfInfo.expectedReturn },
          { label: "카테고리", value: etfInfo.category },
          { label: "비중", value: `${etfInfo.currentWeight}%` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-slate-900 px-4 py-3">
            <p className="text-[10px] text-slate-500">{label}</p>
            <p className="text-sm text-white font-medium">{value}</p>
          </div>
        ))}
      </div>

      {/* Timeframes */}
      <div className="border-t border-slate-800 p-4">
        <p className="text-xs text-slate-500 mb-2">기간별 기대수익</p>
        <div className="grid grid-cols-4 gap-2">
          {etfInfo.timeframes.map((tf) => (
            <div key={tf.label} className="bg-slate-800/50 rounded-lg p-2 text-center">
              <p className="text-[10px] text-slate-500">{tf.label}</p>
              <p className="text-xs font-bold text-emerald-400">{tf.expectedReturn}</p>
              <p className="text-[10px] text-red-400/70">{tf.maxRisk}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function SimulationPage() {
  const [hydrated, setHydrated] = useState(false);
  const [users, setUsers] = useState<Record<string, SimUser>>({});
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Selected ETF & chart
  const [selectedETF, setSelectedETF] = useState<string>(etfRecommendations[0]?.ticker || "");
  const [prices, setPrices] = useState<Record<string, StockPrice>>({});
  const [priceLoading, setPriceLoading] = useState(false);

  // Trade state
  const [tradeType, setTradeType] = useState<"매수" | "매도">("매수");
  const [tradeShares, setTradeShares] = useState<string>("");
  const [tradeMsg, setTradeMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Tab
  const [activeTab, setActiveTab] = useState<"chart" | "holdings" | "history">("chart");

  // Mobile ETF dropdown
  const [showETFList, setShowETFList] = useState(false);

  // Hydration guard
  useEffect(() => {
    setHydrated(true);
    const u = loadUsers();
    setUsers(u);
    const s = getSession();
    if (s && u[s]) setCurrentUser(s);
  }, []);

  // Fetch real-time price for selected ETF
  const fetchPrice = useCallback(async (ticker: string) => {
    setPriceLoading(true);
    try {
      const res = await fetch(`/api/stock-price?ticker=${ticker}`);
      if (res.ok) {
        const data = await res.json();
        setPrices((prev) => ({ ...prev, [ticker]: data }));
      }
    } catch { /* ignore */ }
    setPriceLoading(false);
  }, []);

  // Fetch all prices on mount, and selected price on change
  useEffect(() => {
    if (selectedETF) fetchPrice(selectedETF);
  }, [selectedETF, fetchPrice]);

  // Fetch all prices for portfolio calculation
  useEffect(() => {
    if (!currentUser) return;
    const fetchAll = async () => {
      const tickers = [...new Set([
        ...etfRecommendations.map((e) => e.ticker),
      ])];
      for (const t of tickers) {
        try {
          const res = await fetch(`/api/stock-price?ticker=${t}`);
          if (res.ok) {
            const data = await res.json();
            setPrices((prev) => ({ ...prev, [t]: data }));
          }
        } catch { /* ignore */ }
      }
    };
    fetchAll();
  }, [currentUser]);

  const user = currentUser ? users[currentUser] : null;
  const selectedETFInfo = etfRecommendations.find((e) => e.ticker === selectedETF);
  const selectedPrice = prices[selectedETF];

  // Get price for trading (real if available, fallback to static)
  function getTradePrice(ticker: string): number {
    return prices[ticker]?.currentPrice || etfRecommendations.find((e) => e.ticker === ticker)?.currentPrice || 0;
  }

  // Portfolio calculations
  const totalHoldingsValue = user
    ? user.holdings.reduce((sum, h) => sum + h.shares * getTradePrice(h.ticker), 0)
    : 0;
  const totalAssets = user ? user.balance + totalHoldingsValue : 0;
  const totalPnL = user ? totalAssets - 10000000 : 0;
  const totalPnLPct = ((totalAssets / 10000000 - 1) * 100).toFixed(2);

  // ─── Auth ──────────────────────────────────────────────────────────────────

  function handleRegister() {
    if (!nickname.trim() || nickname.trim().length < 2) { setError("닉네임은 2자 이상이어야 합니다."); return; }
    if (!password.trim() || password.trim().length < 4) { setError("비밀번호는 4자 이상이어야 합니다."); return; }
    const u = loadUsers();
    if (u[nickname.trim()]) { setError("이미 사용 중인 닉네임입니다."); return; }
    const newUser: SimUser = {
      nickname: nickname.trim(), password: password.trim(),
      balance: 10000000, holdings: [], trades: [],
      createdAt: new Date().toISOString().split("T")[0],
    };
    u[nickname.trim()] = newUser;
    saveUsers(u); setUsers(u);
    setCurrentUser(nickname.trim()); setSession(nickname.trim());
    setError(""); setNickname(""); setPassword("");
  }

  function handleLogin() {
    if (!nickname.trim() || !password.trim()) { setError("닉네임과 비밀번호를 입력해주세요."); return; }
    const u = loadUsers();
    const found = u[nickname.trim()];
    if (!found) { setError("등록되지 않은 닉네임입니다."); return; }
    if (found.password !== password.trim()) { setError("비밀번호가 일치하지 않습니다."); return; }
    setUsers(u); setCurrentUser(nickname.trim()); setSession(nickname.trim());
    setError(""); setNickname(""); setPassword("");
  }

  // ─── Trade ─────────────────────────────────────────────────────────────────

  function handleTrade() {
    if (!user || !currentUser || !selectedETF) return;
    const shares = parseInt(tradeShares);
    if (!shares || shares <= 0) { setTradeMsg({ type: "error", text: "수량을 올바르게 입력해주세요." }); return; }

    const price = getTradePrice(selectedETF);
    if (!price) { setTradeMsg({ type: "error", text: "가격 정보를 불러올 수 없습니다." }); return; }
    const totalCost = price * shares;
    const u = loadUsers();
    const userData = u[currentUser];
    if (!userData) return;

    if (tradeType === "매수") {
      if (totalCost > userData.balance) {
        setTradeMsg({ type: "error", text: `잔액 부족. 필요: ${formatNum(totalCost)}원` }); return;
      }
      userData.balance -= totalCost;
      const existing = userData.holdings.find((h) => h.ticker === selectedETF);
      if (existing) {
        const newTotal = existing.shares * existing.avgPrice + totalCost;
        existing.shares += shares;
        existing.avgPrice = Math.round(newTotal / existing.shares);
      } else {
        userData.holdings.push({ ticker: selectedETF, shares, avgPrice: price });
      }
      userData.trades.unshift({ ticker: selectedETF, type: "매수", shares, price, total: totalCost, date: new Date().toLocaleString("ko-KR") });
      setTradeMsg({ type: "success", text: `${selectedETFInfo?.nameKr} ${shares}주 매수 완료!` });
    } else {
      const existing = userData.holdings.find((h) => h.ticker === selectedETF);
      if (!existing || existing.shares < shares) {
        setTradeMsg({ type: "error", text: `보유 수량 부족 (보유: ${existing?.shares || 0}주)` }); return;
      }
      userData.balance += totalCost;
      existing.shares -= shares;
      if (existing.shares === 0) userData.holdings = userData.holdings.filter((h) => h.ticker !== selectedETF);
      userData.trades.unshift({ ticker: selectedETF, type: "매도", shares, price, total: totalCost, date: new Date().toLocaleString("ko-KR") });
      setTradeMsg({ type: "success", text: `${selectedETFInfo?.nameKr} ${shares}주 매도 완료!` });
    }
    saveUsers(u); setUsers({ ...u }); setTradeShares("");
  }

  // Quick buy amounts
  function setSharesByAmount(amount: number) {
    const price = getTradePrice(selectedETF);
    if (price > 0) setTradeShares(String(Math.floor(amount / price)));
  }

  // ─── Loading Screen ─────────────────────────────────────────────────────────

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Wallet className="w-12 h-12 text-emerald-400 mx-auto mb-3 animate-pulse" />
          <p className="text-slate-400 text-sm">로딩 중...</p>
        </div>
      </div>
    );
  }

  // ─── Login Screen ──────────────────────────────────────────────────────────

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-20">
        <Link href="/investment" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> 투자전략으로 돌아가기
        </Link>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-emerald-600/20 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">ETF 모의투자</h1>
              <p className="text-xs text-slate-400">실시간 차트 · 추천 ETF 매매</p>
            </div>
          </div>
          <div className="flex mb-6 bg-slate-800 rounded-lg p-1">
            <button onClick={() => { setMode("login"); setError(""); }} className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${mode === "login" ? "bg-blue-600 text-white" : "text-slate-400"}`}>로그인</button>
            <button onClick={() => { setMode("register"); setError(""); }} className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${mode === "register" ? "bg-emerald-600 text-white" : "text-slate-400"}`}>회원가입</button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5"><User className="w-3 h-3 inline mr-1" />닉네임</label>
              <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="닉네임" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" onKeyDown={(e) => e.key === "Enter" && (mode === "login" ? handleLogin() : handleRegister())} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5"><Lock className="w-3 h-3 inline mr-1" />개인식별비밀번호</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" onKeyDown={(e) => e.key === "Enter" && (mode === "login" ? handleLogin() : handleRegister())} />
            </div>
            {error && <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">{error}</p>}
            <button onClick={mode === "login" ? handleLogin : handleRegister} className={`w-full py-3 rounded-lg text-sm font-bold transition-colors ${mode === "login" ? "bg-blue-600 hover:bg-blue-500 text-white" : "bg-emerald-600 hover:bg-emerald-500 text-white"}`}>
              {mode === "login" ? "로그인" : "회원가입 (1,000만원 지급)"}
            </button>
          </div>
          {mode === "register" && (
            <div className="mt-4 bg-emerald-900/15 border border-emerald-800/25 rounded-lg p-3">
              <p className="text-xs text-emerald-300 leading-relaxed">회원가입 시 <strong>1,000만원</strong> 모의투자 자금이 지급됩니다. 추천 ETF 18종에 한정하여 투자할 수 있습니다.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Dashboard ─────────────────────────────────────────────────────────────

  const currentPrice = getTradePrice(selectedETF);
  const holding = user?.holdings.find((h) => h.ticker === selectedETF);

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/investment" className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-400" />
            모의투자
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {/* Portfolio Summary Badges */}
          <div className="hidden md:flex items-center gap-2">
            <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700">
              총자산 <strong className="text-white">{formatKRW(totalAssets)}</strong>
            </span>
            <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700">
              현금 <strong className="text-blue-400">{formatKRW(user?.balance || 0)}</strong>
            </span>
            <span className={`text-xs px-3 py-1.5 rounded-lg border ${totalPnL >= 0 ? "bg-red-900/20 text-red-300 border-red-800/30" : "bg-blue-900/20 text-blue-300 border-blue-800/30"}`}>
              수익 <strong>{totalPnL >= 0 ? "+" : ""}{formatKRW(totalPnL)} ({totalPnL >= 0 ? "+" : ""}{totalPnLPct}%)</strong>
            </span>
          </div>
          <span className="text-sm text-slate-300 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
            <User className="w-3 h-3 inline mr-1 text-blue-400" />{user?.nickname}
          </span>
          <button onClick={() => { setCurrentUser(null); clearSession(); }} className="text-slate-400 hover:text-white transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Summary */}
      <div className="md:hidden grid grid-cols-3 gap-2 mb-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-center">
          <p className="text-[10px] text-slate-500">총자산</p>
          <p className="text-sm font-bold text-white">{formatKRW(totalAssets)}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-center">
          <p className="text-[10px] text-slate-500">현금</p>
          <p className="text-sm font-bold text-blue-400">{formatKRW(user?.balance || 0)}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-center">
          <p className="text-[10px] text-slate-500">수익률</p>
          <p className={`text-sm font-bold ${totalPnL >= 0 ? "text-red-400" : "text-blue-400"}`}>
            {totalPnL >= 0 ? "+" : ""}{totalPnLPct}%
          </p>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-1 mb-4 bg-slate-900 border border-slate-800 rounded-lg p-1 w-fit">
        {([
          { key: "chart" as const, label: "차트/매매", icon: BarChart3 },
          { key: "holdings" as const, label: "보유종목", icon: PieChart },
          { key: "history" as const, label: "거래내역", icon: History },
        ]).map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)} className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === key ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* ── Chart & Trade Tab ── */}
      {activeTab === "chart" && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Left: ETF List */}
          <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            {/* Mobile dropdown toggle */}
            <button
              className="lg:hidden w-full flex items-center justify-between p-3 text-sm font-medium text-white"
              onClick={() => setShowETFList(!showETFList)}
            >
              <span>{selectedETFInfo?.nameKr || "종목 선택"}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showETFList ? "rotate-180" : ""}`} />
            </button>

            <div className={`${showETFList ? "block" : "hidden"} lg:block max-h-[600px] overflow-y-auto`}>
              <div className="p-2 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
                <p className="text-xs text-slate-500 px-2">투자 가능 종목 ({etfRecommendations.length})</p>
              </div>
              {etfRecommendations.map((etf) => {
                const p = prices[etf.ticker];
                const isSelected = selectedETF === etf.ticker;
                const held = user?.holdings.find((h) => h.ticker === etf.ticker);
                return (
                  <button
                    key={etf.ticker}
                    onClick={() => { setSelectedETF(etf.ticker); setShowETFList(false); setTradeMsg(null); }}
                    className={`w-full text-left px-3 py-2.5 border-b border-slate-800/50 transition-colors ${isSelected ? "bg-blue-600/15 border-l-2 border-l-blue-500" : "hover:bg-slate-800/50 border-l-2 border-l-transparent"}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${isSelected ? "text-blue-300" : "text-white"}`}>
                          {etf.nameKr}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-500 font-mono">{etf.ticker}</span>
                          <span className={`text-[10px] px-1.5 py-0 rounded ${
                            etf.category === "방어형" ? "text-blue-400 bg-blue-900/30" : etf.category === "공격형" ? "text-red-400 bg-red-900/30" : "text-amber-400 bg-amber-900/30"
                          }`}>{etf.category}</span>
                          {held && <span className="text-[10px] text-emerald-400">{held.shares}주</span>}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        {p ? (
                          <>
                            <p className="text-sm font-medium text-white">{formatNum(p.currentPrice)}</p>
                            <p className={`text-[10px] ${(p.change ?? 0) >= 0 ? "text-red-400" : "text-blue-400"}`}>
                              {(p.change ?? 0) >= 0 ? "+" : ""}{p.changePercent?.toFixed(2) ?? "0.00"}%
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-slate-500">{formatNum(etf.currentPrice)}</p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Center: Chart */}
          <div className="lg:col-span-2 space-y-4">
            {/* Price Header */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h2 className="text-lg font-bold text-white">{selectedETFInfo?.nameKr}</h2>
                  <p className="text-xs text-slate-500">{selectedETFInfo?.name} · {selectedETF}</p>
                </div>
                <button onClick={() => fetchPrice(selectedETF)} className="text-slate-500 hover:text-white transition-colors p-1">
                  <RefreshCw className={`w-4 h-4 ${priceLoading ? "animate-spin" : ""}`} />
                </button>
              </div>
              <div className="flex items-end gap-3">
                <span className="text-3xl font-bold text-white">
                  {formatNum(selectedPrice?.currentPrice || currentPrice)}원
                </span>
                {selectedPrice && (
                  <div className={`flex items-center gap-1 pb-1 ${(selectedPrice.change ?? 0) >= 0 ? "text-red-400" : "text-blue-400"}`}>
                    {(selectedPrice.change ?? 0) >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    <span className="text-sm font-medium">
                      {(selectedPrice.change ?? 0) >= 0 ? "+" : ""}{selectedPrice.changePercent?.toFixed(2) ?? "0.00"}%
                    </span>
                    <span className="text-sm">
                      ({(selectedPrice.change ?? 0) >= 0 ? "+" : ""}{formatNum(selectedPrice.change)})
                    </span>
                  </div>
                )}
              </div>
              {selectedPrice && (
                <div className="flex gap-4 mt-2 text-xs text-slate-500">
                  {selectedPrice.volume != null && selectedPrice.volume > 0 && <span>거래량 {formatNum(selectedPrice.volume)}</span>}
                  {selectedPrice.dayHigh != null && selectedPrice.dayHigh > 0 && <span>고가 {formatNum(selectedPrice.dayHigh)}원</span>}
                  {selectedPrice.dayLow != null && selectedPrice.dayLow > 0 && <span>저가 {formatNum(selectedPrice.dayLow)}원</span>}
                  {selectedPrice.marketCap != null && selectedPrice.marketCap > 0 && <span>시총 {formatKRW(selectedPrice.marketCap)}</span>}
                </div>
              )}
            </div>

            {/* Price Detail Panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden" style={{ minHeight: "400px" }}>
              <PriceDetailPanel ticker={selectedETF} price={selectedPrice} etfInfo={selectedETFInfo} />
            </div>
          </div>

          {/* Right: Trade Panel */}
          <div className="lg:col-span-1 space-y-4">
            {/* Trade Form */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-emerald-400" />
                주문
              </h3>

              {/* Buy/Sell Toggle */}
              <div className="flex mb-3 bg-slate-800 rounded-lg p-0.5">
                <button onClick={() => setTradeType("매수")} className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${tradeType === "매수" ? "bg-red-600 text-white" : "text-slate-400"}`}>매수</button>
                <button onClick={() => setTradeType("매도")} className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${tradeType === "매도" ? "bg-blue-600 text-white" : "text-slate-400"}`}>매도</button>
              </div>

              {/* Current Price */}
              <div className="bg-slate-800/60 rounded-lg p-3 mb-3">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>현재가</span>
                  <span className="text-white font-bold">{formatNum(currentPrice)}원</span>
                </div>
                {holding && (
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>보유 수량</span>
                    <span className="text-emerald-400 font-medium">{holding.shares}주</span>
                  </div>
                )}
              </div>

              {/* Shares */}
              <div className="mb-3">
                <label className="block text-xs text-slate-400 mb-1">수량 (주)</label>
                <input
                  type="number" min="1" value={tradeShares}
                  onChange={(e) => setTradeShares(e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Quick Amount Buttons */}
              {tradeType === "매수" && (
                <div className="flex gap-1.5 mb-3">
                  {[
                    { label: "10%", pct: 0.1 },
                    { label: "25%", pct: 0.25 },
                    { label: "50%", pct: 0.5 },
                    { label: "전액", pct: 1 },
                  ].map(({ label, pct }) => (
                    <button key={label} onClick={() => setSharesByAmount((user?.balance || 0) * pct)}
                      className="flex-1 text-[10px] py-1.5 rounded bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition-colors"
                    >{label}</button>
                  ))}
                </div>
              )}
              {tradeType === "매도" && holding && (
                <div className="flex gap-1.5 mb-3">
                  {[
                    { label: "25%", pct: 0.25 },
                    { label: "50%", pct: 0.5 },
                    { label: "75%", pct: 0.75 },
                    { label: "전량", pct: 1 },
                  ].map(({ label, pct }) => (
                    <button key={label} onClick={() => setTradeShares(String(Math.floor(holding.shares * pct)))}
                      className="flex-1 text-[10px] py-1.5 rounded bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition-colors"
                    >{label}</button>
                  ))}
                </div>
              )}

              {/* Total Preview */}
              {tradeShares && parseInt(tradeShares) > 0 && (
                <div className="bg-slate-800/40 rounded-lg p-3 mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-400">예상 {tradeType} 금액</span>
                    <span className="text-white font-bold">{formatNum(currentPrice * parseInt(tradeShares))}원</span>
                  </div>
                  {tradeType === "매수" && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">잔액 후</span>
                      <span className="text-slate-400">{formatNum((user?.balance || 0) - currentPrice * parseInt(tradeShares))}원</span>
                    </div>
                  )}
                </div>
              )}

              {/* Message */}
              {tradeMsg && (
                <div className={`rounded-lg px-3 py-2 mb-3 text-xs ${tradeMsg.type === "success" ? "bg-emerald-900/20 border border-emerald-800/30 text-emerald-300" : "bg-red-900/20 border border-red-800/30 text-red-300"}`}>
                  {tradeMsg.text}
                </div>
              )}

              <button
                onClick={handleTrade}
                disabled={!tradeShares || parseInt(tradeShares) <= 0}
                className={`w-full py-3 rounded-lg text-sm font-bold transition-colors disabled:opacity-30 ${tradeType === "매수" ? "bg-red-600 hover:bg-red-500 text-white" : "bg-blue-600 hover:bg-blue-500 text-white"}`}
              >
                {tradeType} 주문
              </button>

              <p className="text-[10px] text-slate-600 mt-2 text-center">
                잔액 {formatNum(user?.balance || 0)}원
              </p>
            </div>

            {/* Quick Holdings */}
            {user && user.holdings.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <h3 className="text-sm font-bold text-white mb-3">보유 요약</h3>
                <div className="space-y-2">
                  {user.holdings.map((h) => {
                    const etf = etfRecommendations.find((e) => e.ticker === h.ticker);
                    const p = getTradePrice(h.ticker);
                    const pnl = (p - h.avgPrice) * h.shares;
                    return (
                      <button
                        key={h.ticker}
                        onClick={() => setSelectedETF(h.ticker)}
                        className={`w-full text-left bg-slate-800/40 rounded-lg p-2.5 hover:bg-slate-800/60 transition-colors ${selectedETF === h.ticker ? "ring-1 ring-blue-500/30" : ""}`}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-xs font-medium text-white">{etf?.nameKr}</p>
                            <p className="text-[10px] text-slate-500">{h.shares}주 · 평단 {formatNum(h.avgPrice)}원</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-white">{formatNum(h.shares * p)}원</p>
                            <p className={`text-[10px] font-medium ${pnl >= 0 ? "text-red-400" : "text-blue-400"}`}>
                              {pnl >= 0 ? "+" : ""}{formatNum(pnl)}원
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Holdings Tab ── */}
      {activeTab === "holdings" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-purple-400" /> 보유종목 현황
          </h2>
          {user?.holdings.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500">보유 중인 종목이 없습니다.</p>
              <p className="text-xs text-slate-600 mt-1">차트/매매 탭에서 ETF를 매수해보세요.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {user?.holdings.map((h) => {
                const etf = etfRecommendations.find((e) => e.ticker === h.ticker);
                const price = getTradePrice(h.ticker);
                const currentValue = h.shares * price;
                const investedValue = h.shares * h.avgPrice;
                const pnl = currentValue - investedValue;
                const pnlPct = investedValue > 0 ? ((pnl / investedValue) * 100).toFixed(2) : "0";
                const sp = prices[h.ticker];

                return (
                  <div key={h.ticker} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-sm font-bold text-white">{etf?.nameKr}</h3>
                        <p className="text-xs text-slate-500">{etf?.name} · {h.ticker}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-white">{formatNum(currentValue)}원</p>
                        <p className={`text-xs font-medium ${pnl >= 0 ? "text-red-400" : "text-blue-400"}`}>
                          {pnl >= 0 ? "+" : ""}{formatNum(pnl)}원 ({pnl >= 0 ? "+" : ""}{pnlPct}%)
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-3 text-xs">
                      <div><p className="text-slate-500">보유</p><p className="text-white font-medium">{h.shares}주</p></div>
                      <div><p className="text-slate-500">평균 매수가</p><p className="text-white font-medium">{formatNum(h.avgPrice)}원</p></div>
                      <div><p className="text-slate-500">현재가</p><p className="text-white font-medium">{formatNum(price)}원</p></div>
                      <div><p className="text-slate-500">투자 원금</p><p className="text-white font-medium">{formatNum(investedValue)}원</p></div>
                    </div>
                    {sp && (
                      <div className="mt-2 flex gap-3 text-[10px] text-slate-500">
                        <span>등락 {(sp.change ?? 0) >= 0 ? "+" : ""}{sp.changePercent?.toFixed(2) ?? "0.00"}%</span>
                        {sp.volume > 0 && <span>거래량 {formatNum(sp.volume)}</span>}
                      </div>
                    )}
                    {totalHoldingsValue > 0 && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] text-slate-500">비중</span>
                          <span className="text-[10px] text-slate-400 font-medium">{((currentValue / totalAssets) * 100)?.toFixed(1) ?? "0.0"}%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-1.5">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min((currentValue / totalAssets) * 100, 100)}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Composition Bar */}
              <div className="bg-slate-800/30 rounded-xl p-4">
                <h3 className="text-sm font-bold text-white mb-3">포트폴리오 구성</h3>
                <div className="flex items-center gap-1 mb-2 h-5 rounded-full overflow-hidden bg-slate-700">
                  <div className="bg-slate-500 h-full" style={{ width: `${(user?.balance || 0) / totalAssets * 100}%` }} />
                  {user?.holdings.map((h) => {
                    const val = h.shares * getTradePrice(h.ticker);
                    const cat = etfRecommendations.find((e) => e.ticker === h.ticker)?.category;
                    const color = cat === "방어형" ? "bg-cyan-500" : cat === "공격형" ? "bg-red-500" : "bg-amber-500";
                    return <div key={h.ticker} className={`${color} h-full`} style={{ width: `${val / totalAssets * 100}%` }} />;
                  })}
                </div>
                <div className="flex flex-wrap gap-3 text-[10px]">
                  <span className="flex items-center gap-1 text-slate-400"><span className="w-2 h-2 rounded-full bg-slate-500" /> 현금 {((user?.balance || 0) / totalAssets * 100)?.toFixed(1) ?? "0.0"}%</span>
                  <span className="flex items-center gap-1 text-slate-400"><span className="w-2 h-2 rounded-full bg-cyan-500" /> 방어형</span>
                  <span className="flex items-center gap-1 text-slate-400"><span className="w-2 h-2 rounded-full bg-red-500" /> 공격형</span>
                  <span className="flex items-center gap-1 text-slate-400"><span className="w-2 h-2 rounded-full bg-amber-500" /> 헤지형</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── History Tab ── */}
      {activeTab === "history" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <History className="w-5 h-5 text-yellow-400" /> 거래내역
          </h2>
          {user?.trades.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500">거래 내역이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {user?.trades.map((trade, idx) => {
                const etf = etfRecommendations.find((e) => e.ticker === trade.ticker);
                return (
                  <div key={idx} className="flex items-center justify-between bg-slate-800/40 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-1 rounded font-bold ${trade.type === "매수" ? "bg-red-600/20 text-red-300 border border-red-500/30" : "bg-blue-600/20 text-blue-300 border border-blue-500/30"}`}>{trade.type}</span>
                      <div>
                        <p className="text-sm font-medium text-white">{etf?.nameKr || trade.ticker}</p>
                        <p className="text-[10px] text-slate-500">{trade.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-white">{trade.shares}주 x {formatNum(trade.price)}원</p>
                      <p className={`text-xs font-medium ${trade.type === "매수" ? "text-red-400" : "text-blue-400"}`}>
                        {trade.type === "매수" ? "-" : "+"}{formatNum(trade.total)}원
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
