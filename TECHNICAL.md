# Blog Studio 技术说明

本文面向希望阅读源码、参与开发或维护自己博客仓库的贡献者。

## 1. 项目定位

Blog Studio 是一个本地优先的 Markdown 博客桌面编辑器。

它不是在线 CMS，也不要求部署一个数据库后端。最终产品是 Tauri 2 桌面应用，React/TypeScript 只负责嵌入在桌面窗口中的编辑界面。

```text
React + TypeScript
        ↓
Tauri 2 WebView
        ↓
Rust 文件 / 图片 / Git 命令
        ↓
本地 Markdown Git 仓库
        ↓ 用户确认
GitHub 远程仓库
```

## 2. 为什么本地优先

比赛、课堂、旅行或网络不稳定时，写作不应该被网络阻塞。

本地优先意味着：

- 无网络也可以打开仓库；
- 无网络也可以编辑和预览；
- 无网络也可以插入图片；
- 无网络也可以保存文件；
- 无网络也可以创建本地 Git commit；
- 联网后才由用户决定是否 pull/push。

软件不会因为网络恢复就自动上传。

## 3. 仓库结构约定

Blog Studio 支持以下文章目录：

```text
src/content/posts/
content/posts/
posts/
```

一个典型博客仓库可以是：

```text
blog-repository/
├── src/content/posts/
│   └── example.md
├── src/content/attachments/upload/
│   └── image.png
├── public/upload/
├── src/
├── package.json
└── .git/
```

应用选择的是仓库根目录，而不是 `posts` 子目录。

## 4. Markdown 与 Front Matter

文章正文和元数据分开处理：

```markdown
---
title: "Example article"
date: 2026-01-01
published: true
categories: ["Notes", "Development"]
tags: ["Markdown", "Git"]
---

# Example article

正文内容。
```

编辑标题、日期、分类或标签时，应用只修改 Front Matter 对应字段，不自动重写正文。

多值字段使用数组：

```yaml
categories: ["Notes", "Development"]
tags: ["Markdown", "Git"]
```

## 5. Tauri 命令层

Rust 后端位于：

```text
src-tauri/src/lib.rs
```

目前的命令分为三组。

### 本地文件

```rust
read_posts(repo)
write_post(repo, relative_path, body)
```

`write_post` 会拒绝绝对路径和 `..` 路径，避免文章写入仓库之外。

### 图片

```rust
copy_image(repo, post_path, source_path)
write_image_bytes(repo, filename, data)
```

第二个命令用于处理剪贴板和拖拽获得的图片字节。

图片类型限制为：

```text
PNG / JPG / JPEG / GIF / WebP / SVG
```

### Git

```rust
git_snapshot(repo)
git_diff(repo)
git_commit(repo, message)
git_remote(repo)
git_set_remote(repo, url)
git_pull(repo)
git_push(repo)
```

Git 命令通过受控的 `std::process::Command` 执行，当前使用系统 Git 的认证配置。

## 6. 为什么 push 必须二次确认

同步可能改变远程仓库，因此 UI 不会把保存和上传合并：

```text
保存本地 ≠ commit ≠ push
```

推荐流程：

```text
编辑
  ↓
保存本地
  ↓
查看 Git 状态 / diff
  ↓
本地 commit
  ↓
确认 pull
  ↓
确认 push
```

这样断网时可以安全写作，联网后也不会误上传半成品。

## 7. 可视化编辑器

编辑器提供两种模式：

```text
Markdown 源码模式
可视化编辑模式
```

当前可视化模式使用 `contenteditable` 和基础 HTML/Markdown 转换，支持 MVP 级别的：

- 标题；
- 粗体；
- 斜体；
- 列表；
- 引用；
- 代码；
- 图片。

复杂表格、特殊 HTML 和复杂嵌套结构仍建议使用源码模式检查。后续会替换为更完整的编辑器核心，以提高 Markdown round-trip 保真度。

## 8. Arch Linux 优先

Arch 是首要开发和测试平台。

```bash
sudo pacman -S --needed \
  base-devel git nodejs npm rust cargo \
  webkit2gtk-4.1 libappindicator-gtk3
```

开发：

```bash
npm ci
npx tauri dev
```

检查：

```bash
npm run build
cd src-tauri
cargo check
```

Arch 打包文件：

```text
packaging/arch/PKGBUILD
packaging/arch/blog-studio.desktop
```

构建：

```bash
cd packaging/arch
makepkg -si
```

PKGBUILD 当前以 `blog-studio-git` 为目标，后续可以整理成 AUR 包。

## 9. Windows 兼容

Windows 不是当前第一开发环境，但 Tauri 工程保留 Windows 支持。

GitHub Actions 使用矩阵构建：

```text
ubuntu-22.04 → deb / rpm
windows-latest → msi / nsis
```

工作流：

```text
.github/workflows/build-desktop.yml
```

## 10. 隐私与开源

公开仓库只包含软件源代码、文档和构建配置，不应包含：

- 用户自己的博客文章；
- 私人图片；
- GitHub Token；
- SSH 私钥；
- 本地路径；
- 私人配置。

GitHub OAuth 和系统凭据存储仍在路线图中。实现时应使用操作系统安全存储，不要把 Token 放到普通 JSON 或日志里。

## 11. 验证命令

提交代码前至少执行：

```bash
npm run build
cd src-tauri
cargo check
cd ../packaging/arch
makepkg --printsrcinfo
```

需要验证安装包时：

```bash
npx tauri build --bundles deb,rpm
```

## 12. 下一步

- 完整所见即所得编辑器；
- 表格、链接、任务列表和撤销重做；
- GitHub 浏览器授权；
- OS Keychain / Secret Service 凭据存储；
- pull 冲突可视化；
- 图片删除和失效路径检查；
- AUR 发布；
- Windows Release 构建；
- AppImage 构建。
