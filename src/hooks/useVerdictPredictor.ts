import { useState, useCallback, useRef } from 'react';
import type { Verdict, VerdictPrediction } from '@/types/verdict';
import { VERDICTS } from '@/types/verdict';

export type CFUserInfo = {
  handle: string;
  rating: number;
  rank: string;
  color: string;
  avatar: string;
};

// Base weights (higher = more likely)
const BASE_WEIGHTS: Record<string, number> = {
  'AC': 40,
  'WA': 30,
  'TLE': 15,
  'MLE': 5,
  'RE': 6,
  'CE': 3,
  'ILE': 0.5,
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

  // AC probability increases significantly with rating
  // WA/TLE probability decreases with rating
  if (rating < 1200) {
    weights['AC'] = 30;
    weights['WA'] = 40;
    weights['TLE'] = 18;
    weights['MLE'] = 6;
    weights['RE'] = 4;
    weights['CE'] = 1.5;
    weights['ILE'] = 0.3;
    weights['SKIPPED'] = 0.2;
  } else if (rating < 1400) {
    weights['AC'] = 45;
    weights['WA'] = 32;
    weights['TLE'] = 14;
    weights['MLE'] = 4;
    weights['RE'] = 3;
    weights['CE'] = 1.5;
    weights['ILE'] = 0.3;
    weights['SKIPPED'] = 0.2;
  } else if (rating < 1600) {
    weights['AC'] = 55;
    weights['WA'] = 25;
    weights['TLE'] = 11;
    weights['MLE'] = 3.5;
    weights['RE'] = 3;
    weights['CE'] = 1.5;
    weights['ILE'] = 0.5;
    weights['SKIPPED'] = 0.5;
  } else if (rating < 1900) {
    weights['AC'] = 65;
    weights['WA'] = 18;
    weights['TLE'] = 8;
    weights['MLE'] = 3;
    weights['RE'] = 3;
    weights['CE'] = 2;
    weights['ILE'] = 0.5;
    weights['SKIPPED'] = 0.5;
  } else if (rating < 2100) {
    weights['AC'] = 75;
    weights['WA'] = 12;
    weights['TLE'] = 6;
    weights['MLE'] = 2.5;
    weights['RE'] = 2.5;
    weights['CE'] = 1.5;
    weights['ILE'] = 0.3;
    weights['SKIPPED'] = 0.2;
  } else if (rating < 2300) {
    weights['AC'] = 82;
    weights['WA'] = 8;
    weights['TLE'] = 5;
    weights['MLE'] = 2;
    weights['RE'] = 2;
    weights['CE'] = 0.8;
    weights['ILE'] = 0.1;
    weights['SKIPPED'] = 0.1;
  } else if (rating < 2400) {
    weights['AC'] = 87;
    weights['WA'] = 6;
    weights['TLE'] = 4;
    weights['MLE'] = 1.5;
    weights['RE'] = 1;
    weights['CE'] = 0.3;
    weights['ILE'] = 0.1;
    weights['SKIPPED'] = 0.1;
  } else if (rating < 3000) {
    weights['AC'] = 92;
    weights['WA'] = 4;
    weights['TLE'] = 2.5;
    weights['MLE'] = 0.8;
    weights['RE'] = 0.5;
    weights['CE'] = 0.1;
    weights['ILE'] = 0.05;
    weights['SKIPPED'] = 0.05;
  } else {
    weights['AC'] = 96;
    weights['WA'] = 2;
    weights['TLE'] = 1;
    weights['MLE'] = 0.5;
    weights['RE'] = 0.3;
    weights['CE'] = 0.1;
    weights['ILE'] = 0.05;
    weights['SKIPPED'] = 0.05;
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
          avatar: user.avatar || `https://userpic.codeforces.org/no-title.jpg`,
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
        // Very small randomness so weights dominate
        const randomFactor = 0.95 + Math.random() * 0.1; // 0.95 - 1.05
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
