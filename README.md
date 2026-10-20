# Blog Studio

> A local-first, open-source desktop writing studio for Markdown blogs.

Blog Studio is a **Tauri 2 desktop application** for Windows and Linux. It is designed for writing without a network connection and synchronizing with Git/GitHub only when the user explicitly chooses to do so.

The final product is a native desktop app. The React/Vite frontend is the UI embedded inside the Tauri window, not a hosted web backend.

## Why Blog Studio?

- Write and preview Markdown offline;
- Edit existing local blog repositories;
- Use a visual editing mode or Markdown source mode;
- Insert images from files, drag-and-drop, or clipboard;
- Review Git status and diff;
- Create local commits;
- Pull and push GitHub only after confirmation;
- Keep the content in ordinary files instead of a proprietary database;
- Work well on Arch Linux first, while keeping Windows support in the build matrix.

## Quick start on Arch Linux

Install the native dependencies:

```bash
sudo pacman -S --needed \
  base-devel git nodejs npm rust cargo \
  webkit2gtk-4.1 libappindicator-gtk3
```

Clone and start the desktop app:

```bash
git clone https://github.com/qinyuanxin132/blog-studio.git
cd blog-studio
npm ci
npx tauri dev
```

The app opens as a native Tauri window.

## Build Linux packages

Build a native binary:

```bash
npx tauri build --no-bundle
./src-tauri/target/release/blog-studio
```

Build Arch packages through the packaging recipe:

```bash
cd packaging/arch
makepkg -si
```

Build Debian and RPM packages:

```bash
npx tauri build --bundles deb,rpm
```

## Using the application

### 1. Open a local repository

Click **打开本地仓库** and select the root of a Git repository containing Markdown posts. Blog Studio looks for these layouts:

```text
src/content/posts/
content/posts/
posts/
```

### 2. Write offline

You can edit without network access. Saving writes the Markdown file back to the local repository. The application does not upload automatically.

### 3. Edit metadata

The metadata bar supports:

- title;
- date;
- categories;
- tags.

Metadata is stored in Markdown Front Matter. Editing metadata does not rewrite the article body.

### 4. Insert images

Images can be inserted by:

- clicking the image button;
- pasting an image with `Ctrl+V`;
- dragging an image into the editor.

The image is copied into the repository and a Markdown reference is inserted.

### 5. Use Git deliberately

The toolbar exposes:

```text
Git 状态       inspect branch and local changes
远程           inspect origin
连接 GitHub    set or update origin
本地 commit    create a local commit
拉取           pull after confirmation
确认上传       push after confirmation
```

No network operation is triggered just because the network becomes available.

## Architecture

```text
React + TypeScript UI
          ↓
       Tauri 2
          ↓
Rust commands for files, images and Git
          ↓
Local Markdown Git repository
          ↓ user confirmation
GitHub remote → GitHub Pages / another static host
```

Important source locations:

```text
src/App.tsx                         React editor UI
src/App.css                         desktop editor styling
src-tauri/src/lib.rs                native file, image and Git commands
src-tauri/tauri.conf.json           Tauri application configuration
packaging/arch/PKGBUILD              Arch Linux package recipe
.github/workflows/build-desktop.yml Windows/Linux CI build matrix
```

## Project documents

- [Technical architecture](TECHNICAL.md)
- [User guide](docs/USER_GUIDE.md)
- [Roadmap](ROADMAP.md)
- [Contributing](CONTRIBUTING.md)
- [Arch packaging](packaging/arch/PKGBUILD)

## Privacy and data model

Blog Studio does not require a hosted database. Articles, drafts, images and Git history stay in the local repository until the user commits and pushes them.

Credentials must not be stored in Markdown, ordinary configuration files or logs. GitHub authentication and OS credential storage are tracked as separate roadmap items.

## License

MIT. See [LICENSE](LICENSE).
