# Changelog

## 0.1.0 (2026-04-20)

### Features
- Search by locale value — type a translated string and jump to code usage
- Search by locale key — type a key path and find where it's used
- JSON and YAML locale file support (nested and flat structures)
- Automatic namespace detection from `useTranslation()` calls
- Alias detection (`const { t: tNav } = useTranslation('nav')`)
- Inline namespace support (`i18next.t('common:key')`)
- File system watcher for automatic re-indexing on file changes
- Status bar indicator showing index state and key count
- Sidebar tree view for browsing search results
- Configurable glob patterns for locale and source files
- Configurable translation function patterns (regex)
