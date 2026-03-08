"use client";

import { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";
import { etfRecommendations } from "@/data/investmentStrategy";

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = "geo_sim_users";
const SESSION_KEY = "geo_sim_session";

function loadUsers(): Record<string, SimUser> {
  if (typeof window === "undefined") return {};
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function saveUsers(users: Record<string, SimUser>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

function getSession(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(SESSION_KEY);
}

function setSession(nickname: string) {
  sessionStorage.setItem(SESSION_KEY, nickname);
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

function formatKRW(n: number): string {
  return n.toLocaleString("ko-KR") + "원";
}

function getSimPrice(basePrice: number, ticker: string): number {
  // Simulate small price fluctuation based on ticker hash + time
  const seed = ticker.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const hour = new Date().getHours();
  const fluctuation = ((seed * 7 + hour * 13) % 100 - 50) / 1000; // ±5%
  return Math.round(basePrice * (1 + fluctuation));
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SimulationPage() {
  const [users, setUsers] = useState<Record<string, SimUser>>({});
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Trade state
  const [selectedETF, setSelectedETF] = useState<string>("");
  const [tradeType, setTradeType] = useState<"매수" | "매도">("매수");
  const [tradeShares, setTradeShares] = useState<string>("");
  const [tradeMsg, setTradeMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<"trade" | "holdings" | "history">("trade");

  // Load from localStorage on mount
  useEffect(() => {
    const u = loadUsers();
    setUsers(u);
    const session = getSession();
    if (session && u[session]) {
      setCurrentUser(session);
    }
  }, []);

  const user = currentUser ? users[currentUser] : null;

  // ETF prices with simulated fluctuation
  const etfPrices = useMemo(() => {
    const map: Record<string, number> = {};
    etfRecommendations.forEach((etf) => {
      map[etf.ticker] = getSimPrice(etf.currentPrice, etf.ticker);
    });
    return map;
  }, []);

  // Portfolio calculations
  const totalHoldingsValue = user
    ? user.holdings.reduce((sum, h) => sum + h.shares * (etfPrices[h.ticker] || 0), 0)
    : 0;
  const totalAssets = user ? user.balance + totalHoldingsValue : 0;
  const totalPnL = user ? totalAssets - 10000000 : 0;
  const totalPnLPct = user ? ((totalAssets / 10000000 - 1) * 100).toFixed(2) : "0";

  // ─── Auth handlers ─────────────────────────────────────────────────────────

  function handleRegister() {
    if (!nickname.trim()) { setError("닉네임을 입력해주세요."); return; }
    if (nickname.trim().length < 2) { setError("닉네임은 2자 이상이어야 합니다."); return; }
    if (!password.trim()) { setError("개인식별비밀번호를 입력해주세요."); return; }
    if (password.trim().length < 4) { setError("비밀번호는 4자 이상이어야 합니다."); return; }

    const u = loadUsers();
    if (u[nickname.trim()]) {
      setError("이미 사용 중인 닉네임입니다.");
      return;
    }

    const newUser: SimUser = {
      nickname: nickname.trim(),
      password: password.trim(),
      balance: 10000000,
      holdings: [],
      trades: [],
      createdAt: new Date().toISOString().split("T")[0],
    };

    u[nickname.trim()] = newUser;
    saveUsers(u);
    setUsers(u);
    setCurrentUser(nickname.trim());
    setSession(nickname.trim());
    setError("");
    setNickname("");
    setPassword("");
  }

  function handleLogin() {
    if (!nickname.trim() || !password.trim()) {
      setError("닉네임과 비밀번호를 모두 입력해주세요.");
      return;
    }
    const u = loadUsers();
    const found = u[nickname.trim()];
    if (!found) {
      setError("등록되지 않은 닉네임입니다. 회원가입을 해주세요.");
      return;
    }
    if (found.password !== password.trim()) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    setUsers(u);
    setCurrentUser(nickname.trim());
    setSession(nickname.trim());
    setError("");
    setNickname("");
    setPassword("");
  }

  function handleLogout() {
    setCurrentUser(null);
    clearSession();
  }

  // ─── Trade handler ─────────────────────────────────────────────────────────

  function handleTrade() {
    if (!user || !currentUser) return;
    if (!selectedETF) { setTradeMsg({ type: "error", text: "ETF를 선택해주세요." }); return; }

    const shares = parseInt(tradeShares);
    if (!shares || shares <= 0) { setTradeMsg({ type: "error", text: "수량을 올바르게 입력해주세요." }); return; }

    const price = etfPrices[selectedETF] || 0;
    if (!price) { setTradeMsg({ type: "error", text: "가격 정보를 불러올 수 없습니다." }); return; }

    const totalCost = price * shares;
    const u = loadUsers();
    const userData = u[currentUser];
    if (!userData) return;

    if (tradeType === "매수") {
      if (totalCost > userData.balance) {
        setTradeMsg({ type: "error", text: `잔액이 부족합니다. 필요: ${formatKRW(totalCost)}, 잔액: ${formatKRW(userData.balance)}` });
        return;
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

      userData.trades.unshift({
        ticker: selectedETF,
        type: "매수",
        shares,
        price,
        total: totalCost,
        date: new Date().toLocaleString("ko-KR"),
      });

      const etfInfo = etfRecommendations.find((e) => e.ticker === selectedETF);
      setTradeMsg({ type: "success", text: `${etfInfo?.nameKr || selectedETF} ${shares}주 매수 완료! (${formatKRW(totalCost)})` });
    } else {
      // 매도
      const existing = userData.holdings.find((h) => h.ticker === selectedETF);
      if (!existing || existing.shares < shares) {
        setTradeMsg({ type: "error", text: `보유 수량이 부족합니다. 보유: ${existing?.shares || 0}주` });
        return;
      }

      userData.balance += totalCost;
      existing.shares -= shares;
      if (existing.shares === 0) {
        userData.holdings = userData.holdings.filter((h) => h.ticker !== selectedETF);
      }

      userData.trades.unshift({
        ticker: selectedETF,
        type: "매도",
        shares,
        price,
        total: totalCost,
        date: new Date().toLocaleString("ko-KR"),
      });

      const etfInfo = etfRecommendations.find((e) => e.ticker === selectedETF);
      setTradeMsg({ type: "success", text: `${etfInfo?.nameKr || selectedETF} ${shares}주 매도 완료! (${formatKRW(totalCost)})` });
    }

    saveUsers(u);
    setUsers({ ...u });
    setTradeShares("");
  }

  // ─── Login / Register Screen ───────────────────────────────────────────────

  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto px-4 py-20">
        <Link
          href="/investment"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          투자전략으로 돌아가기
        </Link>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-emerald-600/20 flex items-center justify-center">
              <Wallet className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">ETF 모의투자</h1>
              <p className="text-xs text-slate-400">추천 ETF로 가상 투자를 체험하세요</p>
            </div>
          </div>

          {/* Toggle */}
          <div className="flex mb-6 bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => { setMode("login"); setError(""); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                mode === "login" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              로그인
            </button>
            <button
              onClick={() => { setMode("register"); setError(""); }}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                mode === "register" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              회원가입
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                <User className="w-3 h-3 inline mr-1" />
                닉네임
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="닉네임을 입력하세요"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                onKeyDown={(e) => e.key === "Enter" && (mode === "login" ? handleLogin() : handleRegister())}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                <Lock className="w-3 h-3 inline mr-1" />
                개인식별비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                onKeyDown={(e) => e.key === "Enter" && (mode === "login" ? handleLogin() : handleRegister())}
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              onClick={mode === "login" ? handleLogin : handleRegister}
              className={`w-full py-3 rounded-lg text-sm font-bold transition-colors ${
                mode === "login"
                  ? "bg-blue-600 hover:bg-blue-500 text-white"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white"
              }`}
            >
              {mode === "login" ? "로그인" : "회원가입 (1,000만원 지급)"}
            </button>
          </div>

          {mode === "register" && (
            <div className="mt-4 bg-emerald-900/15 border border-emerald-800/25 rounded-lg p-3">
              <p className="text-xs text-emerald-300 leading-relaxed">
                회원가입 시 <strong>1,000만원</strong>의 모의투자 자금이 자동 지급됩니다.
                사이트에서 추천하는 국내 상장 ETF에 한정하여 투자할 수 있습니다.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Main Dashboard ────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/investment"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            투자전략
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <Wallet className="w-5 h-5 text-emerald-400" />
              ETF 모의투자
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-300 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
            <User className="w-3 h-3 inline mr-1 text-blue-400" />
            {user?.nickname}
          </span>
          <button
            onClick={handleLogout}
            className="text-sm text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            로그아웃
          </button>
        </div>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">총 자산</p>
          <p className="text-xl font-bold text-white">{formatKRW(totalAssets)}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">보유 현금</p>
          <p className="text-xl font-bold text-blue-400">{formatKRW(user?.balance || 0)}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">투자 평가액</p>
          <p className="text-xl font-bold text-emerald-400">{formatKRW(totalHoldingsValue)}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">총 수익률</p>
          <p className={`text-xl font-bold ${totalPnL >= 0 ? "text-red-400" : "text-blue-400"}`}>
            {totalPnL >= 0 ? "+" : ""}{formatKRW(totalPnL)}
            <span className="text-sm ml-1">({totalPnL >= 0 ? "+" : ""}{totalPnLPct}%)</span>
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-900 border border-slate-800 rounded-lg p-1 w-fit">
        {([
          { key: "trade" as const, label: "매매하기", icon: ShoppingCart },
          { key: "holdings" as const, label: "보유종목", icon: PieChart },
          { key: "history" as const, label: "거래내역", icon: History },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === key
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Trade Tab ── */}
      {activeTab === "trade" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trade Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-emerald-400" />
              주문
            </h2>

            {/* Buy/Sell Toggle */}
            <div className="flex mb-4 bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => setTradeType("매수")}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                  tradeType === "매수" ? "bg-red-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                매수
              </button>
              <button
                onClick={() => setTradeType("매도")}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                  tradeType === "매도" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                매도
              </button>
            </div>

            {/* ETF Select */}
            <div className="mb-4">
              <label className="block text-xs text-slate-400 mb-1.5">종목 선택</label>
              <select
                value={selectedETF}
                onChange={(e) => setSelectedETF(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">ETF를 선택하세요</option>
                {etfRecommendations.map((etf) => (
                  <option key={etf.ticker} value={etf.ticker}>
                    {etf.nameKr} ({etf.ticker})
                  </option>
                ))}
              </select>
            </div>

            {/* Selected ETF Info */}
            {selectedETF && (
              <div className="bg-slate-800/60 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-white">
                    {etfRecommendations.find((e) => e.ticker === selectedETF)?.nameKr}
                  </span>
                  <span className="text-sm font-bold text-emerald-400">
                    {formatKRW(etfPrices[selectedETF] || 0)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{etfRecommendations.find((e) => e.ticker === selectedETF)?.category}</span>
                  <span>·</span>
                  <span>{etfRecommendations.find((e) => e.ticker === selectedETF)?.region}</span>
                </div>
                {tradeType === "매도" && (
                  <p className="text-xs text-blue-400 mt-1">
                    보유: {user?.holdings.find((h) => h.ticker === selectedETF)?.shares || 0}주
                  </p>
                )}
              </div>
            )}

            {/* Shares Input */}
            <div className="mb-4">
              <label className="block text-xs text-slate-400 mb-1.5">수량 (주)</label>
              <input
                type="number"
                min="1"
                value={tradeShares}
                onChange={(e) => setTradeShares(e.target.value)}
                placeholder="매매할 수량을 입력하세요"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Order Preview */}
            {selectedETF && tradeShares && parseInt(tradeShares) > 0 && (
              <div className="bg-slate-800/40 rounded-lg p-3 mb-4">
                <p className="text-xs text-slate-400">예상 {tradeType} 금액</p>
                <p className="text-lg font-bold text-white">
                  {formatKRW((etfPrices[selectedETF] || 0) * parseInt(tradeShares))}
                </p>
              </div>
            )}

            {/* Trade Message */}
            {tradeMsg && (
              <div className={`rounded-lg px-3 py-2 mb-4 text-xs ${
                tradeMsg.type === "success"
                  ? "bg-emerald-900/20 border border-emerald-800/30 text-emerald-300"
                  : "bg-red-900/20 border border-red-800/30 text-red-300"
              }`}>
                {tradeMsg.text}
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleTrade}
              disabled={!selectedETF || !tradeShares}
              className={`w-full py-3 rounded-lg text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                tradeType === "매수"
                  ? "bg-red-600 hover:bg-red-500 text-white"
                  : "bg-blue-600 hover:bg-blue-500 text-white"
              }`}
            >
              {tradeType === "매수" ? "매수 주문" : "매도 주문"}
            </button>

            <p className="text-[10px] text-slate-600 mt-2 text-center">
              잔액: {formatKRW(user?.balance || 0)}
            </p>
          </div>

          {/* ETF List with Prices */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              투자 가능 종목
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left text-xs text-slate-500 pb-3 font-medium">종목명</th>
                    <th className="text-left text-xs text-slate-500 pb-3 font-medium">카테고리</th>
                    <th className="text-right text-xs text-slate-500 pb-3 font-medium">현재가</th>
                    <th className="text-right text-xs text-slate-500 pb-3 font-medium">보유</th>
                    <th className="text-right text-xs text-slate-500 pb-3 font-medium">평가금액</th>
                    <th className="text-center text-xs text-slate-500 pb-3 font-medium">매매</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {etfRecommendations.map((etf) => {
                    const price = etfPrices[etf.ticker] || 0;
                    const holding = user?.holdings.find((h) => h.ticker === etf.ticker);
                    const holdValue = (holding?.shares || 0) * price;
                    const pnl = holding
                      ? (price - holding.avgPrice) * holding.shares
                      : 0;

                    return (
                      <tr key={etf.ticker} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3">
                          <p className="text-sm font-medium text-white">{etf.nameKr}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{etf.ticker}</p>
                        </td>
                        <td className="py-3">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                            etf.category === "방어형"
                              ? "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                              : etf.category === "공격형"
                              ? "bg-red-600/20 text-red-300 border border-red-500/30"
                              : "bg-amber-600/20 text-amber-300 border border-amber-500/30"
                          }`}>
                            {etf.category}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <span className="text-sm font-medium text-white">{price.toLocaleString()}원</span>
                        </td>
                        <td className="py-3 text-right">
                          {holding ? (
                            <div>
                              <span className="text-sm text-white">{holding.shares}주</span>
                              <p className={`text-[10px] ${pnl >= 0 ? "text-red-400" : "text-blue-400"}`}>
                                {pnl >= 0 ? "+" : ""}{pnl.toLocaleString()}원
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-600">-</span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          {holding ? (
                            <span className="text-sm text-slate-300">{holdValue.toLocaleString()}원</span>
                          ) : (
                            <span className="text-xs text-slate-600">-</span>
                          )}
                        </td>
                        <td className="py-3 text-center">
                          <button
                            onClick={() => { setSelectedETF(etf.ticker); setTradeType("매수"); setActiveTab("trade"); }}
                            className="text-[10px] px-2 py-1 rounded bg-red-600/20 text-red-300 hover:bg-red-600/30 border border-red-500/30 mr-1 transition-colors"
                          >
                            매수
                          </button>
                          {holding && holding.shares > 0 && (
                            <button
                              onClick={() => { setSelectedETF(etf.ticker); setTradeType("매도"); setActiveTab("trade"); }}
                              className="text-[10px] px-2 py-1 rounded bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 border border-blue-500/30 transition-colors"
                            >
                              매도
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Holdings Tab ── */}
      {activeTab === "holdings" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-purple-400" />
            보유종목 현황
          </h2>
          {user?.holdings.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500">보유 중인 종목이 없습니다.</p>
              <p className="text-xs text-slate-600 mt-1">매매하기 탭에서 ETF를 매수해보세요.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {user?.holdings.map((holding) => {
                const etf = etfRecommendations.find((e) => e.ticker === holding.ticker);
                const price = etfPrices[holding.ticker] || 0;
                const currentValue = holding.shares * price;
                const investedValue = holding.shares * holding.avgPrice;
                const pnl = currentValue - investedValue;
                const pnlPct = investedValue > 0 ? ((pnl / investedValue) * 100).toFixed(2) : "0";

                return (
                  <div key={holding.ticker} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="text-sm font-bold text-white">{etf?.nameKr || holding.ticker}</h3>
                        <p className="text-xs text-slate-500">{etf?.name} · {holding.ticker}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-white">{formatKRW(currentValue)}</p>
                        <p className={`text-xs font-medium ${pnl >= 0 ? "text-red-400" : "text-blue-400"}`}>
                          {pnl >= 0 ? "+" : ""}{formatKRW(pnl)} ({pnl >= 0 ? "+" : ""}{pnlPct}%)
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-3 text-xs">
                      <div>
                        <p className="text-slate-500">보유 수량</p>
                        <p className="text-white font-medium">{holding.shares}주</p>
                      </div>
                      <div>
                        <p className="text-slate-500">평균 매수가</p>
                        <p className="text-white font-medium">{formatKRW(holding.avgPrice)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">현재가</p>
                        <p className="text-white font-medium">{formatKRW(price)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">투자 원금</p>
                        <p className="text-white font-medium">{formatKRW(investedValue)}</p>
                      </div>
                    </div>
                    {/* Portfolio weight bar */}
                    {totalHoldingsValue > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-slate-500">포트폴리오 비중</span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {((currentValue / totalAssets) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-1.5">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${Math.min((currentValue / totalAssets) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Portfolio Composition */}
              <div className="bg-slate-800/30 rounded-xl p-4 mt-4">
                <h3 className="text-sm font-bold text-white mb-3">포트폴리오 구성</h3>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 bg-slate-700 rounded-full h-4 overflow-hidden flex">
                    <div
                      className="bg-blue-500 h-full"
                      style={{ width: `${(user?.balance || 0) / totalAssets * 100}%` }}
                      title="현금"
                    />
                    {user?.holdings.map((h) => {
                      const val = h.shares * (etfPrices[h.ticker] || 0);
                      const cat = etfRecommendations.find((e) => e.ticker === h.ticker)?.category;
                      const color = cat === "방어형" ? "bg-cyan-500" : cat === "공격형" ? "bg-red-500" : "bg-amber-500";
                      return (
                        <div
                          key={h.ticker}
                          className={`${color} h-full`}
                          style={{ width: `${val / totalAssets * 100}%` }}
                        />
                      );
                    })}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 text-[10px]">
                  <span className="flex items-center gap-1 text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-blue-500" /> 현금 {((user?.balance || 0) / totalAssets * 100).toFixed(1)}%
                  </span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-cyan-500" /> 방어형
                  </span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-red-500" /> 공격형
                  </span>
                  <span className="flex items-center gap-1 text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> 헤지형
                  </span>
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
            <History className="w-5 h-5 text-yellow-400" />
            거래내역
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
                      <span className={`text-xs px-2 py-1 rounded font-bold ${
                        trade.type === "매수"
                          ? "bg-red-600/20 text-red-300 border border-red-500/30"
                          : "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                      }`}>
                        {trade.type}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-white">{etf?.nameKr || trade.ticker}</p>
                        <p className="text-[10px] text-slate-500">{trade.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-white">{trade.shares}주 × {formatKRW(trade.price)}</p>
                      <p className={`text-xs font-medium ${
                        trade.type === "매수" ? "text-red-400" : "text-blue-400"
                      }`}>
                        {trade.type === "매수" ? "-" : "+"}{formatKRW(trade.total)}
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
