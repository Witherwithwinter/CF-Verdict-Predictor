import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { CFUserInfo } from '@/hooks/useVerdictPredictor';
import { useVerdictPredictor } from '@/hooks/useVerdictPredictor';
import { cn } from '@/lib/utils';
import { VERDICTS } from '@/types/verdict';

function CFUserBadge({ user }: { user: CFUserInfo }) {
  return (
    <div className="flex items-center justify-center gap-3 mb-6">
      <span
        className="text-2xl font-bold"
        style={{ color: user.color }}
      >
        {user.handle}
      </span>
      <span
        className="text-lg px-3 py-1 rounded-full font-semibold"
        style={{
          color: user.color,
          border: `1px solid ${user.color}`,
          backgroundColor: user.rating >= 3000 ? '#000' : 'transparent',
        }}
      >
        Rating: {user.rating}
      </span>
      <span className="text-sm text-gray-400">{user.rank}</span>
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

  const handleCFSubmit = () => {
    setCFHandle(inputValue);
    fetchCFUser(inputValue);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#0f172a' }}>
      {/* Sticky Header */}
      <div className="flex-1 flex flex-col max-w-4xl w-full mx-auto px-4 py-8">

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
            className="w-64 bg-[#1a1f3a] border-[#2a2f4a] text-white placeholder:text-gray-500"
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
            onClick={generatePredictions}
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
              className="inline-block min-w-[300px] rounded-lg p-6"
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
                className="text-2xl font-semibold"
                style={{ color: lastPredicted.verdict.color }}
              >
                {lastPredicted.probability}%
              </p>
            </div>
          </div>
        )}

        {/* Predictions List */}
        {predictions.length > 0 && !isPredicting && (
          <div
            className="rounded-lg overflow-hidden"
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
          <p>🎯 This is just for fun! Don't take it seriously 😄</p>
          <p className="mt-1">Inspired by Codeforces verdict system</p>
        </div>

      </div>
    </div>
  );
}
