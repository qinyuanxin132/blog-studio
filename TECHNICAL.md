# Blog Studio：从 Halo 导出博客到 Arch 优先的 Tauri 桌面写作工具

> 一个本地优先的博客写作工具实践：GitHub 负责远程保存和发布，Blog Studio 负责本地编辑、预览、Git 管理和用户确认后的同步。

项目仓库：<https://github.com/qinyuanxin132/blog-studio>

博客仓库：<https://github.com/qinyuanxin132/bh3mt.cn>

博客地址：<https://qinyuanxin132.github.io/bh3mt.cn/>

---

## 1. 为什么做这个项目

最初的博客内容来自 Halo 导出目录。导出结果里同时存在 Markdown、HTML、附件原图和多种缩略图。直接把导出目录上传到 GitHub 有几个问题：

- 页面展示效果不够好；
- Markdown 和 HTML 是两份内容，容易产生分歧；
- 图片路径依赖原平台的 `/upload/` 结构；
- 草稿和私有文章不能直接进入公开仓库；
- GitHub Pages 只负责展示，不适合直接写文章；
- 没有离线写作和可控同步流程。

因此项目拆成两部分：

```text
blog-site       负责静态博客展示
Blog Studio     负责本地写作和 Git/GitHub 操作
```

最终目标不是在线后台，而是一个本地优先的桌面应用：

```text
断网时：照常写作、预览、保存、commit
联网时：用户明确点击后才 pull / push
```

---

## 2. 总体架构

```text
┌──────────────────────────────────────┐
│ Blog Studio                          │
│ Tauri 2 原生桌面应用                  │
│                                      │
│ 可视化编辑 / Markdown / 图片 / Git     │
└────────────────┬─────────────────────┘
                 │ 本地文件和系统 Git
                 ▼
┌──────────────────────────────────────┐
│ 本地 blog-site Git 仓库                │
│                                      │
│ src/content/posts/                   │
│ src/content/attachments/             │
│ public/upload/                       │
│ Astro 网站源码                        │
└────────────────┬─────────────────────┘
                 │ 用户确认 push
                 ▼
┌──────────────────────────────────────┐
│ GitHub Repository                    │
│ qinyuanxin132/bh3mt.cn               │
└────────────────┬─────────────────────┘
                 │ GitHub Actions
                 ▼
┌──────────────────────────────────────┐
│ GitHub Pages                         │
│ qinyuanxin132.github.io/bh3mt.cn     │
└──────────────────────────────────────┘
```

Blog Studio 不保存一份独立的文章数据库。Markdown 文件仍然是唯一内容来源，GitHub 只是远程仓库和发布入口。

---

## 3. 博客迁移原则：正文不改，展示层重做

迁移时严格区分：

```text
文章正文       不自动改写
文章元数据     独立管理
图片路径       做兼容处理
网站外观       重新设计
```

导出的 Markdown 会在文件头部增加 Front Matter，但正文保持原样：

```markdown
---
title: "西电CTF 2026 Assembly"
slug: "xi-dian-ctf-2026-assembly"
date: 2026-09-23
updated: 2026-09-23
published: true
categories: []
tags: []
---

# 西电CTF 2026 Assembly

原文章正文保持不变。
```

迁移后对 47 篇文章逐篇做了正文一致性校验：

```text
迁移前正文 = 迁移后正文
47 / 47 通过
```

公开站点只构建公开文章，草稿和私有文章不复制进公开项目。

---

## 4. Astro 静态博客

博客网站使用 Astro 构建，原因是它适合 Markdown 内容、静态部署和轻量页面交互。

当前公开站点包含：

- 深色蓝色星空背景；
- 低对比度赛博网格；
- 蓝青紫霓虹 UI；
- 鼠标跟随光晕；
- 点击星星爆裂效果；
- 首页文章搜索；
- GitHub 风格绿色更新方格图；
- 分类页面；
- 关于页面；
- 文章目录；
- 阅读进度条；
- 上一篇 / 下一篇；
- 代码复制；
- 自定义 404；
- 移动端适配。

### GitHub Project Pages 的 base 路径问题

项目仓库不是 `username.github.io`，而是：

```text
qinyuanxin132/bh3mt.cn
```

所以静态站点实际部署路径是：

```text
/bh3mt.cn/
```

