# Blog Studio

一个本地优先的博客写作工作台，面向 Windows 和 Linux。

> 当前是第一版 Web 原型，下一步将接入 Tauri 2，打包为 Windows/Linux 桌面应用。

## 当前原型

```bash
npm install
npm run dev
```

当前已支持：

- 文章列表；
- Markdown 编辑；
- 实时预览；
- 草稿状态；
- 本地 LocalStorage 保存；
- 离线状态展示；
- 文章搜索；
- 预留 GitHub 连接和手动上传入口。

## 设计目标

- 无网络也能写作和预览；
- 联网后由用户明确选择是否同步；
- GitHub 作为远程仓库，不把内容交给第三方数据库；
- 支持 Windows 和 Linux；
- MIT 开源；
- 不自动修改文章正文。

架构说明见工作区的 [blog-studio-architecture.md](../blog-studio-architecture.md)。

## Roadmap

- [ ] 读取本地博客仓库；
- [ ] 接入 Tauri 2 桌面壳；
- [ ] Git 状态、diff、commit；
- [ ] GitHub OAuth / 安全凭据存储；
- [ ] 手动 pull / push；
- [ ] 离线同步队列和冲突提示；
- [ ] 图片拖拽与资源管理；
- [ ] Windows 安装包；
- [ ] Linux AppImage / deb；
- [ ] GitHub Actions 自动发布 Release。
