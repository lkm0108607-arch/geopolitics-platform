"use client";

export default function SimulationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-20">
      <div className="bg-red-950/30 border border-red-800/50 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-red-400 mb-3">시뮬레이션 오류</h2>
        <p className="text-sm text-slate-300 mb-2">에러 메시지:</p>
        <pre className="bg-slate-900 border border-slate-700 rounded-lg p-4 text-xs text-red-300 overflow-auto whitespace-pre-wrap mb-4">
          {error.message}
        </pre>
        <p className="text-sm text-slate-300 mb-2">스택 트레이스:</p>
        <pre className="bg-slate-900 border border-slate-700 rounded-lg p-4 text-xs text-slate-500 overflow-auto whitespace-pre-wrap mb-4 max-h-60">
          {error.stack}
        </pre>
        {error.digest && (
          <p className="text-xs text-slate-500 mb-4">Digest: {error.digest}</p>
        )}
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}
