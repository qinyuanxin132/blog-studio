# Blog Studio

一个本地优先的博客写作工作台，面向 Windows 和 Linux。

> 当前已经接入 Tauri 2 桌面壳；Web 原型只是开发界面，不是最终产品。

## 当前原型

```bash
pnpm install
pnpm dev              # 浏览器开发预览
pnpm desktop:dev      # Tauri 桌面开发模式
```

Linux 打包：

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

- [x] 读取本地博客仓库；
- [x] 接入 Tauri 2 桌面壳；
- [x] Git 状态、diff、commit；
- [ ] GitHub OAuth / 安全凭据存储；
- [x] 手动 pull / push；
- [ ] 离线同步队列和冲突提示；
- [ ] 图片拖拽与资源管理；
- [ ] Windows 安装包；
- [x] Linux deb / rpm；
- [ ] Linux AppImage；
- [ ] GitHub Actions 自动发布 Release。
