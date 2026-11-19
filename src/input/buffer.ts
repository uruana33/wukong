// 输入缓冲：玩家在招式后摇/硬直中提前按下的指令会被缓存一小段时间
// 到取消窗口开启时被系统消费，这是连招"不卡手"的来源

export const InputType = {
    LightAttack: 'LIGHT_ATTACK',
    HeavyAttack: 'HEAVY_ATTACK',
    Dodge: 'DODGE',
    Jump: 'JUMP',
    Skill1: 'SKILL_1',
} as const;

export type InputType = (typeof InputType)[keyof typeof InputType];

interface BufferedInput {
    type: InputType;
    /** 输入发生的逻辑帧 */
    frame: number;
    /** 按下时长（帧），预留用于蓄力/长按判定 */
    heldFrames: number;
}

export class InputBuffer {
    /** 输入有效窗口（帧），默认 12 帧 ≈ 60fps 下 200ms */
    readonly windowFrames: number;
    private queue: BufferedInput[] = [];

    constructor(windowFrames = 12) {
        this.windowFrames = windowFrames;
    }

    /** 记录一次输入 */
    push(type: InputType, frame: number, heldFrames = 1): void {
        this.queue.push({ type, frame, heldFrames });
    }

    /** 是否存在窗口内未被消费的同类输入 */
    has(type: InputType, frame: number): boolean {
        return this.queue.some((i) => i.type === type && frame - i.frame < this.windowFrames && frame >= i.frame);
    }

    /** 消费窗口内最早一条同类输入；成功返回 true，防止一次按键触发两次派生 */
    consume(type: InputType, frame: number): boolean {
        const idx = this.queue.findIndex(
            (i) => i.type === type && frame - i.frame < this.windowFrames && frame >= i.frame,
        );
        if (idx === -1) return false;
        this.queue.splice(idx, 1);
        return true;
    }

    /** 清掉早于窗口的陈旧输入，定期调用防止队列膨胀 */
    prune(frame: number): void {
        this.queue = this.queue.filter((i) => frame - i.frame < this.windowFrames);
    }

    get size(): number {
        return this.queue.length;
    }
}
