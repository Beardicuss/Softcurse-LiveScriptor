# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-27

### Added
- **Electron Shell Migration**: Converted the experimental web-hosted IDE into a highly performant desktop application.
- **SQLite Database Support**: Transitioned data layer from PostgreSQL to a local `livescriptor.db` via `better-sqlite3`.
- **Dynamic AI Integrations**: Support for OpenAI, OpenRouter, Gemini, and Grok (xAI) using local configuration schemas.
- **Cross-Platform Compatibility**: Reorganized the terminal and zip-extraction flows to support native Windows tools like PowerShell and `tar.exe`.
- **Unified Importing**: Enabled native fetching of Git Repositories, absolutized Local Directories, and raw `.zip` archives.
- **Cyberpunk UI Enhancements**: Added 3D perspective scroll animations to the system floor plane and staggered fade-ins for the active projects list.
- **Editor Settings Engine**: Real-time reactive integration of Word Wrap, Tab Sizes, Font Sizes, and Minimap preferences directly into the Microsoft Monaco text editor engine.
- **Auto-Formatting**: Enabled Monaco's integrated Prettier-based formatting on file save across all supported workspace environments.

### Removed
- Deprecated the legacy web-only AI components.
- Eradicated trailing API OpenAPI specifications (`lib/api-spec`).
- Purged all `.md` and sandboxed web environment artifacts to focus heavily on the localized Electron experience.
