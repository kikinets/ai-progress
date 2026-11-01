mod progress;
mod roadmap;

use std::{collections::HashSet, sync::Mutex};

use progress::{ProgressStore, ProgressView};
use tauri::{Manager, State};

/// Shared by all commands. The Mutex makes progress safe to change from concurrent calls.
struct AppState {
    progress: Mutex<ProgressStore>,
    task_ids: HashSet<String>,
}

/// Returns the study roadmap to the UI.
#[tauri::command]
fn load_roadmap() -> Result<serde_json::Value, String> {
    roadmap::parse().map_err(|e| format!("invalid roadmap.json: {e}"))
}

#[tauri::command]
fn load_progress(state: State<AppState>) -> Result<ProgressView, String> {
    let store = state.progress.lock().map_err(|_| "progress is locked")?;
    Ok(store.view())
}

/// Marks a task as done or not done and returns the updated progress.
#[tauri::command]
fn set_task_done(task_id: String, done: bool, state: State<AppState>) -> Result<ProgressView, String> {
    if !state.task_ids.contains(&task_id) {
        return Err(format!("unknown task id: {task_id}"));
    }
    let mut store = state.progress.lock().map_err(|_| "progress is locked")?;
    store
        .set_done(&task_id, done)
        .map_err(|e| format!("could not save progress: {e}"))?;
    Ok(store.view())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let path = app.path().app_data_dir()?.join("progress.json");
            let task_ids = roadmap::task_ids(&roadmap::parse()?);
            app.manage(AppState {
                progress: Mutex::new(ProgressStore::open(path)),
                task_ids,
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![load_roadmap, load_progress, set_task_done])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
