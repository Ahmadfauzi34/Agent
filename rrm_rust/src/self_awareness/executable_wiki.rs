use std::fs;
use std::path::{Path, PathBuf};
use std::collections::HashMap;

/// Mewakili satu halaman (skill) di dalam Wiki
#[derive(Debug, Clone)]
pub struct WikiPage {
    pub id: String,
    pub page_type: String, // misal: "micro", "conditional_rule", "synthesized"
    pub tier: u8,
    pub confidence: f32,
    pub parent: Option<String>,
    pub content: String, // Raw markdown body

    // Extracted logic blocks (Rust code snippets atau pseudo-code)
    pub code_blocks: Vec<String>,
}

/// Mesin pembaca Wiki (Executable Wiki)
pub struct ExecutableWiki {
    pub knowledge_base: HashMap<String, WikiPage>,
    base_dir: PathBuf,
}

impl ExecutableWiki {
    pub fn new<P: AsRef<Path>>(dir: P) -> Self {
        Self {
            knowledge_base: HashMap::new(),
            base_dir: dir.as_ref().to_path_buf(),
        }
    }

    /// Scan direktori untuk meload semua file .md ke dalam knowledge base
    pub fn load_all(&mut self) -> Result<usize, String> {
        let mut count = 0;
        self.scan_dir(&self.base_dir.clone(), &mut count)?;
        Ok(count)
    }

    fn scan_dir(&mut self, dir: &Path, count: &mut usize) -> Result<(), String> {
        if !dir.exists() || !dir.is_dir() {
            return Err(format!("Direktori wiki tidak ditemukan: {:?}", dir));
        }

        for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let path = entry.path();

            if path.is_dir() {
                self.scan_dir(&path, count)?;
            } else if path.extension().and_then(|s| s.to_str()) == Some("md") {
                if let Ok(page) = Self::parse_markdown_file(&path) {
                    self.knowledge_base.insert(page.id.clone(), page);
                    *count += 1;
                }
            }
        }
        Ok(())
    }

    /// Parse YAML Frontmatter sederhana (tanpa external crate berat)
    fn parse_markdown_file(path: &Path) -> Result<WikiPage, String> {
        let content = fs::read_to_string(path).map_err(|e| e.to_string())?;

        let mut id = String::new();
        let mut page_type = String::new();
        let mut tier = 0;
        let mut confidence = 1.0;
        let mut parent = None;
        let mut body_start_idx = 0;

        // Cek frontmatter "---"
        if content.starts_with("---") {
            if let Some(end_idx) = content[3..].find("---") {
                let frontmatter = &content[3..end_idx + 3];
                body_start_idx = end_idx + 6;

                for line in frontmatter.lines() {
                    let parts: Vec<&str> = line.splitn(2, ':').collect();
                    if parts.len() == 2 {
                        let key = parts[0].trim();
                        let value = parts[1].split('#').next().unwrap_or(parts[1]).trim(); // Hilangkan komentar #

                        match key {
                            "id" => id = value.to_string(),
                            "type" => page_type = value.to_string(),
                            "tier" => tier = value.parse().unwrap_or(0),
                            "confidence" => confidence = value.parse().unwrap_or(1.0),
                            "parent" => parent = Some(value.to_string()),
                            _ => {}
                        }
                    }
                }
            }
        }

        // Fallback ID dari nama file jika tidak ada di frontmatter
        if id.is_empty() {
            id = path.file_stem().unwrap().to_string_lossy().to_string();
        }

        let body = &content[body_start_idx..];

        // Ekstrak code blocks (```rust ... ```)
        let mut code_blocks = Vec::new();
        let mut current_block = String::new();
        let mut in_block = false;

        for line in body.lines() {
            if line.trim().starts_with("```") {
                if in_block {
                    code_blocks.push(current_block.clone());
                    current_block.clear();
                    in_block = false;
                } else {
                    in_block = true;
                }
            } else if in_block {
                current_block.push_str(line);
                current_block.push('\n');
            }
        }

        Ok(WikiPage {
            id,
            page_type,
            tier,
            confidence,
            parent,
            content: body.to_string(),
            code_blocks,
        })
    }

    pub fn get_skill(&self, id: &str) -> Option<&WikiPage> {
        self.knowledge_base.get(id)
    }
}
