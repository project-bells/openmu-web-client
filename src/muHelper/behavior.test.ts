import { describe, expect, it } from 'vitest';
import { MonsterActionType, PlayerAction } from '../common/objects/enum';
import type { Entity } from '../ecs/world';
import {
  activationConditionMatches,
  isManaRestoringPotion,
  isMonsterAttacking,
} from './behavior';

describe('MU Helper target behavior', () => {
  it('recognizes mana and complex potions but not HP-only potions', () => {
    expect(isManaRestoringPotion(14, 4)).toBe(true);
    expect(isManaRestoringPotion(14, 6)).toBe(true);
    expect(isManaRestoringPotion(14, 38)).toBe(true);
    expect(isManaRestoringPotion(14, 40)).toBe(true);
    expect(isManaRestoringPotion(14, 3)).toBe(false);
    expect(isManaRestoringPotion(14, 7)).toBe(false);
    expect(isManaRestoringPotion(13, 4)).toBe(false);
  });

  it('recognizes visible monster attack animations, not other actions', () => {
    expect(
      isMonsterAttacking({
        npcType: 1,
        monsterAnimation: { action: MonsterActionType.Attack2 },
      })
    ).toBe(true);
    expect(
      isMonsterAttacking({
        npcType: 1,
        monsterAnimation: { action: MonsterActionType.Shock },
      })
    ).toBe(false);
    expect(
      isMonsterAttacking({
        playerAnimation: { action: PlayerAction.PLAYER_ATTACK_FIST, run: 0 },
      })
    ).toBe(false);
  });

  it('recognizes attack animations on player-rig monsters', () => {
    const monster: Entity = {
      npcType: 1,
      playerAnimation: { action: PlayerAction.PLAYER_ATTACK_FIST, run: 0 },
    };

    expect(isMonsterAttacking(monster)).toBe(true);
  });

  it('uses the selected mob basis for conditional skills', () => {
    const nearby = {
      onTimer: false,
      onCondition: true,
      basis: 'nearby' as const,
      minMobs: 3,
    };
    const attacking = { ...nearby, basis: 'attacking' as const };

    expect(activationConditionMatches(nearby, 0, 10, 3, 0)).toBe(true);
    expect(activationConditionMatches(attacking, 0, 10, 3, 2)).toBe(false);
    expect(activationConditionMatches(attacking, 0, 10, 3, 3)).toBe(true);
  });

  it('fires timer skills at the interval boundary after the first second', () => {
    const timer = {
      onTimer: true,
      onCondition: false,
      basis: 'nearby' as const,
      minMobs: 2,
    };

    expect(activationConditionMatches(timer, 5, 0, 0, 0)).toBe(false);
    expect(activationConditionMatches(timer, 5, 10, 0, 0)).toBe(true);
    expect(activationConditionMatches(timer, 5, 10, 0, 0, true)).toBe(false);
    expect(activationConditionMatches(timer, 5, 11, 0, 0)).toBe(false);
  });
});
