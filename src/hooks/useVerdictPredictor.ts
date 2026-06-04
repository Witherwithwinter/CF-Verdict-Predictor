import { useState, useCallback } from 'react';
import { Verdict, VerdictPrediction, VERDICTS } from '@/types/verdict';

// Weight configuration for verdicts (higher = more likely)
const VERDICT_WEIGHTS: Record<string, number> = {
  'AC': 15,
  'WA': 35,
  'TLE': 20,
  'MLE': 8,
  'RE': 12,
  'CE': 5,
  'PE': 3,
  'ILE': 1,
  'SKIPPED': 0.5,
  'TESTING': 0.5,
};

export function useVerdictPredictor() {
  const [predictions, setPredictions] = useState<VerdictPrediction[]>([]);
  const [isPredicting, setIsPredicting] = useState(false);
  const [lastPredicted, setLastPredicted] = useState<VerdictPrediction | null>(null);

  const generatePredictions = useCallback(() => {
    setIsPredicting(true);

    // Simulate prediction delay
    setTimeout(() => {
      const predictionsArray: VerdictPrediction[] = [];

      // Generate random probabilities based on weights
      let rawProbs: number[] = [];
      VERDICTS.forEach((verdict: Verdict) => {
        const weight = VERDICT_WEIGHTS[verdict.id] || 1;
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
  }, []);

  return {
    predictions,
    isPredicting,
    lastPredicted,
    generatePredictions,
  };
}