Astro 配置必须设置：

```js
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://bh3mt.cn',
  base: '/bh3mt.cn',
});
```

否则会出现：

```text
页面 HTML 能打开
CSS 加载失败
文章链接变成 /posts/...
所有文章点击 404
```

另外，`BASE_URL` 可能没有末尾斜杠，所以内部链接不能直接拼接：

```ts
const base = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;
```

正确：

```astro
<a href={`${base}posts/${slug}/`}>文章</a>
```

错误：

```astro
const base = import.meta.env.BASE_URL;
<a href={`${base}posts/${slug}/`}>文章</a>
```

如果 `base` 是 `/bh3mt.cn`，错误拼接会产生：

```text
/bh3mt.cnposts/example/
```

---

## 5. GitHub Pages 自动部署

部署工作流位于：

```text
.github/workflows/deploy.yml
```

核心流程：

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: withastro/action@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/deploy-pages@v4
```

曾经遇到一个部署问题：`withastro/action` 已经上传了 Pages artifact，又手动上传一次会产生：

```text
409 Conflict: an artifact with this name already exists
```

解决方式是删除重复的 `upload-pages-artifact` 步骤，只保留一种 artifact 上传来源。

另外，第一次部署时如果 GitHub Pages 没启用，`deploy-pages` 会返回 404。需要先启用 workflow 类型的 Pages：

```bash
gh api --method POST repos/qinyuanxin132/bh3mt.cn/pages \
  -f build_type=workflow
```

---

## 6. Blog Studio 为什么使用 Tauri

Blog Studio 最终不是 Web 应用，而是桌面应用。

技术栈：

```text
前端：React + TypeScript
桌面壳：Tauri 2
后端：Rust
编辑器：Markdown + 可视化 contenteditable MVP
Git：系统 Git 命令
打包：Tauri bundler
```

选择 Tauri 的主要原因：

- Windows/Linux 都可以支持；
- 体积比 Electron 更小；
- Rust 适合文件、Git、权限和系统能力；
- 可以调用系统原生目录选择器；
- 可以调用操作系统的安全能力；
- 适合制作开源桌面应用。

在 Arch Linux 上，Tauri 原生工程可以通过：

```bash
source "$HOME/.cargo/env"
cargo check
```

验证。

---

## 7. Tauri 原生文件读写

Blog Studio 不再依赖浏览器的 LocalStorage 作为正式数据源。

原生后端提供：

```rust
#[tauri::command]
pub fn read_posts(repo: String) -> Result<Vec<LocalPost>, String> {
    // 查找 src/content/posts、content/posts 或 posts
    // 读取 Markdown 文件
}

#[tauri::command]
pub fn write_post(
    repo: String,
    relative_path: String,
    body: String,
) -> Result<(), String> {
    // 校验相对路径
    // 禁止 .. 路径穿越
    // 将正文写回本地 Markdown 文件
}
```

写入操作会检查：

- 路径不能是绝对路径；
- 路径不能包含 `..`；
- 目标文件必须是 Markdown；
- 写入失败时向界面返回错误。

---

## 8. Git 本地操作

Tauri 后端通过受控的系统 Git 命令工作。

### 查看状态

```rust
#[tauri::command]
pub fn git_snapshot(repo: String) -> Result<GitSnapshot, String> {
    Ok(GitSnapshot {
        branch: run_git(&repo, &["branch", "--show-current"] )?,
        status: run_git(&repo, &["status", "--short"] )?,
        diff_stat: run_git(&repo, &["diff", "--stat"] )?,
    })
}
```

### 本地 commit

```rust
#[tauri::command]
pub fn git_commit(repo: String, message: String) -> Result<String, String> {
    if message.trim().is_empty() {
        return Err("提交信息不能为空".into());
    }

    run_git(&repo, &["add", "-A"])?;
    run_git(&repo, &["commit", "-m", message])
}
```

### 手动同步

```rust
#[tauri::command]
pub fn git_pull(repo: String) -> Result<String, String> {
    run_git(&repo, &["pull", "--ff-only"])
}

