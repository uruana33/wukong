# Wukong Action Engine: 基于 AI Agent 的动作游戏战斗核心框架

## 📖 项目简介
本项目探索"AI Agent（以 Devin Max 为核心）主导全栈开发"的工业化落地路径。人类（Project Lead）负责架构设计与标准制定，Devin Max 负责代码生成、自动化测试及自主 Debug。

已实现一套**数据驱动的动作游戏战斗核心**：ECS 架构、分层优先级状态机、取消窗口连招、韧性/硬直/击退物理反馈、完美闪避子弹时间 —— 逻辑帧驱动，可脱离引擎独立运行。

## 🏗️ 系统架构
*   **核心**：ECS (Entity-Component-System) + HFSM-lite 分层状态机
*   **语言**：TypeScript（Node ≥22.6 可原生运行 `.ts`，零构建）
*   **AI 协同**：PRD/Schema -> Devin Max -> CI/CD 验证
*   详细设计见 [`docs/architecture.md`](docs/architecture.md)

## 📂 目录说明
```
src/
  ecs/        World/Entity/组件存储、帧驱动管线、全局时间缩放、事件队列
  input/      输入缓冲（12 帧 ≈ 200ms 指令缓存窗）
  fsm/        通用状态机：NORMAL/CANCEL/INTERRUPT/FORCE 四种转换
  combat/     战斗域：数据表、组件、状态定义、连招/受击/闪避/击退
tools/        asset_importer.py（资产校验清单）、config_generator.py（配置表生成）
.github/      CI：类型检查 + Devin 自愈钩子
docs/         architecture.md 系统设计文档
```

## 🚀 快速开始
```bash
npm install        # 仅 typescript 一个 devDep
npm test           # tsc --noEmit 全仓类型检查
node -e '...'      # Node ≥22.6 直接 import .ts 文件跑逻辑
```

最小示例：
```ts
import { createCombatWorld, spawnFighter } from './src/combat/setup.ts';
import { playAction, markAttackConnected } from './src/combat/action.ts';
import { checkHitDuringDodge } from './src/combat/dodge.ts';
import { ActionId, getActionData } from './src/combat/data.ts';

const world = createCombatWorld();
const player = spawnFighter(world, { playerControlled: true });
const enemy = spawnFighter(world, { maxPoise: 10 });

playAction(player, ActionId.Light1);          // NORMAL → ATTACK
world.tick(8);                                // 进入 hitboxActive [7,11]
checkHitDuringDodge(world, enemy, getActionData(ActionId.Light1).hit!);
markAttackConnected(player);                  // 命中确认，解锁 requireHit 取消
// 玩家在窗口内按轻击 → ComboSystem 派生 LIGHT_2 …
```

## ✅ 当前进度
- [x] ECS 内核：组件存储、帧驱动 System 管线、事件队列、`setTimeScale` 子弹时间
- [x] 分层状态机：优先级打断仲裁（受击必断攻击）、帧锁定、取消门控
- [x] 数据驱动动作表：三段轻击 + 重击 + 闪避，判定帧/取消窗口全配置化
- [x] 输入缓冲 + 连招派生（`requireHit` 防挥空连段）
- [x] 韧性削韧、硬直、按体重击退；完美闪避子弹时间 + 资源奖励
- [x] 资产/配置管线工具与 CI 类型检查
- [ ] 单元测试覆盖（`npm test` 已就位，待补 `node --test` 用例）
- [ ] 碰撞/受击盒空间层与渲染适配层
