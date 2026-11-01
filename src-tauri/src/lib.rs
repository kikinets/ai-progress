mod coach;
mod progress;
mod roadmap;
mod secrets;

use std::sync::Mutex;

use chrono::{DateTime, Local, Utc};
use coach::{Quiz, Review};
use progress::{Progress, ProgressStore, ProgressUpdate, ProgressView, TimerMode, session};
use roadmap::Roadmap;
use secrets::KeySource;
use serde::Serialize;
use tauri::{AppHandle, Manager, State};
use tauri_plugin_clipboard_manager::ClipboardExt;

/// Shared by all commands. The Mutex makes progress safe to change from concurrent calls.
struct AppState {
    roadmap: Roadmap,
    /// Untyped copy for the coach prompts until they move to the typed roadmap.
    roadmap_json: serde_json::Value,
    progress: Mutex<ProgressStore>,
    /// Shown once, on the first load after startup.
    notice: Mutex<Option<String>>,
}

impl AppState {
    fn progress_view(&self) -> Result<ProgressView, String> {
        let store = self.progress.lock().map_err(|_| "progress is locked")?;
        Ok(progress::build_view(&self.roadmap, store.data(), Local::now()))
    }

    /// Runs one change to progress, saves it and returns the new view.
    fn mutate(&self, f: impl FnOnce(&mut Progress, DateTime<Utc>) -> Result<(), String>) -> Result<ProgressUpdate, String> {
        let mut store = self.progress.lock().map_err(|_| "progress is locked")?;
        let now = Local::now();
        store.update(|p| f(p, now.with_timezone(&Utc)))?;
        Ok(ProgressUpdate {
            view: progress::build_view(&self.roadmap, store.data(), now),
            new_badges: Vec::new(),
            level_up: None,
        })
    }

    fn require_task(&self, task_id: &str) -> Result<&roadmap::Task, String> {
        self.roadmap.task(task_id).ok_or_else(|| format!("unknown task id: {task_id}"))
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
fn load_roadmap(state: State<AppState>) -> Roadmap {
    state.roadmap.clone()
}

#[tauri::command]
fn load_progress(state: State<AppState>) -> Result<ProgressView, String> {
    let mut view = state.progress_view()?;
    view.notice = state.notice.lock().map_err(|_| "notice is locked")?.take();
    Ok(view)
}

#[tauri::command]
fn start_session(task_id: String, mode: TimerMode, state: State<AppState>) -> Result<ProgressUpdate, String> {
    state.require_task(&task_id)?;
    state.mutate(|p, now| session::start(p, &task_id, mode, now))
}

#[tauri::command]
fn pause_session(state: State<AppState>) -> Result<ProgressUpdate, String> {
    state.mutate(session::pause)
}

#[tauri::command]
fn resume_session(state: State<AppState>) -> Result<ProgressUpdate, String> {
    state.mutate(session::resume)
}

#[tauri::command]
fn stop_session(state: State<AppState>) -> Result<ProgressUpdate, String> {
    state.mutate(|p, now| session::stop(p, now).map(|_| ()))
}

/// Marks a task as done or not done and returns the updated progress.
#[tauri::command]
fn set_task_done(task_id: String, done: bool, state: State<AppState>) -> Result<ProgressUpdate, String> {
    state.require_task(&task_id)?;
    state.mutate(|p, now| {
        let task = p.tasks.entry(task_id).or_default();
        task.completed_at = if done { task.completed_at.or(Some(now)) } else { None };
        Ok(())
    })
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
        let completed = self.completed()?;
        let context = coach::progress_context(&self.roadmap_json, &completed, &view.streak, Local::now().date_naive());
        Ok((context, view))
    }

    fn completed(&self) -> Result<std::collections::BTreeMap<String, DateTime<Utc>>, String> {
        let store = self.progress.lock().map_err(|_| "progress is locked")?;
        Ok(progress::completed_map(store.data()))
    }

    fn quiz_context(&self, skill_id: &str) -> Result<String, String> {
        coach::skill_context(&self.roadmap_json, &self.completed()?, skill_id).ok_or_else(|| format!("unknown skill id: {skill_id}"))
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
    let (context, _) = state.review_context()?;
    let review = coach::ask(&key, &coach::review_request(&context)).await?;
    Ok(coach::clean_review(review, &state.roadmap_json, &state.completed()?))
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
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            let path = app.path().app_data_dir()?.join("progress.json");
            let mut store = ProgressStore::open(path);
            let closed = store.update(|p| Ok(session::close_stale(p, Utc::now()))).unwrap_or(None);
            let notice = closed.map(|_| "Se cerró una sesión que llevaba abierta más de 4 horas.".to_string());
            app.manage(AppState {
                roadmap: roadmap::load()?,
                roadmap_json: roadmap::parse_value()?,
                progress: Mutex::new(store),
                notice: Mutex::new(notice),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_roadmap,
            load_progress,
            set_task_done,
            start_session,
            pause_session,
            resume_session,
            stop_session,
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
