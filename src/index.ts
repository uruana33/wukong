// Wukong Action Engine —— 公开 API 出口
export { World, Entity } from './ecs/world.ts';
export type { Component, EntityId, System, WorldEvent } from './ecs/types.ts';
export { InputBuffer, InputType } from './input/buffer.ts';
export { StateMachine } from './fsm/machine.ts';
export type { StateDef, TransitionKind } from './fsm/machine.ts';

export { ActionId, getActionData, STARTUP_ACTIONS } from './combat/data.ts';
export type { ActionData, CancelWindow } from './combat/data.ts';
export {
    ActionComponent,
    CombatStatsComponent,
    DodgeComponent,
    InputComponent,
    KnockbackComponent,
    PositionComponent,
    ResourceComponent,
    StateComponent,
} from './combat/components.ts';
export type { CombatContext } from './combat/components.ts';
export { buildStateMachine, StateMachineSystem, StateName, StatePriority } from './combat/states.ts';
export { ActionSystem, CombatInputSystem, ComboSystem, markAttackConnected, playAction } from './combat/action.ts';
export { processHit, STUN_MULTIPLIER } from './combat/damage.ts';
export type { HitData, HitLevel, HitResolution, HitResult } from './combat/damage.ts';
export { checkHitDuringDodge, DodgeSystem } from './combat/dodge.ts';
export type { DodgeResolution, DodgeResult } from './combat/dodge.ts';
export { KnockbackSystem } from './combat/physics.ts';
export { createCombatWorld, spawnFighter } from './combat/setup.ts';
export type { FighterOptions } from './combat/setup.ts';
