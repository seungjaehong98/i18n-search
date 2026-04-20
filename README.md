# i18n Search

**Search locale values and jump directly to code usages.**

로케일 값을 검색하면, 해당 번역이 사용된 코드 위치로 바로 이동할 수 있는 VS Code 확장입니다.

---

## Why?

다국어(i18n) 프로젝트에서 번역된 텍스트의 코드 사용처를 찾으려면 보통 **2단계**가 필요합니다:

```
1단계: 로케일 값으로 키 찾기
   "비밀번호를 입력해 주세요" → locale 파일에서 검색 → password.changeCurrentPlaceholder

2단계: 키로 코드 사용처 찾기  
   password.changeCurrentPlaceholder → 소스 코드에서 검색 → t('password.changeCurrentPlaceholder')
```

**i18n Search**는 이 과정을 **1단계**로 줄여줍니다:

```
"비밀번호를 입력해 주세요" 검색 → 바로 코드 사용처로 이동
```

---

## Features

- **Search by Value** — 번역된 텍스트로 검색하여 코드 사용처로 바로 이동
- **Search by Key** — 로케일 키로 검색
- **JSON & YAML** — 두 포맷 모두 지원 (중첩 구조 + 플랫 구조)
- **Namespace Aware** — `useTranslation('common')`, 별칭 (`t: tNav`), 인라인 (`i18next.t('ns:key')`) 자동 감지
- **Auto-index** — 파일 변경 시 자동으로 재인덱싱
- **Multi-language** — 모든 언어 파일 검색 또는 특정 언어 필터링

---

## Quick Start

### 1. 설치

**VSIX 파일로 설치:**
```bash
code --install-extension i18n-search-0.1.0.vsix
```

또는 VS Code에서 `Cmd+Shift+X` → 상단 `...` → **Install from VSIX...** 선택

### 2. 사용

| 동작 | 단축키 |
|------|--------|
| 로케일 값으로 검색 | `Cmd+Shift+I` (Mac) / `Ctrl+Shift+I` (Win/Linux) |
| 로케일 키로 검색 | Command Palette → `i18n Search: Search by Key` |
| 수동 재인덱싱 | Command Palette → `i18n Search: Reindex All Files` |

### 3. 검색 흐름

```
Cmd+Shift+I 입력
    ↓
검색창에 번역 텍스트 입력 (예: "비밀번호를 입력")
    ↓
매칭되는 로케일 항목 목록 표시
  ┌─────────────────────────────────────────────┐
  │  비밀번호를 입력해 주세요.                      │
  │  auth:password.changeCurrentPlaceholder [ko] │
  │  2 usages in code                            │
  ├─────────────────────────────────────────────┤
  │  비밀번호를 입력하세요.                         │
  │  auth:password.placeholder [ko]              │
  │  1 usage in code                             │
  └─────────────────────────────────────────────┘
    ↓
항목 선택 → 코드 사용처로 바로 이동
```

- 사용처가 **1개**면 바로 이동
- 사용처가 **여러 개**면 목록에서 선택
- 사용처가 **없으면** 로케일 파일로 이동

---

## Supported Locale Structures

### Nested (중첩 구조)
```json
{
  "login": {
    "title": "로그인",
    "emailPlaceholder": "이메일"
  }
}
```

### Flat (플랫 구조)
```json
{
  "login.title": "로그인",
  "login.emailPlaceholder": "이메일"
}
```

### YAML
```yaml
login:
  title: 로그인
  emailPlaceholder: 이메일
```

---

## Settings

VS Code Settings (`Cmd+,`) 에서 `i18nSearch`로 검색하여 설정할 수 있습니다.

| Setting | Default | Description |
|---------|---------|-------------|
| `i18nSearch.localeFilePaths` | `**/locales/**/*.json` | 로케일 파일 glob 패턴 |
| `i18nSearch.sourceFilePaths` | `**/*.{ts,tsx,js,jsx,vue,svelte}` | 소스 코드 glob 패턴 |
| `i18nSearch.excludePatterns` | `**/node_modules/**` 등 | 제외할 패턴 |
| `i18nSearch.translationCallPatterns` | `t()`, `i18next.t()`, `$t()` 등 | 번역 함수 감지 정규식 |
| `i18nSearch.namespaceSeparator` | `:` | 네임스페이스 구분자 |
| `i18nSearch.primaryLanguage` | `""` (전체) | 우선 검색 언어 (예: `ko`) |
| `i18nSearch.searchMode` | `contains` | 검색 모드: `contains` / `fuzzy` / `exact` |
| `i18nSearch.maxSearchResults` | `50` | 최대 검색 결과 수 |

### 설정 예시

프로젝트의 로케일 파일이 `src/i18n/` 아래에 있다면:

```json
{
  "i18nSearch.localeFilePaths": ["**/src/i18n/**/*.json"],
  "i18nSearch.primaryLanguage": "ko"
}
```

---

## Supported Frameworks

`t('key')` 스타일의 함수 호출을 사용하는 모든 i18n 라이브러리를 지원합니다:

- **next-i18next** / react-i18next / i18next
- **vue-i18n** (`$t('key')`)
- **react-intl** (커스텀 패턴 설정으로 지원)
- 기타 — `translationCallPatterns` 설정으로 커스텀 패턴 추가 가능

---

## Requirements

- VS Code 1.85.0 이상

---

## License

MIT
