# Typst Editor 开发约定

## 项目定位

- 本项目是部署在 `typst.imjz.net` 的纯前端、Local-first Typst 编辑器。
- 技术栈为 Vue 3、Vite、TypeScript、Pinia、Tailwind CSS v4、Reka UI、Lucide、Monaco、Dexie 和 typst.ts。
- 所有项目文件默认只在浏览器或用户授权的本地目录中处理。除 Typst Universe 包下载外，不向服务端上传文档、字体、图片或其他用户文件。
- 构建产物为 `dist/`，由 GitHub Actions 同步到腾讯云 COS 根目录。
- 首版不增加后端、账号、云同步、分享协作、Vue Router、PWA、LSP、pdf.js、ZIP 或模板 Schema，除非当前需求明确要求。

## 目录职责

```text
src/
├── core/
│   ├── compiler/    # typst.ts Worker、消息协议和 Worker 客户端
│   ├── preview/     # Typst 矢量产物渲染
│   ├── storage/     # Dexie 项目索引和本地目录句柄
│   └── workspace/   # Provider、OPFS/FSA、路径规则和项目复制
├── features/
│   ├── editor/      # Monaco、标签页、语法高亮和诊断映射
│   ├── preview/     # Compile Store、预览和 PDF 导出
│   ├── settings/    # Settings Store 和设置界面
│   └── workspace/   # Workspace Store、文件树及桌面/移动工作台
├── styles/          # Tailwind 入口、主题 Token 和全局样式
├── ui/              # 已有两处以上实际复用的无业务组件
├── App.vue          # 1024px 桌面/移动模式切换
└── main.ts          # Vue 与 Pinia 初始化
```

- 与 Vue、DOM 无关的底层逻辑放入 `src/core/`。
- 按完整用户能力组织的组件和 Store 放入 `src/features/`。
- 单处使用的组件优先留在对应 feature 中，不提前提取通用 UI Kit。
- 测试与被测模块放在同一目录，使用 `*.test.ts` 命名。

## Workspace 与存储边界

- 所有工作区操作通过 `WorkspaceProvider` 完成。界面和编译器不得直接调用 OPFS 或 File System Access API。
- 项目路径统一使用相对 POSIX 路径。所有外部输入必须经过 `normalizeWorkspacePath` 或 `joinWorkspacePath`，拒绝绝对路径、盘符和 `..`。
- 浏览器项目完整文件树保存于 OPFS 的 `/projects/{projectId}/`。
- Dexie 只保存项目索引、入口文件、最近本地目录句柄和最近打开时间，不保存项目文件副本。
- 本地项目直接读写用户授权目录；恢复目录句柄时必须重新检查 `readwrite` 权限。
- OPFS 与本地项目转换使用递归复制，转换完成后两份项目互相独立，不增加隐式同步。
- 写入失败时必须保留内存工作副本并向用户展示可见错误，禁止静默丢弃未保存内容。
- 修改保存、删除、覆盖和外部文件冲突逻辑时，优先保证数据安全并补充对应测试。

## 状态与编译边界

- 保持三个 Pinia Store：
  - `workspace.store.ts`：Provider、文件树、标签页、工作副本和保存状态。
  - `compile.store.ts`：编译状态、诊断、预览产物、PDF 导出和请求去旧。
  - `settings.store.ts`：主题、字号、自动保存、换行和界面偏好。
- Monaco 和移动端 `textarea` 只编辑 Workspace Store 的工作副本。
- Vue 组件不得直接依赖 typst.ts compiler；所有编译在 `compiler.worker.ts` 中执行。
- Worker 协议修改时同步更新 `compiler.protocol.ts`、客户端、Worker 和 Store 测试。
- 编辑只向 Worker 发送增量文件变化；使用递增 `requestId` 丢弃过期编译结果。
- 编译失败不得阻止源文件保存。
- `.ttf`、`.otf`、`.ttc` 字体由 Worker 注册；新增或替换字体后重新打开编译镜像。

## 桌面与移动端

- `1024px` 是桌面完整工作台与移动轻量工作台的模式边界。
- Monaco 必须保持动态加载，禁止通过顶层静态导入进入移动端或启动页首包。
- 桌面布局使用 Reka UI Splitter 和 Tree；编辑器、文件树、预览共享同一 Store。
- 移动端默认进入预览，只使用原生 `textarea` 轻量编辑文本文件。
- 移动端不展示本地目录入口，不加载 Monaco；二进制文件仅提供信息、替换和删除能力。
- 改动响应式模式、文件选择、下载或浏览器权限行为后，必须分别在桌面和移动视口手工验证。

## UI 与交互

- 页面布局和视觉优先使用 Tailwind CSS v4 与 `src/styles/app.css` 中的主题 Token。
- 无障碍交互、弹层、Tree 和 Splitter 优先复用已安装的 Reka UI。
- 图标统一使用 `@lucide/vue`。
- 原生平台能力本身属于需求时使用原生控件，例如移动端 `textarea`、文件上传、目录选择和范围滑块。
- 表单控件必须有可访问名称；错误、保存、编译和导出状态必须在界面中可见。
- 浏览器 API 必须处理能力缺失、用户取消、权限拒绝、配额不足和写入失败。
- 新增基础组件前先检查 `src/ui/` 和已安装依赖；只有出现第二个真实调用方时再提取共享组件。

## 代码与依赖

- 使用 TypeScript 严格模式和 Vue `<script setup lang="ts">`。
- 先复用现有代码、标准库、浏览器原生能力和已安装依赖，再考虑新增代码或依赖。
- 不为假设中的未来需求增加 Provider、Store、兼容分支、配置项或目录。
- 修复故障前阅读完整调用链并确认根因；原因不确定时先增加最小调试信息，不基于猜测修改。
- 用户可见错误不得只写入控制台，也不得吞掉异常后继续展示可能错误的状态。
- 涉及 typst.ts、OPFS、File System Access API、Reka UI 或 Monaco API 的变更，应先核对当前安装版本的类型、源码或官方文档。
- 使用 pnpm，保持 `package.json`、`pnpm-lock.yaml` 和 `pnpm-workspace.yaml` 同步。
- 新依赖必须解决当前明确需求；不引入功能重叠的编辑器、状态库、存储库或 UI 框架。

## 验证要求

- 路径处理、递归复制、防抖、请求去旧、状态转换和数据安全分支必须有最小 Vitest 覆盖。
- 完成代码修改后运行：

```bash
pnpm test
pnpm build
git diff --check
```

- `pnpm build` 已包含 `vue-tsc -b`，无需重复增加单独的类型检查脚本。
- 涉及 OPFS、File System Access API、Worker/WASM、Monaco 动态加载、响应式布局或 Blob 下载时，再做真实浏览器验证。
- 浏览器验收至少关注：控制台错误、刷新恢复、保存状态、编译诊断、预览更新和移动端是否未加载 Monaco。
- 不提交 `dist/`、`node_modules/`、`.pnpm-store/`、日志、密钥或本地环境文件。

## 部署约定

- 部署工作流位于 `.github/workflows/deploy.yml`，只同步生产构建生成的 `dist/`。
- COS 凭证只通过 GitHub Secrets 提供，不写入源码、工作流常量或文档示例值。
- 保持 Vite 根路径部署；不要为 `typst.imjz.net` 增加子路径 `base`。
- WASM 对象必须以 `application/wasm` 返回；修改上传工具或 CDN/COS 配置时重新验证 MIME 类型。
