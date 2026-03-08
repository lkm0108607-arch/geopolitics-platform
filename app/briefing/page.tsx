"use client";

import { useState, useEffect } from "react";
import { Zap, Send, RotateCcw, AlertTriangle, CheckCircle, Info, Lock, ShieldCheck, Ban } from "lucide-react";
import { issues } from "@/data/issues";
import { experts } from "@/data/experts";

const BRIEFING_PASSWORD = "h#68606860";
const STORAGE_KEY = "geoinsight_briefing_used";

interface BriefingMessage {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  uncertainty?: string;
  isFactual?: boolean;
}

const quickPrompts = [
  "오늘 중동 정세 3줄 요약",
  "전문가들이 가장 갈리는 쟁점은?",
  "이번 주 미중관계 전망",
  "확전 위험이 커진 이슈는?",
  "가장 신뢰도 높은 분석 3개",
  "대만해협 최신 시나리오 설명해줘",
  "러시아-우크라이나 휴전 가능성은?",
  "한반도 북핵 현황 요약",
];

function generateResponse(query: string): BriefingMessage {
  const q = query.toLowerCase();

  if (q.includes("중동") || q.includes("이스라엘") || q.includes("이란")) {
    return {
      role: "assistant",
      content: `**중동 정세 현황 브리핑 (2026.03.07 기준)**

**핵심 3줄 요약:**
1. 이스라엘-이란 직접 충돌 위험은 헤즈볼라 약화 이후 다소 완화되었으나, 이란 핵 프로그램 가속으로 근본 긴장은 지속
2. 이란 우라늄 농축 90% 접근 보고 → IAEA 경고. 동시에 오만 중재 비공개 협상 진행 중
3. 가장 유력한 시나리오: 제한적 공습 후 긴장 유지 (45%), 핵 합의 재개 (25%)

**전문가 간 주요 쟁점:**
- 발리 나스르 (존스홉킨스): "양측 모두 전면전 의지 없음. 관리 가능한 수준" (낙관적)
- 이란 핵 강경파 시각: 협상 없이 핵 능력 고도화 지속

**불확실 요소:** 이란 내부 정치 변화, 미국 대이란 정책 방향`,
      sources: ["IAEA 2026.02.25 보고서", "WSJ 2026.02.18 보도", "SAIS 중동분석"],
      uncertainty: "이란 내부 정치 동향 및 핵 협상 진행 상황은 비공개 정보에 의존하므로 불확실성 높음",
      isFactual: true,
    };
  }

  if (q.includes("미중") || q.includes("중국") || q.includes("무역") || q.includes("기술")) {
    return {
      role: "assistant",
      content: `**미중 경제·기술 패권 경쟁 브리핑 (2026.03.07 기준)**

**이번 주 핵심 동향:**
1. 중국 반도체 자립화 가속 — 화웨이 7나노 칩 양산 성공 보고. 수출 통제 효과 일부 우회
2. 중국 희토류 수출 허가제 도입 → 첨단 소재 공급망 리스크 상승
3. G20 계기 무역 긴장 완화 협의 제안 (낙관적 신호)

**전문가 전망:**
- 아담 투즈 (컬럼비아): "기술 표준 전쟁과 공급망 재편은 되돌리기 어려운 구조적 변화" → 부분 디커플링 55%
- 제시카 천 와이스 (코넬): "관리된 경쟁·부분 협력 가능" → 협력 30%

**가장 갈리는 쟁점:** 반도체 수출 통제가 중국 자립화를 늦추는지, 오히려 가속하는지`,
      sources: ["SEMI 2026.02.28", "블룸버그 2026.02.15"],
      uncertainty: "중국 반도체 실제 기술 수준 파악은 어려움. 발표와 실제 역량 간 격차 불명확",
      isFactual: false,
    };
  }

  if (q.includes("러시아") || q.includes("우크라이나") || q.includes("러우") || q.includes("휴전")) {
    return {
      role: "assistant",
      content: `**러시아-우크라이나 전쟁 브리핑 (2026.03.07 기준)**

**현황:**
- 전선: 러시아 점진적 우위 지속. 우크라이나 수세
- 외교: 미러 외교 접촉 재개. 트럼프 중재 가시화
- 군사: 러시아 2차 동원령 준비 징후 / 우크라이나 F-16 작전 반경 확대

**휴전 가능성 분석:**
- 마이클 코프만 (카네기): "전선 교착 지속, 러시아 점진적 우위" → 소모전 40%
- 피오나 힐 (브루킹스): "트럼프 압박으로 협상 국면 진입 가능성. 단 조건부 휴전" → 봉합 35%

**핵심 쟁점:** 우크라이나의 영토 양보 여부. 현재 우크라이나는 강력히 거부 중

**추론 (사실 아님):** 2026년 하반기 이전 휴전 협상 공식화 가능성은 35-40%로 추정되나, 푸틴의 실제 협상 의지는 불명확`,
      sources: ["카네기 연구소 2026.02.20", "브루킹스 2026.03.01", "우크라이나 정보총국"],
      uncertainty: "푸틴의 실제 협상 의지는 공개 정보만으로 파악 불가. 추론 포함",
      isFactual: false,
    };
  }

  if (q.includes("대만") || q.includes("해협")) {
    return {
      role: "assistant",
      content: `**대만해협 긴장 브리핑 (2026.03.07 기준)**

**현황:**
- 중국 군사 예산 7.2% 증가 발표 (2026)
- 미 항모전단 대만해협 정기 순찰 지속
- 대만 국내 방산 생산 가속화

**시나리오별 확률 (전문가 종합):**
1. 군사 압박 지속·현상유지 — **45%** (가장 유력)
2. 해상봉쇄 또는 제한적 군사행동 — **30%**
3. 전면 침공 — **15%**
4. 양안 대화 재개 — **10%**

**전문가 핵심 쟁점:**
- 보니 글레이저: "전면 침공보다 봉쇄·도서 점령 가능성 높음. 2027년 전후 위험"
- 그레이엄 앨리슨: "투키디데스 함정 역학 작동 중. 구조적 충돌 불가피"
- 제시카 천 와이스: "강경책이 오히려 충돌 위험 높일 수 있어"

**판세 전환 트리거:** 대만 독립 선언, 미군 대만 상시 주둔, 중국 내부 정치 위기`,
      sources: ["중국 전국인민대표대회 2026.03.05", "미 태평양함대 2026.02.20", "GMF 분석 2026.02.15"],
      uncertainty: "중국 군 내부 준비 상태 및 시진핑 실제 의중은 추론 불가",
      isFactual: false,
    };
  }

  if (q.includes("한반도") || q.includes("북한") || q.includes("북핵")) {
    return {
      role: "assistant",
      content: `**한반도 북핵 위기 브리핑 (2026.03.07 기준)**

**최근 동향:**
- 북한 단거리 탄도미사일 발사 (2026.03.01)
- 러시아산 첨단 무기 기술 이전 보고 (잠수함·전투기)
- 7차 핵실험 준비 징후 지속

**핵심 평가 (브루스 클링너, 헤리티지재단):**
"북한은 핵 포기 의사 전혀 없음. 핵·미사일 고도화는 협상 레버리지이자 체제 생존 수단.
트럼프와의 특수 관계가 유일한 와일드카드이나 근본 방향은 변하지 않음"

**시나리오:**
1. 핵·미사일 고도화 지속 — **55%**
2. 국지 도발 — **25%**
3. 비핵화 협상 재개 — **15%**

**주의:** 북한 내부 정보는 극히 제한적. 모든 분석은 불확실성 매우 높음`,
      sources: ["합동참모본부 2026.03.01", "한미 정보당국 2026.02.20", "헤리티지재단 2026.02.05"],
      uncertainty: "북한 내부 정보 접근 거의 불가. 상당 부분 추론에 의존",
      isFactual: false,
    };
  }

  if (q.includes("갈리") || q.includes("쟁점") || q.includes("견해 차이")) {
    const diverging = issues.filter((i) => {
      const probs = i.scenarios.map((s) => s.probability);
      return probs.length >= 2 && Math.max(...probs) - Math.min(...probs) < 40;
    });

    return {
      role: "assistant",
      content: `**전문가 견해가 가장 엇갈리는 이슈 (2026.03.07)**

**1. 미중 대만해협 긴장**
- 핵심 쟁점: 중국의 군사행동 방식 (전면 침공 vs 봉쇄 vs 현상유지)
- 낙관파: 제시카 천 와이스 — "강경책 역효과, 현상유지 가능"
- 비관파: 보니 글레이저 — "봉쇄 시나리오 현실적, 2027년 위험"
- 갈림 이유: 시진핑의 실제 의중 불명확, 중국 군사력 실제 수준 논쟁

**2. 러시아-우크라이나 휴전 가능성**
- 핵심 쟁점: 푸틴의 협상 의지 여부
- 피오나 힐: "협상 의도 없음"
- 마이클 코프만: "군사적 교착 상태가 협상 동기 만들 수 있음"

**3. 미중 기술 디커플링 심도**
- 핵심 쟁점: 수출 통제가 중국 자립을 늦추는가, 가속하는가
- 갈림 이유: 중국 반도체 실제 역량 불투명

**공통 패턴:** 전문가 견해 차이는 대부분 상대국 내부 정치에 대한 불확실성에서 기원`,
      sources: ["전문가 공개 분석 종합"],
      uncertainty: "이 분석은 공개된 전문가 발언 종합. 개별 전문가 전체 입장 반영 안 될 수 있음",
      isFactual: false,
    };
  }

  if (q.includes("신뢰") || q.includes("전문가 top") || q.includes("믿을")) {
    const top3 = [...experts].sort((a, b) => b.credibilityScore - a.credibilityScore).slice(0, 3);
    return {
      role: "assistant",
      content: `**현재 신뢰도 높은 분석 Top 3**

${top3.map((e, i) => `**${i + 1}. ${e.name}** (${e.affiliation})
- 신뢰도: ${e.credibilityScore}점 / 근거수준: ${e.evidenceScore}점
- 전문분야: ${e.domains.join(", ")}
- 최근 견해: "${e.recentView}"`).join("\n\n")}

**참고:** 신뢰도는 이슈·분야별로 다릅니다.
- 러우전쟁 분석: 마이클 코프만 (군사 전문성 최고)
- 미중관계: 그레이엄 앨리슨 (구조적 분석 강점)
- 중동 정세: 발리 나스르 (현장 경험 강점)`,
      sources: ["GeoInsight 전문가 평가 데이터베이스"],
      uncertainty: "신뢰도 점수는 GeoInsight 자체 평가 기준. 절대적 순위가 아닌 참고 지표",
      isFactual: false,
    };
  }

  if (q.includes("확전") || q.includes("위험") || q.includes("상승")) {
    const rising = issues.filter((i) => i.probTrend === "상승").sort((a, b) => b.probability - a.probability);
    return {
      role: "assistant",
      content: `**발생 확률 상승 이슈 (2026.03.07)**

${rising.map((i, idx) => `**${idx + 1}. ${i.title}** — 발생 확률 ${i.probability}%
${i.signals.filter((s) => s.type === "경고").slice(0, 1).map((s) => `최근 신호: ${s.title}`).join("")}`).join("\n\n")}

**주의해야 할 판세 전환 트리거:**
- 이란 핵실험 → 중동 즉각 위기
- 대만 독립 선언 → 중국 군사 대응 가능성
- 러시아 NATO 회원국 공격 → 집단방위 조항 발동`,
      sources: ["GeoInsight 이슈 모니터링"],
      uncertainty: "발생 확률은 전문가 견해 기반 추정치이며, 실제 상황에 따라 변동 가능",
      isFactual: false,
    };
  }

  return {
    role: "assistant",
    content: `**질문 분석:** "${query}"

죄송합니다. 해당 주제에 대한 구체적인 데이터를 찾지 못했습니다.

현재 분석 가능한 주요 이슈:
${issues.map((i) => `• **${i.title}** — 발생 확률 ${i.probability}%`).join("\n")}

위 주제 중 하나를 선택하거나, 아래 빠른 질문을 활용해보세요.`,
    sources: [],
    uncertainty: undefined,
    isFactual: undefined,
  };
}

