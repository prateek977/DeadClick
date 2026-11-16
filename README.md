# DeadClick

> Automated UI interaction testing and dead click detection for web applications.

[![CI](https://github.com/prateekjaiswal/deadclick/actions/workflows/ci.yml/badge.svg)](https://github.com/prateekjaiswal/deadclick/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen)](https://nodejs.org)

**DeadClick** is a fast, automated testing tool that crawls websites and inspects every clickable and interactive element to detect broken or non-functional UI behaviors: dead buttons, broken navigation, placeholder links, unhandled custom roles, and form submission crashes.

---

## The Problem

Modern web interfaces frequently suffer from:
- **Dead Clicks**: Buttons that look active but have missing event listeners or dead callbacks.
- **Empty Links**: `<a>` elements containing `href="#"` or `href="javascript:void(0)"` that trigger no action.
- **Broken Destinations**: Links that result in 404/500 HTTP failures or unreachable routes.
- **Form Failures**: Submit buttons that trigger uncaught JavaScript exceptions or failed POST requests.
- **False Positives**: Tools that blindly flag elements without observing DOM changes, network activity, dialog events, or state changes.

DeadClick eliminates false positives by monitoring multi-signal observables (DOM mutations, URL changes, fetch/XHR traffic, modal dialogs, and attribute modifications).

---

## Features

- **Multi-Signal Detection**: Inspects DOM mutations, URL & hash transitions, network requests, error events, and dialogs before drawing conclusions.
- **Element Discovery**: Analyzes `button`, `a`, `input[type="submit"]`, `[role="button"]`, and interactive elements.
- **Zero-Harm Safe Mode**: Automatically identifies and protects sensitive actions (`delete`, `remove`, `logout`, `purge`) from execution during automated crawls.
- **Categorized Findings**:
  - `DEAD_CLICK`: Button was clicked with zero observable effects.
  - `BROKEN_LINK`: Anchor clicked, resulting in HTTP 4xx/5xx or network navigation failure.
  - `EMPTY_LINK`: Anchor with `#` or placeholder `href` with no active handler or action.
  - `NO_INTERACTION_HANDLER`: Element marked as `role="button"` or styled as interactive with no event handler.
  - `FORM_FAILURE`: Submit button triggered uncaught JS errors or broken server endpoints.
  - `INCONCLUSIVE`: Ambiguous states or safe-mode skipped actions marked for manual inspection.
- **Flexible Reporting**: Terminal (colored with Chalk), machine-readable JSON, and standalone HTML reports.
- **Developer-Ready**: Run via CLI (`npx deadclick`) or import as a TypeScript / ES Module library.

---

## Installation

```bash
# Global installation
npm install -g deadclick

# Or run directly via npx
npx deadclick scan https://example.com
```

---

## CLI Usage

### Basic Scan
```bash
npx deadclick scan https://example.com
```

### Export HTML Report
```bash
npx deadclick scan https://example.com --format html --output report.html
```

### Export JSON Report
```bash
npx deadclick scan https://example.com --format json --output report.json
```

### Crawl Multiple Pages in Safe Mode
```bash
npx deadclick scan https://example.com \
  --max-pages 5 \
  --safe-mode \
  --exclude ".logout, .delete-btn" \
  --timeout 15000
```

### CLI Options

| Flag | Short | Description | Default |
|---|---|---|---|
| `--format <type>` | `-f` | Report format: `terminal`, `json`, or `html` | `terminal` |
| `--output <path>` | `-o` | Output file path for JSON or HTML reports | - |
| `--timeout <ms>` | `-t` | Page and interaction timeout in milliseconds | `30000` |
| `--max-pages <n>` | `-m` | Maximum internal pages to crawl | `1` |
| `--exclude <sel>` | `-e` | Comma-separated CSS selectors to skip | `[]` |
| `--safe-mode` | | Skip potentially destructive actions (`delete`, `logout`, etc.) | `false` |
| `--no-headless` | | Launch Chromium in visible browser mode for debugging | `true` |
| `--verbose` | `-v` | Output verbose logs during scan | `false` |
| `--help` | `-h` | Display help screen | - |

---

## Programmatic API

DeadClick can be integrated directly into your CI test pipelines or Node.js scripts:

```typescript
import { Scanner, TerminalReporter, HtmlReporter } from 'deadclick';

const scanner = new Scanner({
  url: 'https://example.com',
  timeout: 10000,
  maxPages: 1,
  safeMode: true,
  exclude: ['.logout-btn', '#cart-checkout']
});

const result = await scanner.run();

// Print terminal summary
console.log(TerminalReporter.render(result));

// Write an HTML report
await HtmlReporter.write(result, './reports/deadclick-report.html');
```

---

## Safety Considerations

- **Destructive Actions**: When testing applications with live databases, enable `--safe-mode` to ensure elements containing keywords like `delete`, `logout`, `remove`, `drop`, or `purge` are skipped.
- **Exclusions**: Use `--exclude ".nav-logout, .payment-form"` to prevent unintended triggers.
- **Staging Environments**: Run automated interaction scans against staging or ephemeral preview environments whenever possible.

---

## Limitations

- **Canvas & WebGL**: Canvas-based interactive controls without standard DOM attributes cannot be observed via standard DOM mutation observers.
- **Third-Party Auth Redirects**: OAuth redirects (e.g. Google Sign-In) that require manual two-factor authentication cannot be completed automatically.
- **Captchas & Bot Verification**: Anti-bot protections will naturally block headless browser automated testing.

---

## Contributing

1. Clone the repository:
   ```bash
   git clone https://github.com/prateekjaiswal/deadclick.git
   cd deadclick
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run test suites:
   ```bash
   npm test
   ```
4. Build the package:
   ```bash
   npm run build
   ```

---

## License

[MIT](LICENSE)

