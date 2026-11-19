// 极限完美闪避：帧窗口嵌套 + 时间缩放
// perfectWindow 是 iFrameWindow 的前段子集 —— 撞上判定的时机越极限，奖励越大。
import type { Entity, World } from '../ecs/world.ts';
import type { System } from '../ecs/types.ts';
import { DodgeComponent, ResourceComponent, StateComponent } from './components.ts';
import { StateName } from './states.ts';
import { processHit, type HitData } from './damage.ts';

/** 完美闪避奖励：全局时间放慢到 0.2 倍，持续 90 帧（1.5s），回复 20 能量 */
export const PERFECT_DODGE_TIMESCALE = 0.2;
export const PERFECT_DODGE_DURATION = 90;
export const PERFECT_DODGE_ENERGY = 20;

export type DodgeResult = 'PERFECT_DODGE' | 'DODGED' | 'HIT';

export interface DodgeResolution {
    hitResult: DodgeResult;
    damage: number;
}

/**
 * 结算一次针对闪避方的攻击。
 * - 完美窗口内撞上判定：触发子弹时间 + 资源奖励（一次闪避只奖励一次）
 * - 无敌帧内：免伤
 * - 否则：正常结算伤害（翻滚后摇被抓 = 该吃的伤）
 */
export function checkHitDuringDodge(world: World, defender: Entity, hit: HitData): DodgeResolution {
    const dodge = defender.get(DodgeComponent);
    if (dodge?.active) {
        const f = dodge.timer;
        // 完美窗口是无敌帧的前段子集，必须先判定
        if (f >= dodge.perfectWindow[0] && f <= dodge.perfectWindow[1] && !dodge.perfectFired) {
            dodge.perfectFired = true;
            world.setTimeScale(PERFECT_DODGE_TIMESCALE, PERFECT_DODGE_DURATION);
            defender.get(ResourceComponent)?.add('Energy', PERFECT_DODGE_ENERGY);
            defender.emit('PERFECT_DODGE', { frame: f });
            return { hitResult: 'PERFECT_DODGE', damage: 0 };
        }
        if (f >= dodge.iFrameWindow[0] && f <= dodge.iFrameWindow[1]) {
            defender.emit('DODGED', { frame: f });
            return { hitResult: 'DODGED', damage: 0 };
        }
    }
    const res = processHit(world, defender, hit);
    return { hitResult: 'HIT', damage: res.damage };
}

/** 闪避推进系统：DODGE 状态期间累计 timer，离开状态时重置 */
export const DodgeSystem: System = {
    name: 'DodgeSystem',
    update(world) {
        for (const e of world.query(StateComponent, DodgeComponent)) {
            const dodge = e.require(DodgeComponent);
            if (!dodge.active) continue;
            if (e.require(StateComponent).machine.current === StateName.Dodge) {
                dodge.timer++;
            } else {
                dodge.end();
            }
        }
    },
};
