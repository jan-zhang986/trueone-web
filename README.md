# TrueOne Web (`trueone-web`)

TrueOne 质量平台现代化前端大盘，基于 React 18 + TypeScript + Vite + Tailwind CSS 构建。

## 🎯 核心特性

1. **活体测试计划因果三联屏 (`LivingTestPlanMatrixView`)**：
   - **左屏（需求规约）**：直读 Markdown PRD，逐行条款锚定；
   - **中屏（因果分析与风险盲区）**：FMEA 失效分析，自动高亮 13 个关键 GAP 阻断盲区；
   - **右屏（真实测试切片与证据链）**：无任何 Mock 假数据，直接展示通过 AST 提取的真实测试源码与运行时 DB 差分证据。
2. **云端自动解析与对账一键触发**：
   - 顶栏直接调用 `trueone-anubis` 后端的 AST 分析引擎，秒级重新装配 56 个业务章节与 121 个测试用例。
3. **全流程质量管理**：
   - 覆盖接口测试、测试计划、用例库资产、缺陷追踪与工作流编排。

---

## 📋 运行前置要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0

---

## 🚀 本地开发与启动

```bash
# 1. 安装依赖
pnpm install

# 2. 启动开发服务器 (默认端口 5174 或 5173)
pnpm dev --port 5174

# 3. 生产环境打包构建
pnpm build
```

浏览器访问：`http://localhost:5174`

---

## 🔗 相关生态组件

- **`trueone-anubis`**：Go 核心后端与 AST 对账引擎
- **`trueone-cli`**：面向 AI 与研发的 Test-as-Code 脚手架
- **`trueone-sdk`**：多语言统一契约与事件上报 SDK
