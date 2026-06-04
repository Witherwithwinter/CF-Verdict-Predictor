import { useState, useCallback, useRef } from 'react';
import type { Verdict, VerdictPrediction } from '@/types/verdict';
import { VERDICTS } from '@/types/verdict';

export type CFUserInfo = {
  handle: string;
  rating: number;
  rank: string;
  color: string;
};

// Base weights (higher = more likely)
const BASE_WEIGHTS: Record<string, number> = {
  'AC': 15,
  'WA': 35,
  'TLE': 20,
  'MLE': 8,
  'RE': 12,
  'CE': 5,
  'ILE': 1,
  'SKIPPED': 0.5,
};

// CF rating color mapping
export function getRatingColor(rating: number): string {
  if (rating < 1200) return '#808080';       // Grey  - Newbie
  if (rating < 1400) return '#008000';       // Green  - Pupil
  if (rating < 1600) return '#03A89E';       // Cyan  - Specialist
  if (rating < 1900) return '#0000FF';       // Blue  - Expert
  if (rating < 2100) return '#AA00AA';       // Violet - Candidate Master
  if (rating < 2400) return '#FF8C00';       // Orange - Master
  return '#FF0000';                            // Red   - IM/GM/LGM
}

export function getRatingTitle(rating: number): string {
  if (rating < 1200) return 'Newbie';
  if (rating < 1400) return 'Pupil';
  if (rating < 1600) return 'Specialist';
  if (rating < 1900) return 'Expert';
  if (rating < 2100) return 'Candidate Master';
  if (rating < 2300) return 'Master';
  if (rating < 2400) return 'International Master';
  if (rating < 2600) return 'Grandmaster';
  if (rating < 3000) return 'International Grandmaster';
  return 'Legendary Grandmaster';
}

// Adjust weights based on CF rating
function getAdjustedWeights(rating: number | null): Record<string, number> {
  const weights = { ...BASE_WEIGHTS };

  if (rating === null) return weights;

  // AC probability increases with rating
  // WA probability decreases with rating
  if (rating < 1200) {
    weights['AC'] = 8;
    weights['WA'] = 45;
    weights['TLE'] = 25;
  } else if (rating < 1400) {
    weights['AC'] = 12;
    weights['WA'] = 38;
    weights['TLE'] = 22;
  } else if (rating < 1600) {
    weights['AC'] = 18;
    weights['WA'] = 30;
    weights['TLE'] = 18;
  } else if (rating < 1900) {
    weights['AC'] = 25;
    weights['WA'] = 25;
    weights['TLE'] = 15;
  } else if (rating < 2100) {
    weights['AC'] = 35;
    weights['WA'] = 20;
    weights['TLE'] = 12;
  } else if (rating < 2400) {
    weights['AC'] = 45;
    weights['WA'] = 15;
    weights['TLE'] = 10;
  } else {
    weights['AC'] = 55;
    weights['WA'] = 12;
    weights['TLE'] = 8;
  }

  return weights;
}

export function useVerdictPredictor() {
  const [predictions, setPredictions] = useState<VerdictPrediction[]>([]);
  const [isPredicting, setIsPredicting] = useState(false);
  const [lastPredicted, setLastPredicted] = useState<VerdictPrediction | null>(null);
  const [cfUser, setCFUser] = useState<CFUserInfo | null>(null);
  const [cfHandle, setCFHandle] = useState('');
  const [isLoadingCF, setIsLoadingCF] = useState(false);
  const [cfError, setCFError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const fetchCFUser = useCallback(async (handle: string) => {
    const trimmed = handle.trim();
    if (!trimmed) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoadingCF(true);
    setCFError('');

    try {
      const res = await fetch(
        `https://codeforces.com/api/user.info?handles=${encodeURIComponent(trimmed)}`,
        { signal: controller.signal }
      );
      const data = await res.json();

      if (data.status === 'OK' && data.result?.length > 0) {
        const user = data.result[0];
        const rating = user.rating ?? 0;
        setCFUser({
          handle: user.handle,
          rating,
          rank: user.rank || getRatingTitle(rating),
          color: getRatingColor(rating),
        });
        setCFError('');
      } else {
        setCFError(data.comment || 'User not found');
        setCFUser(null);
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setCFError('Failed to fetch. Please try again.');
      }
    } finally {
      setIsLoadingCF(false);
    }
  }, []);

  const generatePredictions = useCallback(() => {
    setIsPredicting(true);

    setTimeout(() => {
      const predictionsArray: VerdictPrediction[] = [];
      const weights = getAdjustedWeights(cfUser?.rating ?? null);

      let rawProbs: number[] = [];
      VERDICTS.forEach((verdict: Verdict) => {
        const weight = weights[verdict.id] || 1;
        const randomFactor = 0.5 + Math.random(); // 0.5 - 1.5
        rawProbs.push(weight * randomFactor);
      });

      // Normalize to percentages
      const total = rawProbs.reduce((sum, p) => sum + p, 0);
      VERDICTS.forEach((verdict: Verdict, index: number) => {
        const probability = (rawProbs[index] / total) * 100;
        predictionsArray.push({
          verdict,
          probability: Math.round(probability * 10) / 10,
        });
      });

      // Sort by probability descending
      predictionsArray.sort((a, b) => b.probability - a.probability);

      // Ensure total is 100%
      const diff = 100 - predictionsArray.reduce((sum, p) => sum + p.probability, 0);
      predictionsArray[0].probability = Math.round((predictionsArray[0].probability + diff) * 10) / 10;

      setPredictions(predictionsArray);
      setLastPredicted(predictionsArray[0]);
      setIsPredicting(false);
    }, 800);
  }, [cfUser]);

  return {
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
  };
}
