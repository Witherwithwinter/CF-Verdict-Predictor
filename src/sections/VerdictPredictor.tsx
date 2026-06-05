import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { CFUserInfo } from '@/hooks/useVerdictPredictor';
import { useVerdictPredictor } from '@/hooks/useVerdictPredictor';
import { cn } from '@/lib/utils';

/* ──────────────────────────────────────
   Fun messages
────────────────────────────────────── */
const FUN_MESSAGES: Record<string, string[]> = {
  AC:      ['快去刷题，一发AC！','今天手感火热，直接拿下！','这波稳了，提交就过！','绿色 verdict 正在向你招手~','自信即巅峰，AC 在等你！','这波代码无懈可击！','提交前记得深呼吸，AC 稳了！'],
  WA:      ['再检查一遍边界条件？','也许只是少了一个等号...','样例过了不代表全对哦','debug 时间到！','printf 调试法启动！','也许是输出格式的问题？','别慌，WA 是通往 AC 的必经之路'],
  TLE:     ['复杂度是不是有点高了？','试试换个算法思路？','预处理一下可能会快很多','卡常数也是一种艺术','快读快写安排上！','O(n²) 在向你招手... 不，是 O(n log n)','也许可以剪枝？'],
  MLE:     ['数组是不是开太大了？','试试滚动数组？','内存限制不是摆设啊喂','vector 的 reserve 了解一下','也许可以用 bitset 压缩？','空间换时间，但空间不够了...'],
  RE:      ['数组越界了吧？','空指针？野指针？','递归栈溢出了？','除以零了？','检查一下数组下标从 0 还是从 1 开始','STL 的 empty() 检查了吗？','也许是递归终止条件的问题？'],
  CE:      ['少了个分号？','头文件漏了？','变量名拼写错了？','STL 的模板参数加了吗？','using namespace std; 呢？','编译器版本对吗？','也许是中文标点的问题？'],
  ILE:     ['读入挂了吗？','交互题格式对吗？','flush 了吗？','也许是用 cin 没用 ios::sync_with_stdio(false)？'],
  SKIPPED: ['这题被你跳过了？','不如换个题目试试？','有时候跳过也是一种策略'],
};
function getFunMessage(id: string): string {
  const list = FUN_MESSAGES[id] || ['Good luck!'];
  return list[Math.floor(Math.random() * list.length)];
}

