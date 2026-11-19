// 受击结算：伤害 → 削韧 → 硬直判定 → 击退位移
// 核心原则：硬直不靠死代码，靠 Poise(韧性) 动态计算 ——
// 小怪一刀硬直，大型 Boss 需要连续削韧，防止玩家无脑平 A。
import type { Entity, World } from '../ecs/world.ts';
import { CombatStatsComponent, KnockbackComponent, StateComponent } from './components.ts';
import { StateName } from './states.ts';

export type HitLevel = 'LIGHT' | 'HEAVY' | 'LAUNCH';

/** 攻击方携带的受击数据 */
export interface HitData {
    damage: number;
    hitLevel: HitLevel;
    /** 削韧值 */
    poiseDamage: number;
    /** 初始击退力度（实际速度 = force / weight） */
    knockbackForce: number;
    /** 基础硬直帧数，乘以受击等级系数 */
    hitStunFrames: number;
    /** 击退方向：1 向右，-1 向左 */
    direction?: 1 | -1;
}

/** 受击等级 → 硬直时间系数（挑飞最久） */
export const STUN_MULTIPLIER: Record<HitLevel, number> = {
    LIGHT: 1.0,
    HEAVY: 1.5,
    LAUNCH: 2.0,
};

export type HitResult = 'FLINCH' | 'HIT_STUN' | 'DEAD';

export interface HitResolution {
    result: HitResult;
    damage: number;
    stunFrames?: number;
    knockbackVelocity?: number;
}

/**
 * 结算一次命中。
 * - 伤害永远结算；hp <= 0 直接 DEAD
 * - 韧性被击破 或 受击等级为 LAUNCH → HIT_STUN（打断当前动作）、韧性重置、产生击退
 * - 韧性未破 → FLINCH 顿挫（掉血、播受击抖动，不打断动作 —— 霸体怪的手感）
 */
export function processHit(world: World, entity: Entity, hit: HitData): HitResolution {
    const stats = entity.require(CombatStatsComponent);
    const sm = entity.require(StateComponent).machine;

    stats.hp -= hit.damage;
    if (stats.hp <= 0) {
        stats.hp = 0;
        sm.transition(StateName.Dead, 'INTERRUPT');
        return { result: 'DEAD', damage: hit.damage };
    }

    stats.poise -= hit.poiseDamage;
    const poiseBroken = stats.poise <= 0;
    if (poiseBroken || hit.hitLevel === 'LAUNCH') {
        stats.poise = stats.maxPoise; // 破防后韧性重置
        const stunFrames = Math.round(hit.hitStunFrames * STUN_MULTIPLIER[hit.hitLevel]);
        stats.stunFrames = stunFrames;

        // 物理位移：速度 = 初始力度 / 体重；轻量级一刀飞出去，重型怪只是顿一下
        const velocity = hit.knockbackForce / stats.weight;
        if (velocity > 0) {
            entity.add(new KnockbackComponent(velocity, hit.direction ?? 1));
        }

        sm.transition(StateName.HitStun, 'INTERRUPT');
        entity.emit('HIT_STUN', { stunFrames, velocity, level: hit.hitLevel });
        return { result: 'HIT_STUN', damage: hit.damage, stunFrames, knockbackVelocity: velocity };
    }

    entity.emit('FLINCH', { level: hit.hitLevel });
    return { result: 'FLINCH', damage: hit.damage };
}
