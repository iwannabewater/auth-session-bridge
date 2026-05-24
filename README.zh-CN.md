# Session Bridge

[English README](./README.md)

这是一个仅在浏览器本地运行的凭证格式转换工具，可将 ChatGPT Session 或 Codex 兼容凭证 JSON 转换为 CPA / CLIProxyAPI、sub2api、Cockpit Tools、9router、AxonHub 与 Codex-Manager 的导入文档。

[打开部署页面](https://iwannabewater.github.io/GPTSession2CPAandSub2API/)

## 安全边界

输入和输出都包含访问凭证，请将其视同密码处理。

- 转换只在浏览器内完成，应用不存在上传、遥测或持久化路径。
- 部署页面包含 Content Security Policy，阻止运行时连接。
- 粘贴内容或所选文件批次总计超过 4 MiB、嵌套过深或账号批量过大时，会在转换前拒绝处理。
- 仅含 access token 的账号在 token 过期后无法自行续期。
- 默认不生成合成 ID token。显式启用后，它只承载兼容性 claims，界面会明确提示其并非经过认证的 token。

请勿将凭证 JSON 提交到版本库、粘贴到 issue，或发送到聊天记录中。

## 使用方式

打开 GitHub Pages 部署页面，粘贴 JSON 或拖入一个或多个 `.json` 文件，选择输出格式，然后复制或下载生成的文档。通过 `English / 中文` 控件可一键切换完整界面语言。

如需获取 ChatGPT Web Session，请在单独浏览器标签页中登录 ChatGPT 后打开 `https://chatgpt.com/api/auth/session`。返回的 JSON 含有敏感凭证，只应复制到本地转换页面。

页面内置的安全示例使用无效的本地域名身份与不可认证的示例 token，仅用于查看界面与转换结构。

## 格式支持

| 输出            | 导出行为                                                                          |
| --------------- | --------------------------------------------------------------------------------- |
| `sub2api`       | 标准批量载荷，包含 `type: "sub2api-data"`、`version: 1`、账号过期与自动暂停字段。 |
| `CPA`           | CLIProxyAPI 兼容流程可接受的扁平 Codex token storage。                            |
| `Cockpit`       | Cockpit Tools 使用的扁平 Codex token storage。                                    |
| `9router`       | 已核验的直接 access-token 导入文档，不虚构 OAuth 续期能力。                       |
| `AxonHub`       | ChatGPT auth JSON，仅在输入真实存在时输出 `refresh_token`。                       |
| `Codex-Manager` | 当前 token 与 metadata 结构；可识别时包含 `workspaceId` 和 `chatgptAccountId`。   |

可识别输入包括 ChatGPT Web Session JSON、仅含 JWT access token 的 JSON，以及各受支持目标的导出结构。应用可从 JWT payload 解码身份和过期提示，但解码不等于验证 token。

## 工程结构

```text
src/core/parse.ts       对不可信 JSON 进行有边界的遍历
src/core/normalize.ts   提取标准化凭证记录
src/core/export.ts      各目标的输出契约
src/core/jwt.ts         claims 解码与显式合成 token 选项
src/ui/app.ts           不持久化数据的浏览器交互
src/i18n.ts             类型约束的中英文文案目录
```

本项目是使用严格 TypeScript 编写并由 Vite 构建的静态应用。英文界面内置 Charter；仅在选择中文界面时加载简体霞鹜文楷屏幕版样式。

## 本地开发

要求：Node.js 24 与 npm。

```bash
npm ci
npx playwright install chromium
npm run dev
npm run verify
```

`npm run verify` 会检查格式、lint、严格类型、带覆盖率阈值的单元测试、生产构建，以及桌面和手机视口下的浏览器测试。

## 兼容性维护

格式适配器依据 CLIProxyAPI、sub2api、AxonHub、9router、Cockpit Tools 与 Codex-Manager 当前的导入或导出实现建立。若目标项目调整文档结构，应同时更新适配器与 fixture，并运行完整验证命令。

## 许可证

MIT。随构建分发的字体许可声明见 [`public/licenses/THIRD-PARTY-NOTICES.txt`](./public/licenses/THIRD-PARTY-NOTICES.txt)。