#[tauri::command]
pub fn git_push(repo: String) -> Result<String, String> {
    run_git(&repo, &["push"])
}
```

软件不会因为检测到网络就自动 push。

界面上的上传按钮必须经过确认：

```text
这会把本地 commit 上传到远程 GitHub，确定继续吗？
```

---

## 9. 日期、分类和标签不能丢

文章元数据在 Front Matter 中：

```yaml
date: 2026-10-20
categories: ["西电CTF_2026"]
tags: ["Reverse", "Assembly"]
```

Blog Studio 会读取并显示：

- 日期；
- 分类；
- 标签；
- 发布状态。

编辑元数据时只更新对应 Front Matter 行，不触碰正文。

例如输入：

```text
分类：逆向工程, CTF
标签：Assembly, Reverse, Linux
```

会保存为：

```yaml
categories: ["逆向工程", "CTF"]
tags: ["Assembly", "Reverse", "Linux"]
```

此外还做过仓库一致性校验：

```text
本地 blog-site/src/content/posts
与 origin/main/src/content/posts
无差异
```

空数组例如：

```yaml
categories: []
tags: []
```

表示原始文章本来没有分类或标签，不是迁移丢失。

---

## 10. 图片插入

图片是桌面应用的一等功能。

支持：

```text
点击图片按钮选择文件
Ctrl + V 粘贴图片
拖拽图片到编辑区
```

支持格式：

```text
PNG / JPG / JPEG / GIF / WebP / SVG
```

前端将图片转换为字节数组，交给 Tauri：

```ts
const data = Array.from(
  new Uint8Array(await file.arrayBuffer())
);

const relative = await invoke<string>('write_image_bytes', {
  repo: repoPath,
  filename: file.name,
  data,
});
```

Rust 后端负责：

- 检查扩展名；
- 选择资源目录；
- 创建目录；
- 避免文件名冲突；
- 写入图片字节；
- 返回 Markdown 相对路径。

```rust
#[tauri::command]
pub fn write_image_bytes(
    repo: String,
    filename: String,
    data: Vec<u8>,
) -> Result<String, String> {
    // 校验图片类型
    // 写入 src/content/attachments/upload
    // 返回 ../attachments/upload/xxx.png
}
```

---

## 11. Arch Linux 优先打包

Arch Linux 是 Blog Studio 的首要开发平台。

项目包含：

```text
packaging/arch/PKGBUILD
packaging/arch/blog-studio.desktop
```

安装方式：

```bash
sudo pacman -S --needed \
  base-devel \
  git \
  nodejs \
  npm \
  rust \
  cargo \
  webkit2gtk-4.1 \
  libappindicator-gtk3

cd packaging/arch
makepkg -si
```

PKGBUILD 使用 npm 和 npx 构建 Tauri：

```bash
npm ci
npx tauri build --no-bundle
```

这样不要求系统额外安装 pnpm 才能执行 Arch 打包。

PKGBUILD 已经通过：

```bash
makepkg --verifysource
makepkg --printsrcinfo
```

后续计划：

- 发布 `blog-studio-git` 到 AUR；
- 使用 Arch 构建机验证安装；
- 增加 `.SRCINFO`；
- 完善卸载和升级流程；
- 再维护 Windows 安装包。

---

## 12. 当前状态

已完成：

- Tauri 2 桌面壳；
- Arch Linux 优先路线；
- 原生 Markdown 读取和写回；
- 可视化编辑 MVP；
- Markdown 源码模式；
- 日期、分类和标签管理；
- 图片选择、粘贴和拖拽；
- Git status / diff / commit；
- origin 远程配置；
- 用户确认后的 pull / push；
- Linux deb / rpm；
- Windows/Linux GitHub Actions 构建配置；
- MIT License；
- 公开 GitHub 仓库。

待完成：

- GitHub OAuth 浏览器授权；
- 操作系统安全凭据存储；
- pull 冲突可视化；
- 完整表格和复杂 Markdown 保真转换；
- Arch AUR 正式发布；
- Linux AppImage；
- Windows 安装包实际发布。

---

## 13. 项目反思

这个项目有一个很重要的设计判断：

> 文章内容属于用户本地仓库，不属于 Blog Studio，也不属于某个在线服务。

因此软件只做三件事：

1. 帮用户更容易写；
2. 帮用户更安全地管理本地 Git；
3. 在用户明确同意后，把内容同步到 GitHub。

这样即使 GitHub、网络或 Blog Studio 本身暂时不可用，文章仍然在本地，用户可以继续写作。
