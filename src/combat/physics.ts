// 击退位移系统：速度按帧摩擦衰减，归零时移除组件
import type { System } from '../ecs/types.ts';
import { KnockbackComponent, PositionComponent } from './components.ts';

export const KnockbackSystem: System = {
    name: 'KnockbackSystem',
    update(world) {
        for (const e of world.query(KnockbackComponent, PositionComponent)) {
            const kb = e.require(KnockbackComponent);
            const pos = e.require(PositionComponent);
            pos.x += kb.velocity * kb.direction * world.timeScale;
            kb.velocity -= kb.decel * world.timeScale;
            if (kb.velocity <= 0) e.remove(KnockbackComponent);
        }
    },
};
