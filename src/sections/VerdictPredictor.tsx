import { useState, useEffect, useRef, useCallback } from 'react';
import Matter from 'matter-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { CFUserInfo } from '@/hooks/useVerdictPredictor';
import { useVerdictPredictor } from '@/hooks/useVerdictPredictor';
import type { VerdictPrediction } from '@/types/verdict';
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
   CF User Badge
────────────────────────────────────── */
function CFUserBadge({ user }: { user: CFUserInfo }) {
  const isLGM = user.rating >= 3000;
  return (
    <div className="flex items-center justify-center gap-4 mb-6 flex-wrap">
      <div className="shrink-0 rounded-full p-0.5"
        style={{ background: `linear-gradient(135deg, ${user.color}, ${user.color}88)`, boxShadow: `0 4px 16px ${user.color}33` }}>
        <img src={user.avatar} alt={user.handle} className="w-14 h-14 rounded-full bg-white"
          onError={e => { (e.target as HTMLImageElement).src = 'https://userpic.codeforces.org/no-title.jpg'; }} />
      </div>
      <div className="flex items-center gap-3 flex-wrap">
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
   Verdict short labels
────────────────────────────────────── */
const VERDICT_SHORT: Record<string, string> = {
  AC: 'AC', WA: 'WA', TLE: 'TLE', MLE: 'MLE',
  RE: 'RE', CE: 'CE', ILE: 'ILE', SKIPPED: 'SKIP',
};

/* ──────────────────────────────────────
   Physics Scene — canvas-based, draggable
────────────────────────────────────── */
interface PhysicsProps {
  predictions: VerdictPrediction[];
  onSettled: () => void;
}

const CHIP_W = 80;
const CHIP_H = 44;
const CHIP_R = 12;
const SCENE_H = 360;

function PhysicsScene({ predictions, onSettled }: PhysicsProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const runnerRef = useRef<Matter.Runner | null>(null);
  const bodiesRef = useRef<{ body: Matter.Body; pred: VerdictPrediction }[]>([]);
  const mouseConstraintRef = useRef<Matter.MouseConstraint | null>(null);
  const settledRef = useRef(false);
  const rafRef = useRef<number>(0);

  const drawScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    const dpr = window.devicePixelRatio || 1;

    ctx.clearRect(0, 0, W * dpr, H * dpr);
    ctx.save();
    ctx.scale(dpr, dpr);

    // Draw floor line
    ctx.beginPath();
    ctx.moveTo(0, H - 1);
    ctx.lineTo(W, H - 1);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw each chip
    for (const { body, pred } of bodiesRef.current) {
      const { x, y } = body.position;
      const angle = body.angle;
      const color = pred.verdict.color;
      const label = VERDICT_SHORT[pred.verdict.id] || pred.verdict.id;
      const prob = `${pred.probability}%`;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      // Shadow
      ctx.shadowColor = `${color}44`;
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 3;

      // Background fill
      const hw = CHIP_W / 2;
      const hh = CHIP_H / 2;
      ctx.beginPath();
      ctx.roundRect(-hw, -hh, CHIP_W, CHIP_H, CHIP_R);
      ctx.fillStyle = `${color}18`;
      ctx.fill();

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Border
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label text
      ctx.fillStyle = color;
      ctx.font = `bold 13px 'Inter', system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 0, -7);

      // Probability
      ctx.font = `11px 'Inter', system-ui, sans-serif`;
      ctx.globalAlpha = 0.8;
      ctx.fillText(prob, 0, 9);
      ctx.globalAlpha = 1;

      ctx.restore();
    }

    ctx.restore();
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas || !predictions.length) return;

    const W = wrap.clientWidth || 600;
    const H = SCENE_H;
    const dpr = window.devicePixelRatio || 1;

    // Set canvas size with DPR
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;

    // Engine
    const engine = Matter.Engine.create({ gravity: { x: 0, y: 2.2 } });
    engineRef.current = engine;

    // Walls
    const floor = Matter.Bodies.rectangle(W / 2, H + 25, W + 100, 50, { isStatic: true, label: 'floor' });
    const wallL = Matter.Bodies.rectangle(-25, H / 2, 50, H * 2, { isStatic: true });
    const wallR = Matter.Bodies.rectangle(W + 25, H / 2, 50, H * 2, { isStatic: true });
    Matter.World.add(engine.world, [floor, wallL, wallR]);

    // Mouse constraint for drag
    const mouse = Matter.Mouse.create(canvas);
    // Fix mouse position for DPR
    mouse.pixelRatio = dpr;
    const mouseConstraint = Matter.MouseConstraint.create(engine, {
      mouse,
      constraint: {
        stiffness: 0.2,
        render: { visible: false },
      },
    });
    Matter.World.add(engine.world, mouseConstraint);
    mouseConstraintRef.current = mouseConstraint;

    // Drop chips with stagger
    bodiesRef.current = [];
    settledRef.current = false;
    predictions.forEach((pred, i) => {
      setTimeout(() => {
        const x = CHIP_W / 2 + 20 + Math.random() * (W - CHIP_W - 40);
        const y = -CHIP_H - i * 8;
        const body = Matter.Bodies.rectangle(x, y, CHIP_W, CHIP_H, {
          restitution: 0.45,
          friction: 0.25,
          frictionAir: 0.015,
          angle: (Math.random() - 0.5) * 0.6,
          label: pred.verdict.id,
        });
        Matter.World.add(engine.world, body);
        bodiesRef.current.push({ body, pred });
      }, i * 130);
    });

    // Runner
    const runner = Matter.Runner.create();
    runnerRef.current = runner;
    Matter.Runner.run(runner, engine);

    // RAF draw loop + settle detection
    let stableCount = 0;
    const loop = () => {
      drawScene();
      if (bodiesRef.current.length === predictions.length && !settledRef.current) {
        const allStill = bodiesRef.current.every(({ body }) => {
          const spd = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);
          return spd < 0.25;
        });
        // Don't count as settled if user is dragging
        const isDragging = !!(mouseConstraintRef.current?.body);
        if (allStill && !isDragging) {
          stableCount++;
          if (stableCount > 22) {
            settledRef.current = true;
            onSettled();
          }
        } else {
          stableCount = 0;
        }
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engine);
      Matter.World.clear(engine.world, false);
      bodiesRef.current = [];
      settledRef.current = false;
    };
  }, [predictions, drawScene, onSettled]);

  return (
    <div
      ref={wrapRef}
      className="relative w-full"
      style={{ height: SCENE_H, cursor: 'grab' }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: SCENE_H, cursor: 'inherit' }}
      />
      {/* Hint */}
      <div
        className="absolute bottom-2 right-3 text-xs pointer-events-none select-none"
        style={{ color: '#94a3b8', opacity: 0.7 }}
      >
        drag to play ↕
      </div>
    </div>
  );
}

/* ──────────────────────────────────────
   Progress bar row
────────────────────────────────────── */
function ProbabilityBar({ pred, delay }: { pred: VerdictPrediction; delay: number }) {
  const [width, setWidth] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const DURATION = 900;
    startRef.current = null;
    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const t = Math.min((now - startRef.current) / DURATION, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setWidth(eased * pred.probability);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    const id = setTimeout(() => { rafRef.current = requestAnimationFrame(tick); }, delay);
    return () => {
      clearTimeout(id);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [pred.probability, delay]);

  return (
    <div
      className="flex items-center gap-3 py-2"
      style={{ opacity: 0, animation: `fadeSlideIn 0.4s ease forwards ${delay}ms` }}
    >
      <div className="flex items-center gap-2 w-28 shrink-0">
        <span style={{ fontSize: 18 }}>{pred.verdict.icon}</span>
        <span className="text-sm font-semibold truncate" style={{ color: pred.verdict.color }}>
          {VERDICT_SHORT[pred.verdict.id] || pred.verdict.id}
        </span>
      </div>
      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#f1f5f9' }}>
        <div
          className="h-full rounded-full transition-none"
          style={{
            width: `${width}%`,
            backgroundColor: pred.verdict.color,
            boxShadow: width > 0 ? `0 0 6px ${pred.verdict.color}66` : 'none',
          }}
        />
      </div>
      <span className="text-sm font-bold w-12 text-right shrink-0" style={{ color: pred.verdict.color }}>
        {Math.round(width * 10) / 10}%
      </span>
    </div>
  );
}

/* ──────────────────────────────────────
   Global keyframes
────────────────────────────────────── */
const STYLE_ID = 'vp-keyframes-v3';
function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
    @keyframes fadeSlideIn {
      from { opacity: 0; transform: translateX(-12px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes vpPopIn {
      0%   { opacity: 0; transform: scale(0.88) translateY(-16px); }
      60%  { opacity: 1; transform: scale(1.03) translateY(2px);   }
      80%  { transform: scale(0.98); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    .vp-pop-in { animation: vpPopIn 0.5s cubic-bezier(0.34,1.4,0.64,1) both; }
  `;
  document.head.appendChild(s);
}

/* ──────────────────────────────────────
   Main
────────────────────────────────────── */
type UIPhase = 'idle' | 'physics' | 'bars' | 'done';

export function VerdictPredictor() {
  const {
    predictions, isPredicting, lastPredicted,
    generatePredictions,
    cfUser, setCFHandle,
    isLoadingCF, cfError, fetchCFUser,
  } = useVerdictPredictor();

  const [inputValue, setInputValue] = useState('');
  const [funMessage, setFunMessage] = useState('');
  const [uiPhase, setUIPhase] = useState<UIPhase>('idle');

  useEffect(() => { ensureStyles(); }, []);

  useEffect(() => {
    if (!isPredicting && predictions.length > 0 && lastPredicted) {
      setUIPhase('physics');
      setFunMessage(getFunMessage(lastPredicted.verdict.id));
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

  const handlePhysicsSettled = useCallback(() => {
    setUIPhase('bars');
    setTimeout(() => setUIPhase('done'), 2000);
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f8fafc' }}>
      {/* Top accent */}
      <div className="h-1 w-full" style={{ background: 'linear-gradient(to right, #3b82f6, #8b5cf6, #ec4899, #3b82f6)' }} />

      <div className="flex-1 flex flex-col w-full px-4 sm:px-8 lg:px-16 py-6 sm:py-10">

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
            type="text"
            placeholder="Enter your Codeforces handle..."
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCFSubmit()}
            className="w-72 sm:w-80 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
          />
          <Button
            onClick={handleCFSubmit}
            disabled={isLoadingCF || !inputValue.trim()}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoadingCF ? '...' : 'OK'}
          </Button>
        </div>
        {cfError && <p className="text-center text-red-500 text-sm mb-4">{cfError}</p>}

        {/* CF User Badge */}
        {cfUser && <CFUserBadge user={cfUser} />}

        {/* Predict Button */}
        <div className="flex justify-center mb-8">
          <button
            onClick={handlePredict}
            disabled={isPredicting || uiPhase === 'physics'}
            className={cn(
              'text-lg sm:text-xl px-10 sm:px-16 py-4 sm:py-5 font-bold rounded-2xl transition-all duration-300',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              !(isPredicting || uiPhase === 'physics') && 'cursor-pointer hover:scale-[1.03] active:scale-[0.98]',
            )}
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              boxShadow: '0 6px 28px rgba(59,130,246,0.35), 0 2px 8px rgba(0,0,0,0.08)',
              color: 'white', border: 'none',
            }}
          >
            {isPredicting || uiPhase === 'physics'
              ? <span className="flex items-center gap-3"><span className="animate-spin inline-block">◌</span>Predicting...</span>
              : <span className="flex items-center gap-3"><span>🎲</span>Predict Next Verdict</span>}
          </button>
        </div>

        {/* ── PHYSICS SCENE ── */}
        {(uiPhase === 'physics' || uiPhase === 'bars' || uiPhase === 'done') && predictions.length > 0 && (
          <div
            className="rounded-2xl overflow-hidden w-full mb-6"
            style={{
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)',
            }}
          >
            <div className="px-4 sm:px-6 pt-4 pb-2 border-b border-slate-100">
              <p className="text-sm text-slate-400 text-center">
                {uiPhase === 'physics' ? '⚡ Simulating...' : '🎯 Results — drag to play!'}
              </p>
            </div>

            <div className="px-2 sm:px-4 pt-4 pb-2">
              <PhysicsScene
                predictions={predictions}
                onSettled={handlePhysicsSettled}
              />
            </div>
          </div>
        )}

        {/* ── WINNER CARD + BARS ── */}
        {(uiPhase === 'bars' || uiPhase === 'done') && lastPredicted && (
          <>
            <div className="mb-6 w-full vp-pop-in">
              <div
                className="rounded-2xl p-5 sm:p-7 w-full"
                style={{
                  backgroundColor: '#fff',
                  border: `2px solid ${lastPredicted.verdict.color}44`,
                  boxShadow: `0 4px 28px ${lastPredicted.verdict.color}22, 0 1px 4px rgba(0,0,0,0.04)`,
                  background: `linear-gradient(135deg, #fff 80%, ${lastPredicted.verdict.color}08)`,
                }}
              >
                <p className="text-slate-400 mb-2 text-center text-sm">Most Likely Verdict</p>
                <div className="text-3xl sm:text-4xl font-bold mb-1 text-center" style={{ color: lastPredicted.verdict.color }}>
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

            <div
              className="rounded-2xl w-full"
              style={{
                backgroundColor: '#fff',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)',
              }}
            >
              <div className="px-5 sm:px-7 pt-5 pb-1 border-b border-slate-100">
                <h2 className="text-lg sm:text-xl font-bold text-slate-700">Verdict Probabilities</h2>
              </div>
              <div className="px-5 sm:px-7 py-4 divide-y divide-slate-50">
                {predictions.map((pred, i) => (
                  <ProbabilityBar key={pred.verdict.id} pred={pred} delay={i * 80} />
                ))}
              </div>
            </div>
          </>
        )}

        {/* Footer */}
        <div className="mt-10 text-center text-slate-400 text-xs sm:text-sm">
          <p>This is just for fun! Don&apos;t take it seriously 😄</p>
          <p className="mt-1">Inspired by Codeforces verdict system</p>
        </div>

      </div>
    </div>
  );
}