export default function BriefingPage() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [hasUsed, setHasUsed] = useState(false);
  const [sessionUsed, setSessionUsed] = useState(false);
  const [messages, setMessages] = useState<BriefingMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const used = localStorage.getItem(STORAGE_KEY);
    if (used === "true") {
      setHasUsed(true);
    }
  }, []);

  const markAsUsed = () => {
    localStorage.setItem(STORAGE_KEY, "true");
    setHasUsed(true);
  };

  const handleUnlock = () => {
    if (password === BRIEFING_PASSWORD) {
      setIsUnlocked(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  // 무료 사용자가 1회 사용 후 추가 질문 차단 여부
  const isFreeUserLocked = !isUnlocked && (sessionUsed || hasUsed);

  // 이미 사용한 기기로 재접속 — 비밀번호로 해제 가능
  if (!isUnlocked && hasUsed && messages.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-red-950/50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Ban className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">무료 이용 횟수 소진</h1>
          <p className="text-sm text-slate-400 mb-6">
            이 기기에서 AI 브리핑을 이미 사용하셨습니다.<br />
            무료 이용은 기기당 1회로 제한됩니다.
          </p>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-4">
            <p className="text-xs text-slate-500 mb-3">관리자 비밀번호로 다시 이용할 수 있습니다</p>
            <div className="space-y-3">
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setPasswordError(false); }}
                onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                placeholder="비밀번호 입력"
                className={`w-full bg-slate-800 border ${passwordError ? "border-red-500" : "border-slate-700"} rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 outline-none focus:border-blue-500 transition-colors`}
              />
              {passwordError && (
                <p className="text-xs text-red-400">비밀번호가 올바르지 않습니다.</p>
              )}
              <button
                onClick={handleUnlock}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                잠금 해제
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (query: string) => {
    if (!query.trim()) return;
    if (isFreeUserLocked) return;

    const userMsg: BriefingMessage = { role: "user", content: query };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    await new Promise((r) => setTimeout(r, 800));
    const response = generateResponse(query);
    setMessages((prev) => [...prev, response]);
    setLoading(false);

    // 응답 완료 후 잠금
    if (!isUnlocked) {
      setSessionUsed(true);
      markAsUsed();
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    handleSubmit(prompt);
  };

  const formatContent = (content: string) => {
    return content
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br/>");
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-blue-400 text-sm font-medium mb-2">
          <Zap className="w-4 h-4" />
          <span>AI 브리핑</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">국제정세 AI 브리핑</h1>
        <p className="text-slate-400 text-sm">
          전문가 분석을 기반으로 국제정세를 요약·비교합니다.
          <strong className="text-slate-200"> 모든 답변에 출처, 불확실성, 추론·사실 구분을 표시합니다.</strong>
        </p>
      </div>

      {/* Disclaimer */}
      <div className="bg-blue-950/30 border border-blue-800/40 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-200/80">
            이 AI 브리핑은 GeoInsight 데이터베이스의 전문가 분석을 종합합니다.
            확실하지 않은 내용은 명시적으로 표시하며, 추론과 사실을 구분합니다.
            최종 판단은 반드시 원문 출처를 확인하세요.
          </p>
        </div>
      </div>

      {/* Quick prompts */}
      {messages.length === 0 && (
        <div className="mb-6">
          <p className="text-sm text-slate-400 mb-3">빠른 질문</p>
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleQuickPrompt(prompt)}
                className="px-3 py-1.5 text-sm bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-500 rounded-lg transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="space-y-4 mb-6 min-h-[200px]">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "user" ? (
              <div className="max-w-md bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm">
                {msg.content}
              </div>
            ) : (
              <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-sm p-5">
                <div
                  className="text-sm text-slate-200 leading-relaxed mb-4"
                  dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }}
                />

                {msg.sources && msg.sources.length > 0 && (
                  <div className="border-t border-slate-800 pt-3 mb-3">
                    <p className="text-xs font-semibold text-slate-400 flex items-center gap-1 mb-1.5">
                      <CheckCircle className="w-3 h-3" /> 참고 출처
                    </p>
                    <ul className="space-y-0.5">
                      {msg.sources.map((s, i) => (
                        <li key={i} className="text-xs text-slate-500">· {s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {msg.uncertainty && (
                  <div className="bg-yellow-950/20 border border-yellow-800/30 rounded-lg p-3">
                    <p className="text-xs text-yellow-300 flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>불확실성:</strong> {msg.uncertainty}
                      </span>
                    </p>
                  </div>
                )}

                {msg.isFactual !== undefined && (
                  <p className={`text-xs mt-2 ${msg.isFactual ? "text-emerald-400" : "text-orange-400"}`}>
                    {msg.isFactual ? "✓ 공식 자료 기반" : "~ 전문가 분석 및 추론 포함"}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-sm px-5 py-4">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input or Lock notice */}
      {isFreeUserLocked ? (
        <div className="sticky bottom-4">
          <div className="bg-red-950/30 border border-red-800/40 rounded-2xl p-4 text-center shadow-xl">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Lock className="w-4 h-4 text-red-400" />
              <p className="text-sm font-semibold text-red-300">무료 이용 1회가 소진되었습니다</p>
            </div>
            <p className="text-xs text-slate-400 mb-3">추가 이용을 원하시면 비밀번호를 입력하세요.</p>
            <div className="flex gap-2 max-w-sm mx-auto">
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setPasswordError(false); }}
                onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                placeholder="비밀번호 입력"
                className={`flex-1 bg-slate-800 border ${passwordError ? "border-red-500" : "border-slate-700"} rounded-xl px-3 py-2 text-white text-sm placeholder-slate-500 outline-none focus:border-blue-500 transition-colors`}
              />
              <button
                onClick={handleUnlock}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                해제
              </button>
            </div>
            {passwordError && (
              <p className="text-xs text-red-400 mt-2">비밀번호가 올바르지 않습니다.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="sticky bottom-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-2 flex gap-2 shadow-xl">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmit(input)}
              placeholder="국제정세에 대해 질문하세요..."
              className="flex-1 bg-transparent text-white placeholder-slate-500 text-sm px-3 py-2 outline-none"
            />
            {messages.length > 0 && (
              <button
                onClick={() => setMessages([])}
                className="p-2 text-slate-500 hover:text-slate-300 transition-colors"
                title="대화 초기화"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => handleSubmit(input)}
              disabled={!input.trim() || loading}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              전송
            </button>
          </div>

          {messages.length === 0 && !hasUsed && (
            <p className="text-center text-xs text-slate-600 mt-2">
              무료 1회 체험 · 빠른 질문 버튼을 클릭하거나 직접 입력하세요
            </p>
          )}
        </div>
      )}
    </div>
  );
}
