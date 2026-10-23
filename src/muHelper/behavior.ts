import { MonsterActionType } from '../common/objects/enum';
import { isPlayerAttackAction } from '../common/playerActionMapper';
import type { Entity } from '../ecs/world';
import type { ActivationCondition } from './config';

export function isManaRestoringPotion(group: number, num: number): boolean {
  return group === 14 && ((num >= 4 && num <= 6) || (num >= 38 && num <= 40));
}

export function isMonsterAttacking(entity: Entity): boolean {
  if (entity.npcType === undefined) return false;

  const monsterAction = entity.monsterAnimation?.action;
  if (
    monsterAction === MonsterActionType.Attack1 ||
    monsterAction === MonsterActionType.Attack2 ||
    monsterAction === MonsterActionType.Attack3 ||
    monsterAction === MonsterActionType.Attack4
  ) {
    return true;
  }

  const playerAction = entity.playerAnimation?.action;
  return playerAction !== undefined && isPlayerAttackAction(playerAction);
}

export function activationConditionMatches(
  condition: ActivationCondition,
  interval: number,
  elapsedSeconds: number,
  nearbyMobs: number,
  attackingMobs: number,
  timerAlreadyTriggered = false
): boolean {
  if (
    condition.onTimer &&
    !timerAlreadyTriggered &&
    interval > 0 &&
    elapsedSeconds > 0 &&
    elapsedSeconds % interval === 0
  ) {
    return true;
  }

  if (!condition.onCondition) return false;
  const mobs =
    condition.basis === 'attacking' ? attackingMobs : nearbyMobs;
  return mobs >= condition.minMobs;
}
