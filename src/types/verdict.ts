export type Verdict = {
  id: string;
  name: string;
  fullName: string;
  color: string;
  icon: string;
};

export type VerdictPrediction = {
  verdict: Verdict;
  probability: number;
};

export const VERDICTS: Verdict[] = [
  {
    id: 'AC',
    name: 'Accepted',
    fullName: 'Accepted',
    color: '#00b894',
    icon: '✓',
  },
  {
    id: 'WA',
    name: 'Wrong Answer',
    fullName: 'Wrong Answer',
    color: '#e74c3c',
    icon: '✗',
  },
  {
    id: 'TLE',
    name: 'Time Limit Exceeded',
    fullName: 'Time Limit Exceeded',
    color: '#fdcb6e',
    icon: '◎',
  },
  {
    id: 'MLE',
    name: 'Memory Limit Exceeded',
    fullName: 'Memory Limit Exceeded',
    color: '#e17055',
    icon: '⚡',
  },
  {
    id: 'RE',
    name: 'Runtime Error',
    fullName: 'Runtime Error',
    color: '#d63031',
    icon: '‼',
  },
  {
    id: 'CE',
    name: 'Compilation Error',
    fullName: 'Compilation Error',
    color: '#a29bfe',
    icon: '⚙',
  },
  {
    id: 'PE',
    name: 'Presentation Error',
    fullName: 'Presentation Error',
    color: '#fab1a0',
    icon: '¶',
  },
  {
    id: 'ILE',
    name: 'Idleness Limit Exceeded',
    fullName: 'Idleness Limit Exceeded',
    color: '#fd79a8',
    icon: '⏱',
  },
  {
    id: 'SKIPPED',
    name: 'Skipped',
    fullName: 'Skipped',
    color: '#636e72',
    icon: '⊘',
  },
  {
    id: 'TESTING',
    name: 'Testing',
    fullName: 'Testing on Testcase',
    color: '#74b9ff',
    icon: '◉',
  },
];
