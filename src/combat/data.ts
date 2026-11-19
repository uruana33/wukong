// 动作数据表：数据驱动的招式定义
// 策划改数值只动这张表，不碰逻辑 —— "判定帧不靠感觉靠数据"
import type { InputType } from '../input/buffer.ts';
import type { HitData } from './damage.ts';

export const ActionId = {
    Light1: 1,
    Light2: 2,
    Light3: 3,
    Heavy: 10,
    Dodge: 20,
} as const;

export type ActionId = (typeof ActionId)[keyof typeof ActionId];

/** 取消窗口：当前动作的 [start, end] 帧区间内，缓存了 triggerInput 则可派生 targetActionId */
export interface CancelWindow {
    triggerInput: InputType;
    targetActionId: number;
    window: [number, number];
    /** true = 必须命中目标才允许派生（挥空不可连段，"连招不白嫖"） */
    requireHit: boolean;
}

export interface ActionData {
    actionId: number;
    name: string;
    /** 该动作归属的状态（攻击动作在 ATTACK，闪避在 DODGE） */
    state: string;
    totalFrames: number;
    /** 攻击判定帧区间 [起始帧, 结束帧]，只在区间内有伤害判定 */
    hitboxActive?: [number, number];
    /** 命中时携带的受击数据（传给受击方 processHit） */
    hit?: HitData;
    /** 无敌帧窗口（闪避类动作用） */
    iFrames?: [number, number];
    /** 完美闪避判定窗口，必须嵌套在 iFrames 前段 */
    perfectWindow?: [number, number];
    cancelWindows: CancelWindow[];
}

// 三段轻击连 + 重击 + 闪避的示例配置（数值按 60fps 逻辑帧）
const ACTIONS: Record<number, ActionData> = {
    [ActionId.Light1]: {
        actionId: ActionId.Light1,
        name: 'LIGHT_1',
        state: 'ATTACK',
        totalFrames: 24,
        hitboxActive: [7, 11],
        hit: { damage: 8, hitLevel: 'LIGHT', poiseDamage: 15, knockbackForce: 4, hitStunFrames: 12 },
        cancelWindows: [
            { triggerInput: 'LIGHT_ATTACK', targetActionId: ActionId.Light2, window: [14, 20], requireHit: true },
            { triggerInput: 'DODGE', targetActionId: ActionId.Dodge, window: [16, 22], requireHit: false },
        ],
    },
    [ActionId.Light2]: {
        actionId: ActionId.Light2,
        name: 'LIGHT_2',
        state: 'ATTACK',
        totalFrames: 26,
        hitboxActive: [8, 12],
        hit: { damage: 10, hitLevel: 'LIGHT', poiseDamage: 15, knockbackForce: 5, hitStunFrames: 12 },
        cancelWindows: [
            { triggerInput: 'LIGHT_ATTACK', targetActionId: ActionId.Light3, window: [15, 21], requireHit: true },
            { triggerInput: 'DODGE', targetActionId: ActionId.Dodge, window: [16, 23], requireHit: false },
        ],
    },
    [ActionId.Light3]: {
        actionId: ActionId.Light3,
        name: 'LIGHT_3_FINISH',
        state: 'ATTACK',
        totalFrames: 34,
        hitboxActive: [11, 17],
        hit: { damage: 18, hitLevel: 'HEAVY', poiseDamage: 40, knockbackForce: 12, hitStunFrames: 18 },
        cancelWindows: [
            { triggerInput: 'DODGE', targetActionId: ActionId.Dodge, window: [22, 30], requireHit: false },
        ],
    },
    [ActionId.Heavy]: {
        actionId: ActionId.Heavy,
        name: 'HEAVY',
        state: 'ATTACK',
        totalFrames: 42,
        hitboxActive: [18, 24],
        hit: { damage: 25, hitLevel: 'LAUNCH', poiseDamage: 60, knockbackForce: 18, hitStunFrames: 24 },
        cancelWindows: [
            { triggerInput: 'DODGE', targetActionId: ActionId.Dodge, window: [26, 34], requireHit: false },
        ],
    },
    [ActionId.Dodge]: {
        actionId: ActionId.Dodge,
        name: 'DODGE_ROLL',
        state: 'DODGE',
        totalFrames: 18,
        iFrames: [1, 10],
        perfectWindow: [1, 4],
        cancelWindows: [],
    },
};

export function getActionData(actionId: number): ActionData {
    const data = ACTIONS[actionId];
    if (!data) throw new Error(`Unknown actionId: ${actionId}`);
    return data;
}

/** 输入到起手动作的默认映射（移动/空闲状态下按什么键出什么招） */
export const STARTUP_ACTIONS: Partial<Record<InputType, ActionId>> = {
    LIGHT_ATTACK: ActionId.Light1,
    HEAVY_ATTACK: ActionId.Heavy,
    DODGE: ActionId.Dodge,
};
