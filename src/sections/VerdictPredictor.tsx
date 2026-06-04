import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { CFUserInfo } from '@/hooks/useVerdictPredictor';
import { useVerdictPredictor } from '@/hooks/useVerdictPredictor';
import { cn } from '@/lib/utils';

const FUN_MESSAGES: Record<string, string[]> = {
  'AC': [
    '快去刷题，一发AC！',
    '今天手感火热，直接拿下！',
    '这波稳了，提交就过！',
    '绿色 verdict 正在向你招手~',
    '自信即巅峰，AC 在等你！',
    '这波代码无懈可击！',
    '提交前记得深呼吸，AC 稳了！',
  ],
  'WA': [
    '再检查一遍边界条件？',
    '也许只是少了一个等号...',
    '样例过了不代表全对哦',
    'debug 时间到！',
    'printf 调试法启动！',
    '也许是输出格式的问题？',
    '别慌，WA 是通往 AC 的必经之路',
  ],
  'TLE': [
    '复杂度是不是有点高了？',
    '试试换个算法思路？',
    '预处理一下可能会快很多',
    '卡常数也是一种艺术',
    '快读快写安排上！',
    'O(n²) 在向你招手... 不，是 O(n log n)',
    '也许可以剪枝？',
  ],
  'MLE': [
    '数组是不是开太大了？',
    '试试滚动数组？',
    '内存限制不是摆设啊喂',
    'vector 的 reserve 了解一下',
    '也许可以用 bitset 压缩？',
    '空间换时间，但空间不够了...',
  ],
  'RE': [
    '数组越界了吧？',
    '空指针？野指针？',
    '递归栈溢出了？',
    '除以零了？',
    '检查一下数组下标从 0 还是从 1 开始',
    'STL 的 empty() 检查了吗？',
    '也许是递归终止条件的问题？',
  ],
  'CE': [
    '少了个分号？',
    '头文件漏了？',
    '变量名拼写错了？',
    'STL 的模板参数加了吗？',
    'using namespace std; 呢？',
    '编译器版本对吗？',
    '也许是中文标点的问题？',
  ],
  'ILE': [
    '读入挂了吗？',
    '交互题格式对吗？',
    'flush 了吗？',
    '也许是用 cin 没用 ios::sync_with_stdio(false)？',
  ],
  'SKIPPED': [
    '这题被你跳过了？',
    '不如换个题目试试？',
    '有时候跳过也是一种策略',
  ],
};

function getFunMessage(verdictId: string): string {
  const messages = FUN_MESSAGES[verdictId] || ['Good luck!'];
  return messages[Math.floor(Math.random() * messages.length)];
}

/* ---- CF User Badge ---- */
function CFUserBadge({ user }: { user: CFUserInfo }) {
  const isLGM = user.rating >= 3000;
  return (
    <div className="flex items-center justify-center gap-4 mb-8 flex-wrap">
      {/* Avatar */}
      <div
        className="shrink-0 rounded-full p-0.5"
        style={{
          background: `linear-gradient(135deg, ${user.color}, ${user.color}88)`,
          boxShadow: `0 4px 16px ${user.color}33`,
        }}
      >
        <img
          src={user.avatar}
          alt={user.handle}
          className="w-14 h-14 rounded-full bg-white"
          onError={e => {
            (e.target as HTMLImageElement).src = 'https://userpic.codeforces.org/no-title.jpg';
          }}
        />
      </div>

      {/* Handle + Rating + Rank */}
      <div className="flex items-center gap-3 flex-wrap items-center">
        {/* Handle — LGM: first char black, rest red */}
        <span className="text-2xl font-bold" style={{ fontFamily: 'monospace' }}>
          {isLGM ? (
            <>
              <span style={{ color: '#000' }}>{user.handle[0]}</span>
              <span style={{ color: '#FF0000' }}>{user.handle.slice(1)}</span>
            </>
          ) : (
            <span style={{ color: user.color }}>{user.handle}</span>
          )}
        </span>

        {/* Rating pill */}
        <span
          className="text-base px-3 py-0.5 rounded-full font-semibold"
          style={{
            color: user.color,
            border: `1.5px solid ${user.color}`,
            background: `${user.color}0d`,
          }}
        >
          {user.rating}
        </span>

        {/* Rank */}
        <span className="text-sm font-medium" style={{ color: user.color }}>
          {user.rank}
        </span>
      </div>
    </div>
  );
}

