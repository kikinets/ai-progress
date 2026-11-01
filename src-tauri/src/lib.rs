mod coach;
mod progress;
mod roadmap;
mod secrets;

use std::{collections::HashSet, sync::Mutex};

use chrono::Local;
use coach::{Quiz, Review};
use progress::{ProgressStore, ProgressView};
use secrets::KeySource;
use serde::Serialize;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_clipboard_manager::ClipboardExt;

/// Shared by all commands. The Mutex makes progress safe to change from concurrent calls.
struct AppState {
    roadmap: serde_json::Value,
    progress: Mutex<ProgressStore>,
    task_ids: HashSet<String>,
}

impl AppState {
    fn progress_view(&self) -> Result<ProgressView, String> {
        let store = self.progress.lock().map_err(|_| "progress is locked")?;
        Ok(progress::build_view(store.data()))
    }
}

#[derive(Serialize)]
struct ApiKeyStatus {
    source: Option<KeySource>,
}

fn require_api_key() -> Result<String, String> {
    secrets::api_key()
        .map(|(key, _)| key)
        .ok_or_else(|| "Falta la clave de API. Añádela en la pestaña Coach.".to_string())
}

/// Returns the study roadmap to the UI.
#[tauri::command]
fn load_roadmap(state: State<AppState>) -> serde_json::Value {
    state.roadmap.clone()
}

#[tauri::command]
fn load_progress(state: State<AppState>) -> Result<ProgressView, String> {
    state.progress_view()
}

/// Marks a task as done or not done and returns the updated progress.
#[tauri::command]
fn set_task_done(task_id: String, done: bool, state: State<AppState>) -> Result<ProgressView, String> {
    if !state.task_ids.contains(&task_id) {
        return Err(format!("unknown task id: {task_id}"));
    }
    let mut store = state.progress.lock().map_err(|_| "progress is locked")?;
    store.update(|p| {
        let task = p.tasks.entry(task_id.clone()).or_default();
        task.completed_at = if done { task.completed_at.or(Some(chrono::Utc::now())) } else { None };
        Ok(())
    })?;
    Ok(progress::build_view(store.data()))
}

/// Says whether a key is configured and where it comes from; never returns the key itself.
#[tauri::command]
fn api_key_status() -> ApiKeyStatus {
    ApiKeyStatus { source: secrets::api_key().map(|(_, source)| source) }
}

#[tauri::command]
fn set_api_key(key: String) -> Result<(), String> {
    let key = key.trim();
    if key.is_empty() {
        return Err("La clave está vacía.".into());
    }
    secrets::save(key)
}

#[tauri::command]
fn delete_api_key() -> Result<(), String> {
    secrets::delete()
}

impl AppState {
    fn review_context(&self) -> Result<(String, ProgressView), String> {
        let view = self.progress_view()?;
        let context = coach::progress_context(&self.roadmap, &view.completed, &view.streak, Local::now().date_naive());
        Ok((context, view))
    }

    fn quiz_context(&self, skill_id: &str) -> Result<String, String> {
        let view = self.progress_view()?;
        coach::skill_context(&self.roadmap, &view.completed, skill_id).ok_or_else(|| format!("unknown skill id: {skill_id}"))
    }
}

// Free mode: Rust writes the prompt to the clipboard and the user pastes it into claude.ai.
// Copying from Rust avoids the webview's clipboard permission rules.
fn copy(app: &AppHandle, text: String) -> Result<(), String> {
    app.clipboard().write_text(text).map_err(|e| format!("no se pudo copiar: {e}"))
}

#[tauri::command]
fn copy_review_prompt(app: AppHandle, state: State<AppState>) -> Result<(), String> {
    copy(&app, coach::review_chat_prompt(&state.review_context()?.0))
}

#[tauri::command]
fn copy_quiz_prompt(skill_id: String, app: AppHandle, state: State<AppState>) -> Result<(), String> {
    copy(&app, coach::quiz_chat_prompt(&state.quiz_context(&skill_id)?))
}

// API mode. Async commands run off the UI thread, so the window stays responsive while Claude answers.
#[tauri::command]
async fn coach_review(state: State<'_, AppState>) -> Result<Review, String> {
    let key = require_api_key()?;
    let (context, view) = state.review_context()?;
    let review = coach::ask(&key, &coach::review_request(&context)).await?;
    Ok(coach::clean_review(review, &state.roadmap, &view.completed))
}

#[tauri::command]
async fn coach_quiz(skill_id: String, state: State<'_, AppState>) -> Result<Quiz, String> {
    let key = require_api_key()?;
    let context = state.quiz_context(&skill_id)?;
    coach::clean_quiz(coach::ask(&key, &coach::quiz_request(&context)).await?)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            let path = app.path().app_data_dir()?.join("progress.json");
            let roadmap = roadmap::parse_value()?;
            app.manage(AppState {
                task_ids: roadmap::task_ids(&roadmap),
                roadmap,
                progress: Mutex::new(ProgressStore::open(path)),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_roadmap,
            load_progress,
            set_task_done,
            api_key_status,
            set_api_key,
            delete_api_key,
            copy_review_prompt,
            copy_quiz_prompt,
            coach_review,
            coach_quiz
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
