use serde::Serialize;
use std::process::Command;

#[derive(Debug, Serialize)]
pub struct GitSnapshot {
  pub branch: String,
  pub status: String,
  pub diff_stat: String,
}

mod commands {
  use super::{Command, GitSnapshot};

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

  #[tauri::command]
  pub fn git_snapshot(repo: String) -> Result<GitSnapshot, String> {
    Ok(GitSnapshot {
      branch: run_git(&repo, &["branch", "--show-current"] )?,
      status: run_git(&repo, &["status", "--short"] )?,
      diff_stat: run_git(&repo, &["diff", "--stat"] )?,
    })
  }

  #[tauri::command]
  pub fn git_diff(repo: String) -> Result<String, String> {
    run_git(&repo, &["diff", "--no-ext-diff", "--"])
  }

  #[tauri::command]
  pub fn git_commit(repo: String, message: String) -> Result<String, String> {
    let message = message.trim();
    if message.is_empty() {
      return Err("提交信息不能为空".into());
    }
    run_git(&repo, &["add", "-A"])?;
    run_git(&repo, &["commit", "-m", message])
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![commands::git_snapshot, commands::git_diff, commands::git_commit])
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
