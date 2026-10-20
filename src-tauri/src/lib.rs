use serde::{Deserialize, Serialize};
use std::{fs, path::{Path, PathBuf}, process::Command};

#[derive(Debug, Serialize)]
pub struct GitSnapshot {
  pub branch: String,
  pub status: String,
  pub diff_stat: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LocalPost {
  pub path: String,
  pub body: String,
}

mod commands {
  use super::{fs, Command, GitSnapshot, LocalPost, Path, PathBuf};

  fn run_git(repo: &str, args: &[&str]) -> Result<String, String> {
    let output = Command::new("git")
      .args(args)
      .current_dir(repo)
      .output()
      .map_err(|error| format!("无法执行 Git：{error}"))?;
    if output.status.success() {
      Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
      Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
  }

  fn posts_directory(repo: &Path) -> Result<(PathBuf, String), String> {
    for (relative, prefix) in [
      (PathBuf::from("src/content/posts"), "src/content/posts"),
      (PathBuf::from("content/posts"), "content/posts"),
      (PathBuf::from("posts"), "posts"),
    ] {
      let candidate = repo.join(&relative);
      if candidate.is_dir() { return Ok((candidate, prefix.to_string())); }
    }
    Err("没有找到 src/content/posts、content/posts 或 posts 目录".into())
  }

  #[tauri::command]
  pub fn read_posts(repo: String) -> Result<Vec<LocalPost>, String> {
    let (directory, prefix) = posts_directory(Path::new(&repo))?;
    let mut posts = Vec::new();
    for entry in fs::read_dir(&directory).map_err(|error| error.to_string())? {
      let entry = entry.map_err(|error| error.to_string())?;
      let path = entry.path();
      if path.extension().and_then(|ext| ext.to_str()) != Some("md") { continue; }
      let body = fs::read_to_string(&path).map_err(|error| error.to_string())?;
      let name = path.file_name().and_then(|name| name.to_str()).ok_or("无效文章文件名")?;
      posts.push(LocalPost { path: format!("{prefix}/{name}"), body });
    }
    posts.sort_by(|a, b| a.path.cmp(&b.path));
    Ok(posts)
  }

  #[tauri::command]
  pub fn write_post(repo: String, relative_path: String, body: String) -> Result<(), String> {
    let relative = Path::new(&relative_path);
    if relative.is_absolute() || relative.components().any(|part| matches!(part, std::path::Component::ParentDir)) {
      return Err("文章路径不安全".into());
    }
    let target = Path::new(&repo).join(relative);
    if target.extension().and_then(|ext| ext.to_str()) != Some("md") { return Err("只能写入 Markdown 文件".into()); }
    fs::write(target, body).map_err(|error| error.to_string())
  }

  #[tauri::command]
  pub fn git_snapshot(repo: String) -> Result<GitSnapshot, String> {
    Ok(GitSnapshot {
      branch: run_git(&repo, &["branch", "--show-current"] )?,
      status: run_git(&repo, &["status", "--short"] )?,
      diff_stat: run_git(&repo, &["diff", "--stat"] )?,
    })
  }

  #[tauri::command]
  pub fn git_diff(repo: String) -> Result<String, String> { run_git(&repo, &["diff", "--no-ext-diff", "--"]) }

  #[tauri::command]
  pub fn git_commit(repo: String, message: String) -> Result<String, String> {
    let message = message.trim();
    if message.is_empty() { return Err("提交信息不能为空".into()); }
    run_git(&repo, &["add", "-A"])?;
    run_git(&repo, &["commit", "-m", message])
  }

  #[tauri::command]
  pub fn git_remote(repo: String) -> Result<String, String> { run_git(&repo, &["remote", "-v"]) }

  #[tauri::command]
  pub fn git_set_remote(repo: String, url: String) -> Result<String, String> {
    let url = url.trim();
    if url.is_empty() { return Err("远程地址不能为空".into()); }
    let existing = run_git(&repo, &["remote"])?;
    if existing.lines().any(|name| name.trim() == "origin") {
      run_git(&repo, &["remote", "set-url", "origin", url])
    } else { run_git(&repo, &["remote", "add", "origin", url]) }
  }

  #[tauri::command]
  pub fn git_pull(repo: String) -> Result<String, String> { run_git(&repo, &["pull", "--ff-only"]) }

  #[tauri::command]
  pub fn git_push(repo: String) -> Result<String, String> { run_git(&repo, &["push"]) }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(tauri_plugin_log::Builder::default().level(log::LevelFilter::Info).build())?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      commands::read_posts, commands::write_post, commands::git_snapshot, commands::git_diff,
      commands::git_commit, commands::git_remote, commands::git_set_remote, commands::git_pull, commands::git_push
    ])
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
