# 系统设计文档 (System Architecture)

## 1. 核心设计原则

- **数据与逻辑分离**：动作表现（判定帧、取消窗口、无敌帧）全部由 `src/combat/data.ts` 配置表驱动，逻辑层零硬编码数值，策划改表即改手感。
- **分层优先级状态机（HFSM-lite）**：状态按层分组 + 优先级仲裁，高优先级天然打断低优先级 —— "受击必定打断攻击"是模型的推论而非特例。
- **物理反馈真实化**：引入 Poise（韧性）与 weight（体重），硬直与击退是数据结算的结果。
- **事件驱动表现层**：逻辑层只发事件（`HITBOX_ACTIVE` / `HIT_STUN` / `PERFECT_DODGE` / `DEATH`），动画/音效/特效由引擎层订阅，逻辑可脱离渲染独立跑。

## 2. 模块划分

| 模块 | 路径 | 职责 |
|---|---|---|
| ECS | `src/ecs/` | 实体/组件/系统容器，帧驱动管线，全局时间缩放（子弹时间），事件队列 |
| Input | `src/input/` | 输入缓冲：窗口期内缓存玩家指令，防止"提前按了不算" |
| FSM | `src/fsm/` | 通用状态机：4 种转换（NORMAL/CANCEL/INTERRUPT/FORCE）+ 动态打断门控 |
| Combat | `src/combat/` | 动作数据表、组件、状态定义、连招/受击/闪避/击退系统、世界装配 |
| Pipeline | `tools/` | 美术资产校验导入、动作配置表生成（策划 JSON → TS） |

## 3. 战斗状态机分层模型

```
DEAD(100)                  终点，interruptGate = ∞
─────────────────────────  受击层
HIT_STUN(80)               硬直期间只允许同级刷新或 DEAD
─────────────────────────  动作层（同层禁止 INTERRUPT，派生必须走 CANCEL）
DODGE(40)  ATTACK(30)
─────────────────────────  移动层
MOVE(10)   IDLE(0)
```

四种转换方式（`src/fsm/machine.ts`）：

- **NORMAL**：需驻留满 `minFrames`（动作状态 = 当前动作 `totalFrames`），即"招式必须播完"。
- **INTERRUPT**：`incoming.priority >= current.interruptGate(f)` 才放行。动作层 gate = 80，意味着受击层必定打断攻击/闪避；移动层 gate = 自身优先级，任意动作都可打断移动。
- **CANCEL**：`canCancelInto` 验证目标动作在当前动作的 `cancelWindows` 内且帧数命中窗口 —— 连招派生的唯一通道，窗口外狂按无效，动作不鬼畜。
- **FORCE**：绕过一切仲裁（内部使用，如 HIT_STUN 计时归零强制回 IDLE）。

## 4. 关键机制

### 4.1 判定帧与取消窗口（数据驱动）

每个 `ActionData` 声明：`totalFrames`、`hitboxActive:[s,e]`（仅该区间发 `HITBOX_ACTIVE`）、`cancelWindows[]`（`triggerInput` + `window:[s,e]` + `requireHit`）。

- `requireHit: true` = 必须命中目标才能派生（挥空不可连段，"刀刀到肉"）；命中由 `markAttackConnected` 在伤害结算时回写。
- `InputBuffer`（默认 12 帧 ≈ 200ms）缓存提前输入，进入窗口即被消费 —— 连招不卡手的来源。

### 4.2 韧性 / 硬直 / 击退

`processHit`：伤害永远结算 → 削韧 → 韧性归零或 `LAUNCH` 级 → `HIT_STUN`（打断当前动作）+ 韧性重置 + 击退组件；未破韧 → `FLINCH` 顿挫（掉血不打断，霸体怪手感）。

- 硬直帧数 = `hitStunFrames × STUN_MULTIPLIER[level]`（LIGHT 1.0 / HEAVY 1.5 / LAUNCH 2.0）。
- 击退初速 = `knockbackForce / weight`，`KnockbackSystem` 每帧摩擦衰减 —— 轻怪一刀飞、重怪一顿。

### 4.3 完美闪避

`perfectWindow ⊆ iFrameWindow`（前段子集），判定顺序先完美后普通：

- 完美窗口内撞上判定 → `PERFECT_DODGE`：`world.setTimeScale(0.2, 90)` 子弹时间 + 20 能量，一次闪避只奖励一次。
- 无敌帧其余区间 → `DODGED` 免伤；无敌帧外（翻滚后摇）→ 正常吃伤。

### 4.4 全局时间缩放

`World.timeScale` 作用于位移积分等运动结算，`setTimeScale(scale, frames)` 到期自动恢复 —— 逻辑帧数不变，只有运动参数缩放。

## 5. 系统管线（每帧执行序）

```
CombatInputSystem   输入 → 起手动作（仅 IDLE/MOVE 可起手）
ComboSystem         攻击中扫描取消窗口，消费缓冲派生
ActionSystem        动作帧推进 → HITBOX_ACTIVE 事件 → 播完回 IDLE
DodgeSystem         闪避计时
KnockbackSystem     击退位移衰减
StateMachineSystem  状态机推进（最后，结算本帧产生的全部转换）
```

伤害结算发生在系统管线之外：碰撞层收集 `HITBOX_ACTIVE` 与受击盒重叠后，对守方调 `checkHitDuringDodge`（内部回落到 `processHit`），并对攻方调 `markAttackConnected`。

## 6. 资产与配置管线

- `tools/asset_importer.py`：扫描资产目录，按命名规范（`snake_case`、PBR 后缀 `_albedo/_normal/_orm`、`anim_` 前缀、模型 `_skin/_prop` 后缀）分类校验，产出 `manifest.json`（accepted/rejected + 衍生资源清单）。
- `tools/config_generator.py`：校验策划 `actions.json`（窗口越界、perfect 未嵌套、取消目标悬空即拒），生成可粘贴的 TS 数据表片段。
