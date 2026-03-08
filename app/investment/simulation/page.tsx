"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Wallet, User, Lock } from "lucide-react";

export default function SimulationPage() {
  const [hydrated, setHydrated] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

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

  if (loggedIn) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-4">모의투자 대시보드</h1>
        <p className="text-slate-400">환영합니다, {nickname}님!</p>
        <p className="text-slate-500 text-sm mt-2">초기 자금: 10,000,000원</p>
        <button
          onClick={() => setLoggedIn(false)}
          className="mt-4 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-sm"
        >
          로그아웃
        </button>
      </div>
    );
  }

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
            <label className="block text-xs text-slate-400 mb-1.5">
              <User className="w-3 h-3 inline mr-1" />닉네임
            </label>
            <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="닉네임" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              <Lock className="w-3 h-3 inline mr-1" />개인식별비밀번호
            </label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호" className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            onClick={() => {
              if (!nickname.trim() || nickname.trim().length < 2) { setError("닉네임은 2자 이상"); return; }
              if (!password.trim() || password.trim().length < 4) { setError("비밀번호는 4자 이상"); return; }
              setLoggedIn(true);
              setError("");
            }}
            className={`w-full py-3 rounded-lg text-sm font-bold transition-colors ${mode === "login" ? "bg-blue-600 hover:bg-blue-500 text-white" : "bg-emerald-600 hover:bg-emerald-500 text-white"}`}
          >
            {mode === "login" ? "로그인" : "회원가입 (1,000만원 지급)"}
          </button>
        </div>
      </div>
    </div>
  );
}
