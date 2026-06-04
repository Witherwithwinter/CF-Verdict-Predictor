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

function CFUserBadge({ user }: { user: CFUserInfo }) {
  const isLGM = user.rating >= 3000;
  const isIM = user.rating >= 2600;
  return (
    <div className="flex items-center justify-center gap-4 mb-6 flex-wrap">
      <img
        src={user.avatar}
        alt={user.handle}
        className="w-16 h-16 rounded-full border-2"
        style={{ borderColor: user.color }}
        onError={e => {
          (e.target as HTMLImageElement).src = 'https://userpic.codeforces.org/no-title.jpg';
        }}
      />
      <div className="flex items-center gap-3 flex-wrap items-center">
        <span
          className="text-2xl font-bold px-2 py-0.5 rounded"
          style={{
            backgroundColor: isLGM ? '#000' : 'transparent',
            color: isLGM ? '#FF0000' : user.color,
            fontFamily: 'monospace',
            letterSpacing: '0.5px',
          }}
        >
          {isLGM ? (
            /* LGM: first char rendered with black color on black bg = "invisible" effect */
            <>
              <span style={{ color: '#000', marginRight: '-0.05em' }}>{user.handle[0]}</span>
              <span style={{ color: '#FF0000' }}>{user.handle.slice(1)}</span>
            </>
          ) : (
            <span style={{ color: user.color }}>{user.handle}</span>
          )}
        </span>
        <span
          className="text-lg px-3 py-1 rounded-full font-semibold"
          style={{
            color: user.color,
            border: `1px solid ${user.color}`,
            backgroundColor: isLGM ? '#000' : 'transparent',
          }}
        >
          {user.rating}
        </span>
        <span
          className="text-sm font-medium"
          style={{ color: user.color }}
        >
          {user.rank}
        </span>
      </div>
    </div>
  );
}

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
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0f172a' }}>
      <div className="flex-1 flex flex-col w-full max-w-none px-4 sm:px-10 lg:px-32 py-8">

        {/* Title */}
        <div className="text-center mb-8">
          <h1
            className="text-5xl font-bold mb-2"
            style={{
              background: 'linear-gradient(to right, #60a5fa, #a78bfa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Verdict Predictor
          </h1>
          <p className="text-gray-400 text-base">
            Predict your next submission verdict on Codeforces
          </p>
        </div>

        {/* CF Handle Input */}
        <div className="flex justify-center gap-2 mb-8">
          <Input
            type="text"
            placeholder="Enter your Codeforces handle..."
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCFSubmit()}
            className="w-80 bg-[#1a1f3a] border-[#2a2f4a] text-white placeholder:text-gray-500"
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
        {cfError && (
          <p className="text-center text-red-400 text-sm mb-4">{cfError}</p>
        )}

        {/* CF User Badge */}
        {cfUser && <CFUserBadge user={cfUser} />}

        {/* Predict Button */}
        <div className="flex justify-center mb-10">
          <button
            onClick={handlePredict}
            disabled={isPredicting}
            className={cn(
              "text-xl px-12 py-6 font-bold rounded-xl transition-all duration-300",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              isPredicting ? "cursor-not-allowed opacity-50" : "cursor-pointer"
            )}
            style={{
              background: isPredicting
                ? 'linear-gradient(to right, #2563eb, #7c3aed)'
                : 'linear-gradient(to right, #3b82f6, #8b5cf6)',
              boxShadow: '0 0 30px rgba(59, 130, 246, 0.5)',
              color: 'white',
              border: 'none',
            }}
            onMouseEnter={e => {
              if (!isPredicting) {
                e.currentTarget.style.boxShadow = '0 0 40px rgba(59, 130, 246, 0.7)';
              }
            }}
            onMouseLeave={e => {
              if (!isPredicting) {
                e.currentTarget.style.boxShadow = '0 0 30px rgba(59, 130, 246, 0.5)';
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

        {/* Last Predicted Highlight */}
        {lastPredicted && !isPredicting && (
          <div className="mb-8 text-center">
            <div
              className="rounded-lg p-6 max-w-2xl mx-auto"
              style={{ backgroundColor: '#1a1f3a', border: '1px solid #2a2f4a' }}
            >
              <p className="text-gray-400 mb-2">Most Likely Verdict:</p>
              <div
                className="text-4xl font-bold mb-2"
                style={{ color: lastPredicted.verdict.color }}
              >
                {lastPredicted.verdict.icon} {lastPredicted.verdict.fullName}
              </div>
              <p
                className="text-2xl font-semibold mb-3"
                style={{ color: lastPredicted.verdict.color }}
              >
                {lastPredicted.probability}%
              </p>
              {funMessage && (
                <p className="text-gray-300 text-sm italic">
                  "{funMessage}"
                </p>
              )}
            </div>
          </div>
        )}

        {/* Predictions List */}
        {predictions.length > 0 && !isPredicting && (
          <div
            className="rounded-lg overflow-hidden w-full"
            style={{ backgroundColor: '#1a1f3a', border: '1px solid #2a2f4a' }}
          >
            <div className="p-6 border-b border-[#2a2f4a]">
              <h2 className="text-2xl font-bold text-center text-gray-200">
                Verdict Probabilities
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {predictions.map((pred, index) => (
                <div
                  key={pred.verdict.id}
                  className={cn(
                    "p-4 rounded-lg transition-all",
                    index === 0 && "ring-2 ring-blue-500/50"
                  )}
                  style={{
                    backgroundColor: index === 0 ? '#2a2f4a' : 'transparent',
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{pred.verdict.icon}</span>
                      <div>
                        <p
                          className="font-semibold text-lg"
                          style={{ color: pred.verdict.color }}
                        >
                          {pred.verdict.fullName}
                        </p>
                        <p className="text-sm text-gray-500">{pred.verdict.id}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className="text-2xl font-bold"
                        style={{ color: pred.verdict.color }}
                      >
                        {pred.probability}%
                      </p>
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div
                    className="h-3 rounded-full overflow-hidden"
                    style={{ backgroundColor: '#0a0e27' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        backgroundColor: pred.verdict.color,
                        width: `${pred.probability}%`,
                        opacity: 0.8,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-gray-600 text-sm">
          <p>This is just for fun! Don't take it seriously 😄</p>
          <p className="mt-1">Inspired by Codeforces verdict system</p>
        </div>

      </div>
    </div>
  );
}
