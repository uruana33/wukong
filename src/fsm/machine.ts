// 状态机核心：优先级打断仲裁 + 帧锁定 + 取消窗口门控
//
// 四种转换方式：
//   NORMAL    - 常规流转（招式结束回 IDLE），受 minFrames 驻留帧约束
//   INTERRUPT - 强制打断（受击、死亡），由 interruptGate 动态仲裁优先级
//   CANCEL    - 取消派生（连招取消、闪避取消），由 canCancelInto 门控
//   FORCE     - 无视一切规则强转（慎用）
//
// 分层（HFSM-lite）：每个状态声明 group 与 priority。
// 受击层(HIT_STUN/DEAD)优先级高于动作层(ATTACK/DODGE)，动作层高于移动层(IDLE/MOVE)，
// 高优先级天然可以打断低优先级 —— "受击必定打断攻击"由此保证。

export type TransitionKind = 'NORMAL' | 'CANCEL' | 'INTERRUPT' | 'FORCE';

export interface StateDef<C> {
    name: string;
    /** 状态分组：'move' | 'action' | 'hit' | 'system'，用于文档与查询 */
    group?: string;
    /** 打断仲裁优先级：incoming.priority >= gate 才能打断本状态 */
    priority: number;
    /** NORMAL 离开本状态所需的最低驻留帧数（如招式须播完 totalFrames） */
    minFrames?: number | ((ctx: C) => number);
    /** 返回当前帧下打断本状态所需的最低优先级；缺省 = 自身 priority */
    interruptGate?: (ctx: C, frameInState: number) => number;
    /** CANCEL 门控：本状态在 frame 帧能否取消进入 target（payload 传目标动作数据） */
    canCancelInto?: (ctx: C, frameInState: number, target: string, payload?: unknown) => boolean;
    /** 进入条件，所有转换方式都会检查 */
    canEnter?: (ctx: C) => boolean;
    onEnter?: (ctx: C) => void;
    /** @param to 即将进入的状态名（同名再进入 = 状态内动作切换，如连招派生） */
    onExit?: (ctx: C, to: string) => void;
    onFrame?: (ctx: C, frameInState: number) => void;
}

export class StateMachine<C> {
    private readonly ctx: C;
    private states = new Map<string, StateDef<C>>();
    private currentDef: StateDef<C>;
    private _frameInState = 0;

    constructor(ctx: C, initial: StateDef<C>) {
        this.ctx = ctx;
        this.register(initial);
        this.currentDef = initial;
        initial.onEnter?.(this.ctx);
    }

    register(def: StateDef<C>): this {
        this.states.set(def.name, def);
        return this;
    }

    get current(): string {
        return this.currentDef.name;
    }

    /** 距进入当前状态经过的帧数（进入当帧为 0） */
    get frameInState(): number {
        return this._frameInState;
    }

    isIn(...names: string[]): boolean {
        return names.includes(this.current);
    }

    def(): StateDef<C> {
        return this.currentDef;
    }

    /**
     * 尝试状态转换，成功返回 true。
     * @param payload CANCEL 时传入目标动作数据，供 canCancelInto 验证
     */
    transition(name: string, kind: TransitionKind = 'NORMAL', payload?: unknown): boolean {
        const target = this.states.get(name);
        if (!target) throw new Error(`StateMachine: unknown state '${name}'`);

        const from = this.currentDef;
        if (from === target && kind === 'NORMAL') return false;
        if (!(target.canEnter?.(this.ctx) ?? true)) return false;

        const f = this._frameInState;
        let allowed: boolean;
        switch (kind) {
            case 'FORCE':
                allowed = true;
                break;
            case 'INTERRUPT':
                allowed = target.priority >= (from.interruptGate?.(this.ctx, f) ?? from.priority);
                break;
            case 'CANCEL':
                allowed = from.canCancelInto?.(this.ctx, f, name, payload) === true;
                break;
            case 'NORMAL': {
                const m = from.minFrames;
                allowed = f >= (typeof m === 'function' ? m(this.ctx) : (m ?? 0));
                break;
            }
        }
        if (!allowed) return false;

        from.onExit?.(this.ctx, name);
        this.currentDef = target;
        this._frameInState = 0;
        target.onEnter?.(this.ctx);
        return true;
    }

    /** 每帧推进：驻留帧 +1 并触发当前状态的 onFrame */
    update(): void {
        this._frameInState++;
        this.currentDef.onFrame?.(this.ctx, this._frameInState);
    }
}
