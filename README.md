# Typst Editor

部署在 `typst.imjz.net` 的纯前端、Local-first Typst 编辑器。

## 开发

```bash
pnpm install
pnpm dev
pnpm test
pnpm build
```

需要 Node.js 22 和 pnpm。生产产物位于 `dist/`。

## 代码结构

```text
src/
├── core/
│   ├── compiler/    # typst.ts Worker、消息协议和客户端
│   ├── preview/     # Typst 矢量产物渲染
│   ├── storage/     # Dexie 项目索引和本地目录句柄
│   └── workspace/   # OPFS/FSA Provider、路径校验和项目复制
├── features/
│   ├── editor/      # 桌面 Monaco、标签页和 Typst 高亮
│   ├── preview/     # 编译状态、预览和 PDF 导出
│   ├── settings/    # 本地编辑偏好
│   └── workspace/   # 工作区 Store、桌面/移动界面和文件树
├── styles/          # Tailwind v4 入口和主题 Token
└── ui/              # 已复用的无业务组件
```

- 浏览器项目的文件树保存在 OPFS。
- 本地项目通过 File System Access API 直接读写用户授权目录。
- IndexedDB 只保存项目元数据和目录句柄。
- 桌面端在进入工作台后动态加载 Monaco；小于 `1024px` 时使用原生 `textarea`。
- Typst WASM 在 Web Worker 中编译，主线程只负责状态和 SVG 预览。

## 腾讯云 COS 部署

`main` 分支推送后，GitHub Actions 会构建并同步 `dist/` 到存储桶根目录。仓库需要配置：

- `COS_SECRET_ID`
- `COS_SECRET_KEY`
- `COS_BUCKET`：完整名称，例如 `example-1250000000`
- `COS_REGION`：例如 `ap-shanghai`

COS 静态网站的索引文档设为 `index.html`，自定义域名绑定为 `typst.imjz.net`。`.wasm` 对象应返回 `Content-Type: application/wasm`。
