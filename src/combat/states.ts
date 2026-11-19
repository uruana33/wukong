// 战斗状态定义：移动层 / 动作层 / 受击层 三层优先级模型
//
//   DEAD(100)                    最高，一切转换的终点
//   HIT_STUN(80)                 受击层 —— 必定打断攻击与闪避
//   DODGE(40) / ATTACK(30)       动作层 —— 只能被受击层 INTERRUPT；
//                                动作之间的流转一律走 CANCEL（取消窗口）
//   MOVE(10) / IDLE(0)           移动层 —— 任意更高优先级都可打断
import type { System } from '../ecs/types.ts';
import { StateMachine, type StateDef } from '../fsm/machine.ts';
import type { ActionData } from './data.ts';
import { getActionData } from './data.ts';
import { ActionComponent, CombatStatsComponent, StateComponent, type CombatContext } from './components.ts';

export const StatePriority = {
    Idle: 0,
    Move: 10,
    Attack: 30,
    Dodge: 40,
    HitStun: 80,
    Dead: 100,
} as const;

export const StateName = {
    Idle: 'IDLE',
    Move: 'MOVE',
    Attack: 'ATTACK',
    Dodge: 'DODGE',
    HitStun: 'HIT_STUN',
    Dead: 'DEAD',
} as const;

export type StateName = (typeof StateName)[keyof typeof StateName];

const P = StatePriority;
const N = StateName;

function currentAction(ctx: CombatContext): ActionData | null {
    return ctx.entity.get(ActionComponent)?.current ?? null;
}

/** 动作状态共用：驻留帧 = 当前动作总帧数；只有受击层能强行打断 */
function actionState(name: StateName, priority: number): StateDef<CombatContext> {
    return {
        name,
        group: 'action',
        priority,
        minFrames: (ctx) => currentAction(ctx)?.totalFrames ?? 0,
        interruptGate: () => P.HitStun, // 受击必定打断攻击；同层不允许 INTERRUPT，派生必须走 CANCEL
        canCancelInto: (ctx, frame, target, payload) => {
            const action = currentAction(ctx);
            const targetAction = payload as ActionData | undefined;
            if (!action || !targetAction || targetAction.state !== target) return false;
            return action.cancelWindows.some(
                (cw) =>
                    cw.targetActionId === targetAction.actionId &&
                    frame >= cw.window[0] &&
                    frame <= cw.window[1] &&
                    (!cw.requireHit || ctx.entity.get(ActionComponent)?.hasHitTarget === true),
            );
        },
        onExit: (ctx, to) => {
            // 同名再进入是状态内动作切换（连招派生），由 playAction 重载动作数据，不清空
            if (to !== name) ctx.entity.get(ActionComponent)?.clear();
        },
    };
}

const ATTACK = actionState(N.Attack, P.Attack);
const DODGE = actionState(N.Dodge, P.Dodge);

const IDLE: StateDef<CombatContext> = { name: N.Idle, group: 'move', priority: P.Idle };
const MOVE: StateDef<CombatContext> = { name: N.Move, group: 'move', priority: P.Move };

const HIT_STUN: StateDef<CombatContext> = {
    name: N.HitStun,
    group: 'hit',
    priority: P.HitStun,
    // 硬直期间只允许同级（再次受击刷新）或 DEAD 打断
    interruptGate: () => P.HitStun,
    minFrames: (ctx) => ctx.entity.get(CombatStatsComponent)?.stunFrames ?? 0,
    onFrame: (ctx) => {
        const stats = ctx.entity.get(CombatStatsComponent);
        if (!stats) return;
        if (--stats.stunFrames <= 0) {
            stats.stunFrames = 0;
            ctx.entity.require(StateComponent).machine.transition(N.Idle, 'FORCE');
        }
    },
};

const DEAD: StateDef<CombatContext> = {
    name: N.Dead,
    group: 'system',
    priority: P.Dead,
    interruptGate: () => Infinity, // 死亡是终点，不可被打断
    onEnter: (ctx) => ctx.entity.emit('DEATH'),
};

/** 为实体构建完整的战斗状态机 */
export function buildStateMachine(ctx: CombatContext): StateMachine<CombatContext> {
    return new StateMachine<CombatContext>(ctx, IDLE).register(MOVE).register(ATTACK).register(DODGE).register(HIT_STUN).register(DEAD);
}

/** 状态机驱动系统：每帧推进所有实体的状态机（注册在管线末尾） */
export const StateMachineSystem: System = {
    name: 'StateMachineSystem',
    update(world) {
        for (const e of world.query(StateComponent)) {
            e.require(StateComponent).machine.update();
        }
    },
};
