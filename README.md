# PixelMug 文档站

独立 VitePress 项目，所有 Markdown、配置和主题均位于仓库根目录 `docs/`。

在此目录执行：

```sh
npm ci
npm run dev
```

首次安装或更新依赖使用 `npm install`。本地地址为 http://127.0.0.1:5174 ，支持直接在浏览器中访问，或从 Studio 的“开发文档”导航打开。修改 Markdown 后开发服务会自动更新页面。

```sh
npm run build
npm run preview
```

生产文件输出到 `.vitepress/dist/`，将其部署到静态服务器即可，不需要在服务器上运行 Node.js。开发服务与预览服务使用同一个端口，不能同时启动。

Studio 默认访问本地地址。以后部署远程站点时，可通过 `STUDIO_DOCS_URL` 或 `--docs-url` 指定 HTTPS 文档地址；服务器需允许来自本机 Studio 的 iframe 嵌入，不应设置 `X-Frame-Options: DENY/SAMEORIGIN`。可使用 `Content-Security-Policy: frame-ancestors http://127.0.0.1:* http://localhost:*`。

新增模块页面后，在 `.vitepress/config.mjs` 中补充侧栏链接。接口文档统一包含：用途、适用 SDK/固件版本、参数、返回值、最小示例、注意事项。未核实的接口保留“待补充”提示。
文档中的代码片段属于 API 使用说明。完整可运行项目统一放在仓库的 tools/studio/examples/，不放在 docs/ 中。
