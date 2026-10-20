# Contributing to Blog Studio

感谢参与 Blog Studio。

## 开发环境

首要支持环境是 Arch Linux。

```bash
sudo pacman -S --needed \
  base-devel git nodejs npm rust cargo \
  webkit2gtk-4.1 libappindicator-gtk3
```

安装依赖并构建：

```bash
npm ci
npm run build
cd src-tauri
cargo check
```

运行原生桌面开发模式：

```bash
npx tauri dev
```

## 开发原则

1. 本地优先：断网时核心写作流程仍然可用；
2. 用户确认：不能自动 pull、push 或删除本地修改；
3. 数据保真：不要自动改写文章正文；
4. 可审计：不要把 Token 写入仓库、日志或 Markdown；
5. 跨平台：优先保证 Arch/Linux，再检查 Windows；
6. 小提交：一个提交尽量只解决一个问题。

## 提交代码前

```bash
npm run build
cd src-tauri && cargo check
```

如果修改了打包或 Arch 内容，还应运行：

```bash
makepkg --printsrcinfo
```

## Pull Request 建议

请在 PR 中说明：

- 修改解决了什么问题；
- 是否影响文章正文或 Front Matter；
- 是否需要网络；
- 是否改变 Git 行为；
- 在 Arch Linux 上如何验证；
- Windows 是否需要额外处理。

不要提交：

- 个人博客文章；
- 个人图片和截图；
- GitHub Token、SSH 私钥或账号凭据；
- `node_modules/`、构建产物和个人配置。
