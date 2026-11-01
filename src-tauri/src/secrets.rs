// The Anthropic API key lives in the OS credential store (Windows Credential Manager),
// never in a file inside the app or the repo.

use serde::Serialize;

const SERVICE: &str = "com.enrique.aiprogress";
const ACCOUNT: &str = "anthropic-api-key";
const ENV_VAR: &str = "ANTHROPIC_API_KEY";

#[derive(Debug, Clone, Copy, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum KeySource {
    Env,
    Keyring,
}

fn entry() -> Result<keyring::Entry, String> {
    keyring::Entry::new(SERVICE, ACCOUNT).map_err(|e| format!("no se pudo abrir el almacén de credenciales: {e}"))
}

/// The environment variable wins, so developers can override the stored key.
pub fn api_key() -> Option<(String, KeySource)> {
    if let Ok(key) = std::env::var(ENV_VAR)
        && !key.trim().is_empty()
    {
        return Some((key, KeySource::Env));
    }
    let key = entry().ok()?.get_password().ok()?;
    Some((key, KeySource::Keyring))
}

pub fn save(key: &str) -> Result<(), String> {
    entry()?
        .set_password(key)
        .map_err(|e| format!("no se pudo guardar la clave: {e}"))
}

pub fn delete() -> Result<(), String> {
    match entry()?.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(format!("no se pudo borrar la clave: {e}")),
    }
}
