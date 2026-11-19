// ECS 基础定义
import type { World } from './world.ts';

export type EntityId = number;

// 组件基类：任意纯数据对象，按构造器类型挂载到实体上
export interface Component {}

// 逻辑系统：每帧由 World.tick 按注册顺序驱动
export interface System {
    readonly name?: string;
    update(world: World): void;
}

// 可发出的事件：引擎层（动画/音效/特效）订阅消费，逻辑层只负责发
export interface WorldEvent {
    frame: number;
    entity: EntityId;
    type: string;
    data?: Record<string, unknown>;
}
