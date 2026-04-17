# 🧪 Testing

## Overview
This document covers the testing approach and test files used in the Arcane Tracer application to ensure functionality and prevent regressions.

## Test Files

### shareUtils.test.ts (`src/lib/shareUtils.test.ts`)
A demonstration/test file showcasing the data compression capabilities of the share utilities.

#### Purpose
This file serves both as:
1. A functional test of the compression/decompression algorithms
2. A demonstration of the size savings achieved through optimization
3. A way to verify data integrity throughout the compression cycle

#### Test Data Structure
The test uses a sample magic circle drawing with:
- **Pattern**: 五芒星 (Pentagram) with 5 vertices
- **Edges**: Star pattern connections (0→2→4→1→3→0)
- **Circles**: Two concentric circles
- **DrawLogs**: Two strokes with start/move/end events
- **Score**: 95 (S rank)
- **Difficulty**: hard (1.3x multiplier)
- **Damage Multiplier**: "2.0x"

#### Testing Process
1. **Baseline Measurement**: Calculate original JSON size
2. **Original Compression**: Test `compressForUrl()` and `decompressFromUrl()`
3. **Optimized Compression**: Test `compressForUrlOptimized()` and `decompressFromUrlOptimized()`
4. **Ratio Comparison**: Show percentage size reduction
5. **Improvement Calculation**: Show how much smaller optimized is vs original
6. **Integrity Checks**: Verify decompressed data matches original exactly

#### Sample Output
When run, the test produces output similar to:
```
Testing share data compression...
Original JSON size: 523
Original compressed size: 142
Original compression ratio: 72.85%
Optimized compressed size: 96
Optimized compression ratio: 81.64
Improvement: 32.39% smaller
Original decompression successful: true
Original data integrity check: true
Optimized decompression successful: true
Optimized data integrity check: true
```

#### Key Metrics Demonstrated
- **Compression Ratio**: Percentage reduction from original size
- **Size Savings**: Absolute bytes saved
- **Improvement**: Additional savings from optimization over standard compression
- **Data Integrity**: 100% accuracy verified through string comparison

## Testing Approach

### Manual Verification
Currently, testing is primarily manual through:
1. **Visual Inspection**: Checking UI behavior and output
2. **Console Logging**: Using test files like shareUtils.test.ts to output results
3. **Browser Testing**: Manual verification across devices and browsers
4. **Edge Case Testing**: Trying boundary conditions and error states

### Automated Testing Considerations
For future enhancement, the project could incorporate:
1. **Unit Testing Framework**: Jest or Vitest for lib functions
2. **Component Testing**: React Testing Library for UI components
3. **E2E Testing**: Cypress or Playwright for user flows
4. **Test Scripts**: npm test command to run all tests
5. **CI Integration**: GitHub Actions for automated testing on push

## Areas Covered by Tests
The shareUtils test specifically validates:
- **Data Compression**: Both standard and optimized methods
- **Round-trip Integrity**: Compress → decompress yields original
- **Size Efficiency**: Measurable compression benefits
- **Backward Compatibility**: Optimized format detects and handles legacy data
- **Error Handling**: Graceful failure with invalid inputs

## Testing Guidelines

### When to Add Tests
1. **New Features**: Add tests for new lib functions or complex logic
2. **Bug Fixes**: Add regression tests to prevent recurrence
3. **Complex Algorithms**: Test scoring, pattern generation, compression
4. **Edge Cases**: Validate behavior with extreme or unusual inputs

### What to Test
1. **Pure Functions**: Scoring, pattern generation, math utilities
2. **Utility Functions**: Data transformation, compression, formatting
3. **State Transitions**: Hook logic and state changes
4. **Integration Points**: How modules work together

### Test Organization
- Keep tests alongside implementation (`*.test.ts`)
- Use descriptive test names showing expected behavior
- Test both success and failure paths
- Mock external dependencies when needed
- Focus on behavior over implementation details

## Running Tests
Currently, to run the shareUtils test:
```bash
# Using Node.js directly
ts-node src/lib/shareUtils.test.ts

# Or compile and run
tsc src/lib/shareUtils.test.ts
node src/lib/shareUtils.test.js
```

## Future Testing Strategy
1. **Unit Tests**: Test individual functions in isolation
2. **Snapshot Tests**: For UI components and complex objects
3. **Visual Regression**: For styling and layout changes
4. **Performance Tests**: Ensure optimizations don't degrade performance
5. **Accessibility Tests**: Verify ARIA labels, contrast, keyboard navigation
6. **PWA Tests**: Validate offline functionality and installability

## Current Limitations
- No formal test framework configured
- Tests must be run manually
- Limited test coverage (primarily shareUtils)
- No automated test execution in CI/CD
- No test coverage reporting

## Recommendations for Enhancement
1. **Add Jest/Vitest**: Configure test framework with TypeScript support
2. **Expand Test Coverage**: Add tests for scoring, patterns, hooks
3. **Add Test Script**: Add `"test": "vitest"` to package.json
4. **Setup CI**: Add GitHub Actions to run tests on push/PR
5. **Add Test Reporting**: Configure coverage reports
6. **Document Testing**: Add contributing guidelines for writing tests

## Example Test Structure (Future)
```typescript
// Example test for scoring function
import { describe, it, expect } from 'vitest'
import { calculateScore } from '@/lib/scoring'
import type { MagicCirclePattern } from '@/lib/patterns'

describe('calculateScore', () => {
  it('should return S rank for perfect tracing', () => {
    // Arrange
    const pattern: MagicCirclePattern = { /* ... */ }
    const userPath = pattern.vertices.map(v => ({ x: v.x, y: v.y }))
    
    // Act
    const result = calculateScore(userPath, pattern, 1.0)
    
    // Assert
    expect(result.rank).toBe('S')
    expect(result.score).toBeGreaterThanOrEqual(90)
  })
})
```

## Conclusion
While currently limited to a demonstration test for share utilities, the testing foundation shows commitment to verifying correctness and measuring optimization impact. Expanding this approach to other parts of the codebase would significantly improve reliability and maintainability.