// 战斗世界装配：注册系统管线、生成战斗实体
//
// 管线顺序（每帧依次执行）：
//   CombatInputSystem   玩家输入 → 起手动作
//   ComboSystem         取消窗口连段
//   ActionSystem        动作帧推进 + 判定帧事件 + 播完回 IDLE
//   DodgeSystem         闪避计时
//   KnockbackSystem     击退位移衰减
//   StateMachineSystem  状态机推进（最后，结算本帧产生的转换）
import { World, type Entity } from '../ecs/world.ts';
import {
    ActionComponent,
    CombatStatsComponent,
    DodgeComponent,
    InputComponent,
    PositionComponent,
    ResourceComponent,
    StateComponent,
    type CombatContext,
} from './components.ts';
import { buildStateMachine, StateMachineSystem } from './states.ts';
import { ActionSystem, CombatInputSystem, ComboSystem } from './action.ts';
import { DodgeSystem } from './dodge.ts';
import { KnockbackSystem } from './physics.ts';

export function createCombatWorld(): World {
    return new World()
        .addSystem(CombatInputSystem)
        .addSystem(ComboSystem)
        .addSystem(ActionSystem)
        .addSystem(DodgeSystem)
        .addSystem(KnockbackSystem)
        .addSystem(StateMachineSystem);
}

export interface FighterOptions {
    maxHp?: number;
    maxPoise?: number;
    weight?: number;
    /** 玩家侧实体才有输入缓冲 */
    playerControlled?: boolean;
}

/** 生成一个战斗实体：挂好状态机与全部战斗组件 */
export function spawnFighter(world: World, opts: FighterOptions = {}): Entity {
    const e = world.createEntity();
    const ctx: CombatContext = { entity: e, world };
    e.add(new StateComponent(buildStateMachine(ctx)))
        .add(new ActionComponent())
        .add(new CombatStatsComponent(opts.maxHp ?? 100, opts.maxPoise ?? 30, opts.weight ?? 1))
        .add(new DodgeComponent())
        .add(new PositionComponent())
        .add(new ResourceComponent());
    if (opts.playerControlled) e.add(new InputComponent());
    return e;
}
