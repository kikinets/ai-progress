// Seed data is read-only, so it is embedded in the binary at compile time.
// Cargo rebuilds automatically when data/roadmap.json changes.
const ROADMAP_JSON: &str = include_str!("../../data/roadmap.json");

/// Returns the study roadmap to the UI.
#[tauri::command]
fn load_roadmap() -> Result<serde_json::Value, String> {
    serde_json::from_str(ROADMAP_JSON).map_err(|e| format!("invalid roadmap.json: {e}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![load_roadmap])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