/* ──────────────────────────────────────
   Inline keyframes injected once
────────────────────────────────────── */
const STYLE_ID = 'vp-keyframes';
function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
    @keyframes vp-drop-in {
      0%   { opacity: 0; transform: translateY(-28px) rotate(-1.5deg); }
      55%  { opacity: 1; transform: translateY(6px)  rotate(0.8deg);  }
      75%  { transform: translateY(-3px) rotate(-0.4deg); }
      90%  { transform: translateY(2px)  rotate(0.2deg);  }
      100% { opacity: 1; transform: translateY(0)    rotate(0deg);    }
    }
    @keyframes vp-reveal-pop {
      0%   { opacity: 0; transform: scale(0.85) translateY(-18px); }
      60%  { opacity: 1; transform: scale(1.04) translateY(2px);   }
      80%  { transform: scale(0.98) translateY(0); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    .vp-drop-in {
      animation: vp-drop-in 0.62s cubic-bezier(0.34,1.56,0.64,1) both;
    }
    .vp-reveal-pop {
      animation: vp-reveal-pop 0.55s cubic-bezier(0.34,1.4,0.64,1) both;
    }
  `;
  document.head.appendChild(s);
}

/* ──────────────────────────────────────
   CF User Badge
────────────────────────────────────── */
function CFUserBadge({ user }: { user: CFUserInfo }) {
  const isLGM = user.rating >= 3000;
  return (
    <div className="flex items-center justify-center gap-4 mb-8 flex-wrap">
      <div className="shrink-0 rounded-full p-0.5"
        style={{ background: `linear-gradient(135deg, ${user.color}, ${user.color}88)`, boxShadow: `0 4px 16px ${user.color}33` }}>
        <img src={user.avatar} alt={user.handle} className="w-14 h-14 rounded-full bg-white"
          onError={e => { (e.target as HTMLImageElement).src = 'https://userpic.codeforces.org/no-title.jpg'; }} />
      </div>
      <div className="flex items-center gap-3 flex-wrap items-center">
        <span className="text-2xl font-bold" style={{ fontFamily: 'monospace' }}>
          {isLGM
            ? <><span style={{ color: '#000' }}>{user.handle[0]}</span><span style={{ color: '#FF0000' }}>{user.handle.slice(1)}</span></>
            : <span style={{ color: user.color }}>{user.handle}</span>}
        </span>
        <span className="text-base px-3 py-0.5 rounded-full font-semibold"
          style={{ color: user.color, border: `1.5px solid ${user.color}`, background: `${user.color}0d` }}>
          {user.rating}
        </span>
        <span className="text-sm font-medium" style={{ color: user.color }}>{user.rank}</span>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────
   Animated progress bar item
────────────────────────────────────── */
type AnimPhase = 'scanning' | 'reveal' | 'done';

function PredictionRow({
  icon, fullName, id, color,
  targetPct, phase, isFirst, dropIndex,
}: {
  icon: string; fullName: string; id: string; color: string;
  targetPct: number; phase: AnimPhase; isFirst: boolean; dropIndex: number;
}) {
  const [barWidth, setBarWidth] = useState(0);
  const [showNumber, setShowNumber] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const SCAN_DURATION = 1200; // ms

  // Phase: scanning → animate bar 0 → targetPct
  useEffect(() => {
    if (phase !== 'scanning') return;
    setBarWidth(0);
    setShowNumber(false);
    startRef.current = null;

    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const elapsed = now - startRef.current;
      const progress = Math.min(elapsed / SCAN_DURATION, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setBarWidth(eased * targetPct);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setBarWidth(targetPct);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [phase, targetPct]);

  // Phase: reveal → show final number
  useEffect(() => {
    if (phase === 'reveal' || phase === 'done') setShowNumber(true);
  }, [phase]);

  const isRevealPhase = phase === 'reveal' || phase === 'done';

  return (
    <div
      className={cn(
        'p-4 rounded-xl',
        isRevealPhase && !isFirst && 'vp-drop-in',
        isRevealPhase && isFirst && '',
      )}
      style={{
        backgroundColor: isFirst && isRevealPhase ? '#eff6ff' : 'transparent',
        outline: isFirst && isRevealPhase ? '2px solid #bfdbfe' : 'none',
        // stagger drop for non-first items
        animationDelay: isRevealPhase && !isFirst ? `${dropIndex * 70}ms` : '0ms',
        // hide non-first items until reveal phase starts
        opacity: phase === 'scanning' || isRevealPhase ? 1 : 0,
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl shrink-0">{icon}</span>
          <div className="min-w-0">
            <p className="font-semibold text-base sm:text-lg truncate" style={{ color }}>{fullName}</p>
            <p className="text-xs sm:text-sm text-slate-400">{id}</p>
          </div>
        </div>
        <div className="text-right shrink-0 ml-4">
          <p className="text-xl sm:text-2xl font-bold transition-all duration-300" style={{ color }}>
            {showNumber ? `${targetPct}%` : '—'}
          </p>
        </div>
      </div>
      {/* Progress bar */}
      <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: '#f1f5f9' }}>
        <div
          className="h-full rounded-full"
          style={{
            backgroundColor: color,
            width: `${barWidth}%`,
            boxShadow: barWidth > 0 ? `0 0 8px ${color}66` : 'none',
            transition: phase === 'scanning' ? 'none' : 'width 0.4s ease-out',
          }}
        />
      </div>
    </div>
  );
}

/* ──────────────────────────────────────
   Main
────────────────────────────────────── */
// animation state machine
type UIPhase = 'idle' | 'scanning' | 'reveal' | 'done';

export function VerdictPredictor() {
  const {
    predictions, isPredicting, lastPredicted,
    generatePredictions,
    cfUser, cfHandle, setCFHandle,
    isLoadingCF, cfError, fetchCFUser,
  } = useVerdictPredictor();

  const [inputValue, setInputValue] = useState('');
  const [funMessage, setFunMessage] = useState('');
  const [uiPhase, setUIPhase] = useState<UIPhase>('idle');

  useEffect(() => { ensureStyles(); }, []);

  // When predictions arrive from hook (isPredicting flips false), kick off animation
  useEffect(() => {
    if (!isPredicting && predictions.length > 0 && lastPredicted) {
      // Phase 1: scanning — bars fill up
      setUIPhase('scanning');
      const scanDone = setTimeout(() => {
        // Phase 2: reveal — winner pops up, others drop
        setUIPhase('reveal');
        setFunMessage(getFunMessage(lastPredicted.verdict.id));
        setTimeout(() => setUIPhase('done'), 1200);
      }, 1350); // slightly longer than bar animation
      return () => clearTimeout(scanDone);
    }
  }, [isPredicting, predictions, lastPredicted]);

  const handleCFSubmit = () => {
    setCFHandle(inputValue);
    fetchCFUser(inputValue);
  };

  const handlePredict = () => {
    setUIPhase('idle');
    generatePredictions();
  };

  const showResults = uiPhase === 'scanning' || uiPhase === 'reveal' || uiPhase === 'done';
  const showWinner = uiPhase === 'reveal' || uiPhase === 'done';

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f8fafc' }}>
      {/* Top accent line */}
      <div className="h-1 w-full" style={{ background: 'linear-gradient(to right, #3b82f6, #8b5cf6, #3b82f6)' }} />

      <div className="flex-1 flex flex-col w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-10">

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold mb-2 tracking-tight"
            style={{ background: 'linear-gradient(135deg, #1e3a5f, #3b82f6, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Verdict Predictor
          </h1>
          <p className="text-slate-400 text-sm sm:text-base">Predict your next submission verdict on Codeforces</p>
        </div>

        {/* CF Handle Input */}
        <div className="flex justify-center gap-2 mb-6 flex-wrap">
          <Input
            type="text" placeholder="Enter your Codeforces handle..."
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCFSubmit()}
            className="w-72 sm:w-80 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 shadow-sm"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
          />
          <Button onClick={handleCFSubmit} disabled={isLoadingCF || !inputValue.trim()} size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
            {isLoadingCF ? '...' : 'OK'}
          </Button>
        </div>
        {cfError && <p className="text-center text-red-500 text-sm mb-4">{cfError}</p>}

        {/* CF User Badge */}
        {cfUser && <CFUserBadge user={cfUser} />}

        {/* Predict Button */}
        <div className="flex justify-center mb-10">
          <button
            onClick={handlePredict}
            disabled={isPredicting || uiPhase === 'scanning'}
            className={cn(
              'text-lg sm:text-xl px-10 sm:px-16 py-5 sm:py-6 font-bold rounded-2xl transition-all duration-300',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              !isPredicting && uiPhase !== 'scanning' && 'cursor-pointer hover:scale-[1.03] active:scale-[0.98]',
            )}
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              boxShadow: '0 6px 28px rgba(59, 130, 246, 0.35), 0 2px 8px rgba(0,0,0,0.08)',
              color: 'white', border: 'none',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 36px rgba(59,130,246,0.45), 0 2px 8px rgba(0,0,0,0.10)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 28px rgba(59,130,246,0.35), 0 2px 8px rgba(0,0,0,0.08)'; }}
          >
            {isPredicting || uiPhase === 'scanning'
              ? <span className="flex items-center gap-3"><span className="animate-spin inline-block">◌</span>Predicting...</span>
              : <span className="flex items-center gap-3"><span>🎲</span>Predict Next Verdict</span>}
          </button>
        </div>

        {/* Winner reveal card */}
        {showWinner && lastPredicted && (
          <div className="mb-8 w-full vp-reveal-pop">
            <div className="rounded-2xl p-6 sm:p-8 w-full"
              style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)' }}>
              <p className="text-slate-400 mb-2 text-center text-sm sm:text-base">Most Likely Verdict:</p>
              <div className="text-3xl sm:text-4xl font-bold mb-2 text-center" style={{ color: lastPredicted.verdict.color }}>
                {lastPredicted.verdict.icon} {lastPredicted.verdict.fullName}
              </div>
              <p className="text-2xl sm:text-3xl font-semibold mb-3 text-center" style={{ color: lastPredicted.verdict.color }}>
                {lastPredicted.probability}%
              </p>
              {funMessage && (
                <p className="text-slate-500 text-sm italic text-center">&ldquo;{funMessage}&rdquo;</p>
              )}
            </div>
          </div>
        )}

        {/* Probabilities list */}
        {showResults && predictions.length > 0 && (
          <div className="rounded-2xl overflow-hidden w-full"
            style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)' }}>
            <div className="p-4 sm:p-6 border-b border-slate-100">
              <h2 className="text-xl sm:text-2xl font-bold text-center text-slate-700">Verdict Probabilities</h2>
            </div>
            <div className="p-4 sm:p-6 space-y-4">
              {predictions.map((pred, index) => (
                <PredictionRow
                  key={pred.verdict.id}
                  icon={pred.verdict.icon}
                  fullName={pred.verdict.fullName}
                  id={pred.verdict.id}
                  color={pred.verdict.color}
                  targetPct={pred.probability}
                  phase={uiPhase as AnimPhase}
                  isFirst={index === 0}
                  dropIndex={index} // 0-based; first item uses reveal-pop, rest use drop-in stagger
                />
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-slate-400 text-xs sm:text-sm">
          <p>This is just for fun! Don&apos;t take it seriously 😄</p>
          <p className="mt-1">Inspired by Codeforces verdict system</p>
        </div>

      </div>
    </div>
  );
}
