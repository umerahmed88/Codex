import { levelForXp, levelProgress, XP_PER_LESSON } from '../lib/xp';

describe('levelForXp', () => {
  it('starts everyone at level 1', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(49)).toBe(1);
  });

  it('advances a level every 50 XP', () => {
    expect(levelForXp(50)).toBe(2);
    expect(levelForXp(100)).toBe(3);
    expect(levelForXp(125)).toBe(3);
  });

  it('never returns below level 1 for bad input', () => {
    expect(levelForXp(-10)).toBe(1);
  });
});

describe('levelProgress', () => {
  it('reports 0 progress right at a level boundary', () => {
    const p = levelProgress(50);
    expect(p.level).toBe(2);
    expect(p.currentLevelXp).toBe(50);
    expect(p.nextLevelXp).toBe(100);
    expect(p.progress).toBe(0);
  });

  it('reports half progress midway through a level', () => {
    const p = levelProgress(75);
    expect(p.level).toBe(2);
    expect(p.progress).toBeCloseTo(0.5);
  });
});

describe('XP_PER_LESSON', () => {
  it('is a positive constant', () => {
    expect(XP_PER_LESSON).toBeGreaterThan(0);
  });
});
