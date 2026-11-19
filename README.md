# Project Action Engine: 基于 AI Agent 的次世代动作游戏框架

## 📖 项目简介
本项目旨在探索“AI Agent（以 Devin Max 为核心）主导全栈开发”的工业化落地路径。人类（Project Lead）负责架构设计与标准制定，Devin Max 负责代码生成、自动化测试及自主 Debug。
目标：构建具备 3A 级潜力的动作游戏底层战斗系统与工程化管线。

## 🏗️ 系统架构
*   **核心**：ECS (Entity-Component-System)
*   **语言**：TypeScript (可替换为 C#/Unity/Unreal)
*   **AI 协同**：PRD/Schema -> Devin Max -> CI/CD 验证

## 📂 目录说明
*   `docs/` : 系统架构设计文档
*   `src/combat/` : 战斗核心（连招、受击、闪避）
*   `tools/` : 自动化脚本（美术导入、配置表生成）
*   `.github/workflows/` : CI/CD 流水线，专为 Devin Bot 准备

## 🚀 当前进度
- [x] 底层 ECS 架构与数据字典定义
- [x] 核心战斗逻辑伪代码（连招、韧性、完美闪避）
- [x] CI/CD 自动化测试流水线规划
- [ ] **等待 Devin Max 接入，开启 AI 自动编码与自愈测试**
