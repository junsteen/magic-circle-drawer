# 🎯 Scoring System (scoring.ts)

## Overview
The scoring system evaluates how accurately a user traces a magic circle pattern. It combines multiple metrics to produce a score (0-100), a rank (S/A/B/C), and a damage multiplier.

## Core Data Structure

### ScoringResult
```typescript
interface ScoringResult {
  score: number;      // 0-100 integer score
  rank: string;       // 'S', 'A', 'B', or 'C'
  damageMultiplier: string; // e.g., '120%', '100%', '70%', '0%'
  difficultyMultiplier?: number; // Applied separately in UI (from patterns.ts)
}
```

## Scoring Algorithm

The final score is a weighted combination of three factors:
1. **Accuracy (50%)**: How close the user's path is to the ideal template
2. **Checkpoints (30%)**: Whether the user passed near all required vertices
3. **Path Length (20%)**: How well the user's path length matches the pattern's perimeter

### Step-by-Step Process

#### 1. Accuracy Calculation
- Generate template points by sampling along each edge of the pattern (default: 30 points per edge)
- For each point in the user's path, find the minimum distance to any template point
- Sum these distances, capping each at a maximum allowed error (based on difficulty tolerance)
- Average the errors and convert to a percentage accuracy:
  ```
  accuracy = max(0, 100 - (averageError / maxAllowedError) * 100)
  ```

#### 2. Checkpoint Calculation
- For performance, limit vertex checking to a maximum of 20 vertices (sample evenly if more exist)
- For each selected vertex, check if any user path point is within a threshold distance
- Threshold = baseTolerance (25px) * difficultyTolerance
- Checkpoint ratio = (vertices visited) / (vertices checked)

#### 3. Path Length Calculation
- Calculate total length of user's path by summing distances between consecutive points
- Calculate estimated perimeter of pattern by summing lengths of all edges
- Length ratio = min(pathLength / perimeter, 1.5) / 1.5
  (Caps at 1.5 to avoid over-rewarding excessively long paths)

#### 4. Final Score
```
score = (accuracy * 0.5) + (checkpointRatio * 100 * 0.3) + (lengthRatio * 100 * 0.2)
score = clamp(score, 0, 100)
roundedScore = Math.round(score)
```

#### 5. Rank and Damage Multiplier
| Rank | Score Range | Damage Multiplier | Description       |
|------|-------------|-------------------|-------------------|
| S    | 90-100      | 120%              | Perfect chant     |
| A    | 70-89       | 100%              | Precise chant     |
| B    | 50-69       | 70%               | Pass line         |
| C    | 0-49        | 0%                | Needs practice    |

## Difficulty Integration
- The scoring function receives a `difficultyTolerance` parameter (from DIFFICULTY_TOLERANCE in patterns.ts)
- This tolerance affects:
  - Vertex check threshold (higher = easier to hit vertices)
  - Maximum allowed error in accuracy calculation (higher = more lenient path accuracy)
- Note: Difficulty also affects scoring via `difficultyMultiplier` (applied separately in UI) and time limits

## Performance Considerations
- For patterns with many vertices (e.g., circle with 60 points), vertex checking is sampled to max 20 points
- Template points are generated on-demand but could be cached for static patterns
- Distance calculations are optimized by early termination when possible

## Usage Example
```typescript
import { calculateScore } from '@/lib/scoring';
import type { MagicCirclePattern } from '@/lib/patterns';
import { DIFFICULTY_TOLERANCE } from '@/lib/patterns';

const result = calculateScore(
  userPath,           // Array of {x: number, y: number} points
  currentPattern,     // MagicCirclePattern to trace against
  DIFFICULTY_TOLERANCE[difficulty] // e.g., 1.0 for normal, 1.5 for easy
);

// result.score: 0-100
// result.rank: 'S'|'A'|'B'|'C'
// result.damageMultiplier: e.g., '120%'
```

## Edge Cases
- User path too short (< 10 points): Returns immediate failure (score: 0, rank: 'C', damageMultiplier: '0%')
- No pattern provided: Relies on default values in function (should not happen in normal usage)
- Perfect tracing: Can achieve score up to 100 (then rank S with 120% damage multiplier)

## Design Notes
### Why This Algorithm?
- Balances precision (accuracy) with completeness (checkpoints) and reasonable stroke length
- Tolerance-based scaling allows same algorithm to work across difficulties
- Rank thresholds provide clear feedback and progression
- Damage multiplier ties directly to game mechanics (score → spell power)

### Possible Improvements
- Consider stroke velocity or pressure sensitivity (if available)
- Template matching with dynamic time warping for better shape matching
- Historical data to personalize difficulty or provide hints