/* ---- Main Component ---- */
export function VerdictPredictor() {
  const {
    predictions,
    isPredicting,
    lastPredicted,
    generatePredictions,
    cfUser,
    cfHandle,
    setCFHandle,
    isLoadingCF,
    cfError,
    fetchCFUser,
  } = useVerdictPredictor();

  const [inputValue, setInputValue] = useState('');
  const [funMessage, setFunMessage] = useState('');

  const handleCFSubmit = () => {
    setCFHandle(inputValue);
    fetchCFUser(inputValue);
  };

  const handlePredict = () => {
    generatePredictions();
  };

  // Update fun message when lastPredicted changes
  useEffect(() => {
    if (lastPredicted) {
      setFunMessage(getFunMessage(lastPredicted.verdict.id));
    }
  }, [lastPredicted]);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f8fafc' }}>

      {/* Subtle top gradient line for 3D feel */}
      <div
        className="h-1 w-full"
        style={{
          background: 'linear-gradient(to right, #3b82f6, #8b5cf6, #3b82f6)',
        }}
      />

      <div className="flex-1 flex flex-col w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-10">

        {/* ===== Title ===== */}
        <div className="text-center mb-8">
          <h1
            className="text-4xl sm:text-5xl font-bold mb-2 tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #1e3a5f, #3b82f6, #7c3aed)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Verdict Predictor
          </h1>
          <p className="text-slate-400 text-sm sm:text-base">
            Predict your next submission verdict on Codeforces
          </p>
        </div>

        {/* ===== CF Handle Input ===== */}
        <div className="flex justify-center gap-2 mb-6 flex-wrap">
          <Input
            type="text"
            placeholder="Enter your Codeforces handle..."
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCFSubmit()}
            className="w-72 sm:w-80 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 shadow-sm focus:shadow-md transition-shadow"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
          />
          <Button
            onClick={handleCFSubmit}
            disabled={isLoadingCF || !inputValue.trim()}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-shadow"
          >
            {isLoadingCF ? '...' : 'OK'}
          </Button>
        </div>
        {cfError && (
          <p className="text-center text-red-500 text-sm mb-4">{cfError}</p>
        )}

        {/* ===== CF User Badge ===== */}
        {cfUser && <CFUserBadge user={cfUser} />}

        {/* ===== Predict Button ===== */}
        <div className="flex justify-center mb-10">
          <button
            onClick={handlePredict}
            disabled={isPredicting}
            className={cn(
              "text-lg sm:text-xl px-10 sm:px-16 py-5 sm:py-6 font-bold rounded-2xl transition-all duration-300",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              isPredicting ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:scale-[1.03] active:scale-[0.98]"
            )}
            style={{
              background: isPredicting
                ? 'linear-gradient(135deg, #2563eb, #7c3aed)'
                : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              boxShadow: isPredicting
                ? '0 4px 20px rgba(59, 130, 246, 0.3)'
                : '0 6px 28px rgba(59, 130, 246, 0.35), 0 2px 8px rgba(0,0,0,0.08)',
              color: 'white',
              border: 'none',
            }}
            onMouseEnter={e => {
              if (!isPredicting) {
                (e.currentTarget as HTMLElement).style.boxShadow =
                  '0 8px 36px rgba(59, 130, 246, 0.45), 0 2px 8px rgba(0,0,0,0.10)';
              }
            }}
            onMouseLeave={e => {
              if (!isPredicting) {
                (e.currentTarget as HTMLElement).style.boxShadow =
                  '0 6px 28px rgba(59, 130, 246, 0.35), 0 2px 8px rgba(0,0,0,0.08)';
              }
            }}
          >
            {isPredicting ? (
              <span className="flex items-center gap-3">
                <span className="animate-spin inline-block">◌</span>
                Predicting...
              </span>
            ) : (
              <span className="flex items-center gap-3">
                <span>🎲</span>
                Predict Next Verdict
              </span>
            )}
          </button>
        </div>

        {/* ===== Last Predicted Highlight ===== */}
        {lastPredicted && !isPredicting && (
          <div className="mb-8 w-full">
            <div
              className="rounded-2xl p-6 sm:p-8 w-full"
              style={{
                backgroundColor: '#fff',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)',
              }}
            >
              <p className="text-slate-400 mb-2 text-center text-sm sm:text-base">
                Most Likely Verdict:
              </p>
              <div
                className="text-3xl sm:text-4xl font-bold mb-2 text-center"
                style={{ color: lastPredicted.verdict.color }}
              >
                {lastPredicted.verdict.icon} {lastPredicted.verdict.fullName}
              </div>
              <p
                className="text-2xl sm:text-3xl font-semibold mb-3 text-center"
                style={{ color: lastPredicted.verdict.color }}
              >
                {lastPredicted.probability}%
              </p>
              {funMessage && (
                <p className="text-slate-500 text-sm italic text-center">
                  &ldquo;{funMessage}&rdquo;
                </p>
              )}
            </div>
          </div>
        )}

        {/* ===== Predictions List ===== */}
        {predictions.length > 0 && !isPredicting && (
          <div
            className="rounded-2xl overflow-hidden w-full"
            style={{
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)',
            }}
          >
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-slate-100">
              <h2 className="text-xl sm:text-2xl font-bold text-center text-slate-700">
                Verdict Probabilities
              </h2>
            </div>

            {/* List */}
            <div className="p-4 sm:p-6 space-y-4">
              {predictions.map((pred, index) => (
                <div
                  key={pred.verdict.id}
                  className={cn(
                    "p-4 rounded-xl transition-all",
                    index === 0 && "ring-2 ring-blue-200 bg-blue-50/50"
                  )}
                  style={{
                    backgroundColor: index === 0 ? '#eff6ff' : 'transparent',
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl shrink-0">{pred.verdict.icon}</span>
                      <div className="min-w-0">
                        <p
                          className="font-semibold text-base sm:text-lg truncate"
                          style={{ color: pred.verdict.color }}
                        >
                          {pred.verdict.fullName}
                        </p>
                        <p className="text-xs sm:text-sm text-slate-400">{pred.verdict.id}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p
                        className="text-xl sm:text-2xl font-bold"
                        style={{ color: pred.verdict.color }}
                      >
                        {pred.probability}%
                      </p>
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div
                    className="h-2.5 rounded-full overflow-hidden"
                    style={{ backgroundColor: '#f1f5f9' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        backgroundColor: pred.verdict.color,
                        width: `${pred.probability}%`,
                        boxShadow: `0 0 8px ${pred.verdict.color}66`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== Footer ===== */}
        <div className="mt-12 text-center text-slate-400 text-xs sm:text-sm">
          <p>This is just for fun! Don&apos;t take it seriously 😄</p>
          <p className="mt-1">Inspired by Codeforces verdict system</p>
        </div>

      </div>
    </div>
  );
}
