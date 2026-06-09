#[tauri::command]
pub fn get_drives() -> Vec<String> {
    let mut drives = Vec::new();

    for letter in b'A'..=b'Z' {
        let drive = format!("{}:\\", letter as char);

        if std::path::Path::new(&drive).exists() {
            drives.push(drive);
        }
    }

    drives
}