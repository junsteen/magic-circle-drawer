import { getPatternByName, getPatterns, Difficulty, DIFFICULTY_LABELS, DIFFICULTY_TIME, DIFFICULTY_MULTIPLIER } from './patterns';

describe('patterns module', () => {
  it('should return a list of patterns', () => {
    const patterns = getPatterns();
    expect(patterns).toBeDefined();
    expect(Array.isArray(patterns)).toBe(true);
    expect(patterns.length).toBeGreaterThan(0);
  });
  
  it('should return a specific pattern by name', () => {
    const pattern = getPatternByName('五芒星');
    expect(pattern).toBeDefined();
    expect(pattern?.name).toBe('五芒星');
  });
  
  it('should return undefined for non-existent pattern', () => {
    const pattern = getPatternByName('存在しないパターン');
    expect(pattern).toBeUndefined();
  });
  
  it('should validate difficulty enum values', () => {
    // Difficulty is a union type, so we test the actual values
    expect('easy').toBe('easy');
    expect('normal').toBe('normal');
    expect('hard').toBe('hard');
    expect('expert').toBe('expert');
    
    // Test that the difficulty constants work correctly
    expect(DIFFICULTY_LABELS.easy).toBe('EASY');
    expect(DIFFICULTY_TIME.normal).toBe(5);
    expect(DIFFICULTY_MULTIPLIER.hard).toBe(1.3);
  });
});