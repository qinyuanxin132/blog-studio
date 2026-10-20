# Blog Studio 使用教程

## 适用场景

Blog Studio 适合：

- 没有网络时写文章；
- 比赛或旅行期间记录笔记；
- 维护一个 GitHub Markdown 博客；
- 不熟悉 Markdown，但希望使用可视化编辑；
- 希望在上传前查看 Git 修改。

## 第一次使用

1. 安装 Blog Studio；
2. 点击 **打开本地仓库**；
3. 选择你的博客 Git 仓库根目录；
4. 软件扫描 `src/content/posts/`、`content/posts/` 或 `posts/`；
5. 选择一篇文章开始编辑。

不要选择 `src-tauri/`、`node_modules/` 或单个 Markdown 文件；应该选择包含 `.git` 的仓库根目录。

## GitHub 仓库格式要求

Blog Studio 编辑的是**普通 Git 仓库**，不要求仓库必须叫某个固定名字。但仓库需要符合下面的结构约定。

### 必须满足

1. 仓库已经在本地 clone，并且根目录包含 `.git/`；
2. 文章 Markdown 直接放在以下任一目录中：

   ```text
   src/content/posts/
   content/posts/
   posts/
   ```

3. 文章文件扩展名为 `.md`；
4. 文章文件直接放在上述目录中，当前版本不会递归扫描更深层子目录；
5. 使用 GitHub 同步时，仓库需要配置 `origin` 远程地址；
6. 本机 Git 已配置用户名和邮箱。

推荐的博客仓库结构：

```text
my-blog/
├── .git/
├── src/
│   └── content/
│       ├── posts/
│       │   ├── first-post.md
│       │   └── second-post.md
│       └── attachments/
│           └── upload/
├── public/
│   └── upload/
└── package.json
```

### 推荐的文章格式

文章最好包含 Front Matter：

```markdown
---
title: "文章标题"
date: 2026-01-01
updated: 2026-01-01
published: true
categories: ["分类"]
tags: ["标签一", "标签二"]
---

# 文章标题

正文内容。
```

其中：

- `title`：文章标题；
- `date`：用于文章目录排序；
- `updated`：最后修改日期；
- `published`：是否公开；
- `categories`：分类数组；
- `tags`：标签数组。

如果没有 Front Matter，Blog Studio 仍然可以读取 Markdown，但日期、分类和标签可能为空，需要在编辑器顶部补充。

### 图片目录

当前图片导入会按仓库结构选择资源目录：

```text
优先：src/content/attachments/upload/
其次：attachments/upload/
回退：public/upload/
```

文章中的图片引用必须和你的博客生成器一致。对于当前 Astro 博客结构，通常使用：

```markdown
![图片说明](../attachments/upload/example.png)
```

### GitHub 远程地址

仓库可以使用 HTTPS 或 SSH：

```bash
git remote add origin https://github.com/用户名/仓库.git
```

或：

```bash
git remote add origin git@github.com:用户名/仓库.git
```

检查远程地址：

```bash
git remote -v
```

Blog Studio 当前复用系统 Git 的认证配置。GitHub 网页 OAuth 和操作系统凭据安全存储属于后续路线图功能。

### 与 GitHub Pages 的关系

Blog Studio 本身不要求使用 GitHub Pages。只要仓库能保存 Markdown，就可以使用它。

如果仓库还要部署成静态博客，则需要额外满足对应生成器的要求，例如：

```text
文章目录符合生成器约定
图片路径符合生成器约定
仓库包含网站源码和构建配置
GitHub Actions 或其他部署方式正常
```

Blog Studio 负责编辑和 Git 同步，不会自动替你改变网站生成器的目录结构。

## 编辑文章

编辑器支持两种模式：

### Markdown 源码模式

适合熟悉 Markdown 的用户。可以直接修改原始文本，获得最完整的格式控制。

### 可视化模式

适合不熟悉 Markdown 的用户。通过工具栏完成：

- 标题；
- 粗体和斜体；
- 列表；
- 引用；
- 代码；
- 图片。

复杂表格和特殊 HTML 内容建议使用源码模式检查。

## 文章信息

编辑器顶部可以修改：

- 标题；
- 日期；
- 分类；
- 标签。

多个分类或标签使用逗号分隔，例如：

```text
分类：CTF, Reverse
标签：Assembly, Linux, Notes
```

这些内容写入 Front Matter，不会自动重写正文。

## 插入图片

### 文件选择

点击工具栏的图片按钮，选择 PNG、JPG、JPEG、GIF、WebP 或 SVG。

### 粘贴图片

复制截图后，在编辑区按：

```text
Ctrl + V
```

### 拖拽图片

从文件管理器拖动图片到编辑区。

图片会被复制到仓库资源目录，并插入 Markdown 引用。图片文件和文章文件一样，需要通过 Git commit 保存。

## 离线写作

断网时可以继续：

- 编辑；
- 预览；
- 保存 Markdown；
- 添加图片；
- 查看 Git 状态；
- 创建本地 commit。

离线时不要点击上传。等网络恢复后，再手动拉取或上传。

## GitHub 同步

推荐流程：

```text
保存本地
  ↓
Git 状态
  ↓
查看 diff
  ↓
本地 commit
  ↓
拉取远程（确认）
  ↓
确认上传（确认）
```

### 拉取

拉取可能改变本地文件。软件会在操作前确认。

### 上传

上传只会在点击 **确认上传** 并确认后执行 `git push`。

## 常见问题

### 文章没有显示

确认选择的是博客仓库根目录，而不是 `src/content/posts` 子目录。

### 图片显示不出来

检查图片是否已经保存到仓库、Markdown 相对路径是否正确，并查看 Git diff。

### 想撤销本地修改

优先使用 Git diff 检查，再使用 Git 自己的回滚能力。Blog Studio 不会未经确认自动丢弃修改。
