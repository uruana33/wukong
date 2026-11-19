// ECS World：实体管理、组件存储、帧驱动系统管线、全局时间缩放
import type { Component, EntityId, System, WorldEvent } from './types.ts';

export type ComponentClass<T extends object> = new (...args: never[]) => T;

export class Entity {
    readonly id: EntityId;
    private readonly world: World;
    private components = new Map<ComponentClass<object>, object>();

    constructor(id: EntityId, world: World) {
        this.id = id;
        this.world = world;
    }

    add<T extends object>(component: T): this {
        this.components.set(component.constructor as ComponentClass<object>, component);
        return this;
    }

    get<T extends object>(cls: ComponentClass<T>): T | undefined {
        return this.components.get(cls) as T | undefined;
    }

    require<T extends object>(cls: ComponentClass<T>): T {
        const c = this.get(cls);
        if (c === undefined) {
            throw new Error(`Entity ${this.id} missing component ${cls.name}`);
        }
        return c;
    }

    has<T extends object>(cls: ComponentClass<T>): boolean {
        return this.components.has(cls);
    }

    remove<T extends object>(cls: ComponentClass<T>): boolean {
        return this.components.delete(cls);
    }

    emit(type: string, data?: Record<string, unknown>): void {
        this.world.emit(this, type, data);
    }
}

export class World {
    private entities = new Map<EntityId, Entity>();
    private systems: System[] = [];
    private nextId: EntityId = 1;

    /** 当前逻辑帧（固定步进，动作游戏按帧结算） */
    frame = 0;

    /** 全局时间缩放：完美闪避触发的子弹时间 */
    timeScale = 1;
    private timeScaleTimer = 0;

    /** 本帧及历史事件队列：动画/音效/特效层从这里取，逻辑层不产生副作用 */
    readonly events: WorldEvent[] = [];

    createEntity(): Entity {
        const e = new Entity(this.nextId++, this);
        this.entities.set(e.id, e);
        return e;
    }

    destroyEntity(id: EntityId): boolean {
        return this.entities.delete(id);
    }

    getEntity(id: EntityId): Entity | undefined {
        return this.entities.get(id);
    }

    /** 查询拥有全部指定组件的实体 */
    query(...classes: ComponentClass<object>[]): Entity[] {
        const out: Entity[] = [];
        for (const e of this.entities.values()) {
            if (classes.every((c) => e.has(c))) out.push(e);
        }
        return out;
    }

    addSystem(system: System): this {
        this.systems.push(system);
        return this;
    }

    emit(entity: Entity | EntityId, type: string, data?: Record<string, unknown>): void {
        const id = typeof entity === 'number' ? entity : entity.id;
        this.events.push({ frame: this.frame, entity: id, type, data });
    }

    /** 触发全局时间缩放（子弹时间），durationFrames 帧后自动恢复 */
    setTimeScale(scale: number, durationFrames: number): void {
        this.timeScale = scale;
        this.timeScaleTimer = Math.max(0, Math.floor(durationFrames));
    }

    /** 推进一个逻辑帧：先结算时间缩放，再按序运行所有系统 */
    tick(frames = 1): void {
        for (let i = 0; i < frames; i++) {
            this.frame++;
            if (this.timeScaleTimer > 0 && --this.timeScaleTimer === 0) {
                this.timeScale = 1;
            }
            for (const s of this.systems) s.update(this);
        }
    }
}
