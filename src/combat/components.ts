// 战斗组件：挂载到实体上的纯数据
import type { Entity, World } from '../ecs/world.ts';
import type { StateMachine } from '../fsm/machine.ts';
import type { ActionData } from './data.ts';
import { InputBuffer } from '../input/buffer.ts';

/** 传给状态机钩子与门控函数的上下文 */
export interface CombatContext {
    entity: Entity;
    world: World;
}

/** 状态机组件：实体的行为中枢 */
export class StateComponent {
    readonly machine: StateMachine<CombatContext>;

    constructor(machine: StateMachine<CombatContext>) {
        this.machine = machine;
    }
}

/** 当前动作与连段进度 */
export class ActionComponent {
    current: ActionData | null = null;
    /** 当前动作已播放帧数 */
    frameInAction = 0;
    /** 本次动作是否已命中过目标（requireHit 取消的凭据） */
    hasHitTarget = false;

    play(data: ActionData): void {
        this.current = data;
        this.frameInAction = 0;
        this.hasHitTarget = false;
    }

    clear(): void {
        this.current = null;
        this.frameInAction = 0;
        this.hasHitTarget = false;
    }
}

/** 战斗属性：血量 / 韧性 / 体重 —— 打击感的数据来源 */
export class CombatStatsComponent {
    hp: number;
    poise: number;
    maxHp: number;
    maxPoise: number;
    weight: number;
    /** 受击硬直剩余帧数，由 processHit 写入、HIT_STUN 状态消费 */
    stunFrames = 0;

    constructor(maxHp: number, maxPoise: number, weight: number) {
        this.maxHp = maxHp;
        this.maxPoise = maxPoise;
        this.weight = weight;
        this.hp = maxHp;
        this.poise = maxPoise;
    }
}

/** 2D 位置（逻辑层只关心朝向轴上的位移） */
export class PositionComponent {
    x: number;
    y: number;

    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
}

/** 受创位移：速度按帧衰减，weight 越大初速越小 —— "位移带物理感" */
export class KnockbackComponent {
    velocity: number;
    direction: 1 | -1;
    /** 每帧速度衰减（摩擦系数） */
    decel: number;

    constructor(velocity: number, direction: 1 | -1 = 1, decel = 1.5) {
        this.velocity = velocity;
        this.direction = direction;
        this.decel = decel;
    }
}

/** 闪避状态：无敌帧 / 完美闪避窗口由动作数据注入 */
export class DodgeComponent {
    active = false;
    timer = 0;
    iFrameWindow: [number, number] = [0, 0];
    perfectWindow: [number, number] = [0, 0];
    /** 一次闪避只触发一次完美闪避奖励 */
    perfectFired = false;

    begin(iFrames: [number, number], perfect: [number, number]): void {
        this.active = true;
        this.timer = 0;
        this.iFrameWindow = iFrames;
        this.perfectWindow = perfect;
        this.perfectFired = false;
    }

    end(): void {
        this.active = false;
        this.timer = 0;
    }
}

/** 输入缓冲挂载点（玩家侧实体才有） */
export class InputComponent {
    readonly buffer = new InputBuffer();
}

/** 能量等资源条：完美闪避奖励、技能消耗 */
export class ResourceComponent {
    private values = new Map<string, number>();

    add(name: string, amount: number): number {
        const v = (this.values.get(name) ?? 0) + amount;
        this.values.set(name, v);
        return v;
    }

    get(name: string): number {
        return this.values.get(name) ?? 0;
    }
}
