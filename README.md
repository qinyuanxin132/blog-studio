# Blog Studio

一个以 Arch Linux 为首要开发和发布平台的本地优先博客写作工作台，同时保留 Windows 兼容路线。

> 当前已经接入 Tauri 2 桌面壳；Web 原型只是开发界面，不是最终产品。

## 当前原型

```bash
pnpm install
pnpm dev              # 浏览器开发预览
pnpm desktop:dev      # Tauri 桌面开发模式
```

## Arch Linux 优先

Arch Linux 是首要开发、测试和发布平台。当前机器可以直接生成原生二进制：

```bash
pnpm desktop:dev
source "$HOME/.cargo/env"
pnpm exec tauri build --no-bundle
```

Arch 打包基础文件位于 [packaging/arch](packaging/arch)：

```bash
cd packaging/arch
makepkg -si
```

后续目标是整理为 `blog-studio-git` AUR 包。

其他 Linux 打包：

```bash
pnpm exec tauri build --bundles deb,rpm
```

当前已支持：

- 文章列表；
- Markdown 编辑；
- 实时预览；
- 草稿状态；
- 本地 LocalStorage 保存；
- 离线状态展示；
- 文章搜索；
- 选择本地博客仓库（Chromium File System Access API）；
- 读取 `src/content/posts`、`content/posts` 或 `posts` 下的 Markdown；
- 修改后写回本地 Markdown 文件；
- Tauri 原生目录选择；
- Git 状态、diff 统计和本地 commit；
- 连接或修改 `origin` GitHub 远程地址；
- 读取远程地址；
- 用户确认后的 pull；
- 用户确认后的 push 到 GitHub。

## 设计目标

- 无网络也能写作和预览；
- 联网后由用户明确选择是否同步；
- GitHub 作为远程仓库，不把内容交给第三方数据库；
- 支持 Windows 和 Linux；
- MIT 开源；
- 不自动修改文章正文。

架构说明见工作区的 [blog-studio-architecture.md](../blog-studio-architecture.md)。

## Roadmap

- [x] Tauri 原生读取本地博客仓库；
- [x] 接入 Tauri 2 桌面壳；
- [x] Git 状态、diff、commit；
- [ ] GitHub OAuth / 安全凭据存储；
- [x] 手动 pull / push；
- [ ] 离线同步队列和冲突提示；
- [ ] 图片拖拽与资源管理；
- [x] Tauri 原生保存 Markdown 文件；
- [x] GitHub Actions Windows/Linux 矩阵构建配置；
- [ ] Windows 安装包（等待推送到公开仓库后由 CI 生成）；
- [x] Linux deb / rpm；
- [ ] Linux AppImage；
- [ ] GitHub Actions 自动发布 Release。
