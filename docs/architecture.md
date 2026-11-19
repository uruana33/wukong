# 系统设计文档 (System Architecture)

## 1. 核心设计原则
- **数据与逻辑分离**：动作表现由配置表驱动，拒绝硬编码。
- **物理反馈真实化**：引入 Poise (韧性) 与重量系统。

## 2. 模块划分
- `Combat System`：管理状态机(FSM)、取消窗口(Cancel Window)、帧同步。
- `Physics System`：处理受击位移、重量衰减、击飞。
- `Asset Pipeline`：处理美术资源导入、碰撞体生成、Prefab装配。
