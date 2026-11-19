// 动作与连招系统：数据驱动的招式播放、输入映射、取消窗口连段
import type { Entity, World } from '../ecs/world.ts';
import type { System } from '../ecs/types.ts';
import type { TransitionKind } from '../fsm/machine.ts';
import { getActionData, STARTUP_ACTIONS, type ActionData } from './data.ts';
import {
    ActionComponent,
    CombatStatsComponent,
    DodgeComponent,
    InputComponent,
    StateComponent,
} from './components.ts';
import { StateName } from './states.ts';

/**
 * 播放动作的统一入口：先过状态机门控（NORMAL/CANCEL/INTERRUPT/FORCE），
 * 通过后挂载动作数据；闪避类动作同步初始化无敌帧窗口。
 */
export function playAction(entity: Entity, actionId: number, kind: TransitionKind = 'NORMAL'): boolean {
    const data = getActionData(actionId);
    const sm = entity.require(StateComponent).machine;
    if (!sm.transition(data.state, kind, data)) return false;

    entity.require(ActionComponent).play(data);
    if (data.state === StateName.Dodge && data.iFrames && data.perfectWindow) {
        entity.require(DodgeComponent).begin(data.iFrames, data.perfectWindow);
    }
    entity.emit('ACTION_START', { actionId: data.actionId, name: data.name, kind });
    return true;
}

/** 命中确认：伤害实际结算时调用，解锁 requireHit 的取消窗口 */
export function markAttackConnected(entity: Entity): void {
    const action = entity.get(ActionComponent);
    if (action) action.hasHitTarget = true;
}

/** 玩家输入系统：移动层状态下把缓冲输入映射为起手动作 */
export const CombatInputSystem: System = {
    name: 'CombatInputSystem',
    update(world) {
        for (const e of world.query(StateComponent, ActionComponent, InputComponent)) {
            const sm = e.require(StateComponent).machine;
            if (!sm.isIn(StateName.Idle, StateName.Move)) continue;

            const buffer = e.require(InputComponent).buffer;
            buffer.prune(world.frame);
            // 优先级：闪避 > 重击 > 轻击
            for (const input of ['DODGE', 'HEAVY_ATTACK', 'LIGHT_ATTACK'] as const) {
                const actionId = STARTUP_ACTIONS[input];
                if (actionId !== undefined && buffer.consume(input, world.frame)) {
                    playAction(e, actionId, 'NORMAL');
                    break;
                }
            }
        }
    },
};

/** 连招系统：攻击状态中扫描取消窗口，消费缓冲输入派生下一动作 */
export const ComboSystem: System = {
    name: 'ComboSystem',
    update(world) {
        for (const e of world.query(StateComponent, ActionComponent, InputComponent)) {
            const sm = e.require(StateComponent).machine;
            if (sm.current !== StateName.Attack) continue;

            const actionComp = e.require(ActionComponent);
            const action = actionComp.current;
            if (!action) continue;

            const buffer = e.require(InputComponent).buffer;
            for (const cw of action.cancelWindows) {
                const f = actionComp.frameInAction;
                if (f < cw.window[0] || f > cw.window[1]) continue;
                if (cw.requireHit && !actionComp.hasHitTarget) continue;
                if (buffer.consume(cw.triggerInput, world.frame)) {
                    playAction(e, cw.targetActionId, 'CANCEL');
                    break;
                }
            }
        }
    },
};

/**
 * 动作推进系统：帧计数、判定帧事件、动作播完自动回 IDLE。
 * 每帧在判定窗口内的动作发出 HITBOX_ACTIVE 事件，由碰撞/联机层消费；
 * 命中方通过 markAttackConnected 回写 hasHitTarget。
 */
export const ActionSystem: System = {
    name: 'ActionSystem',
    update(world) {
        for (const e of world.query(StateComponent, ActionComponent)) {
            const sm = e.require(StateComponent).machine;
            const actionComp = e.require(ActionComponent);
            const action = actionComp.current;
            if (!action || sm.current !== action.state) continue;

            const f = actionComp.frameInAction;
            if (action.hitboxActive && f >= action.hitboxActive[0] && f <= action.hitboxActive[1]) {
                e.emit('HITBOX_ACTIVE', { actionId: action.actionId, frameInAction: f, hit: action.hit });
            }

            actionComp.frameInAction++;
            if (actionComp.frameInAction > action.totalFrames) {
                sm.transition(StateName.Idle, 'NORMAL');
            }
        }
    },
};
