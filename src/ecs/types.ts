// ECS 基础定义
export type EntityId = number;

export interface Component {
    // 组件基类
}

export interface System {
    update(entities: EntityId[], deltaTime: number): void;
}
