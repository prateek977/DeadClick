import fs from 'node:fs/promises';
import path from 'node:path';
import type { Finding, ScanResult } from '../core/types.js';

export class HtmlReporter {
  static escapeHtml(str: string): string {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  static generate(result: ScanResult): string {
    const totalFindings = result.findings.length;
    const { summary } = result;

    const findingsHtml = result.findings
      .map((f: Finding, i: number) => {
        const severityClass = `sev-${f.severity}`;
        return `
        <div class="card finding-card ${severityClass}">
          <div class="card-header">
            <span class="finding-num">#${i + 1}</span>
            <span class="badge badge-sev ${severityClass}">${HtmlReporter.escapeHtml(f.severity.toUpperCase())}</span>
            <span class="badge badge-cat">${HtmlReporter.escapeHtml(f.category)}</span>
            <h3 class="element-name">${HtmlReporter.escapeHtml(f.elementText || '(Unnamed Element)')}</h3>
          </div>
          <div class="card-body">
            <div class="meta-row">
              <strong>Page:</strong> <code>${HtmlReporter.escapeHtml(f.pageUrl)}</code>
            </div>
            <div class="meta-row">
              <strong>Selector:</strong> <code>${HtmlReporter.escapeHtml(f.selector)}</code>
            </div>
            <div class="meta-row">
              <strong>Evidence:</strong> <span>${HtmlReporter.escapeHtml(f.evidence)}</span>
            </div>
            <div class="meta-row fix-row">
              <strong>Suggested Fix:</strong> <span class="fix-text">${HtmlReporter.escapeHtml(f.suggestedFix)}</span>
            </div>
          </div>
        </div>
      `;
      })
      .join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DeadClick Audit Report - ${HtmlReporter.escapeHtml(result.url)}</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --muted: #94a3b8;
      --accent: #38bdf8;
      --red: #ef4444;
      --orange: #f97316;
      --yellow: #eab308;
      --blue: #3b82f6;
      --green: #22c55e;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 2rem;
    }
    .container { max-width: 1100px; margin: 0 auto; }
    header {
      margin-bottom: 2rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 1.5rem;
    }
    h1 { font-size: 2rem; font-weight: 700; color: #fff; margin-bottom: 0.5rem; }
    .subtitle { color: var(--muted); font-size: 1rem; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 1.25rem;
    }
    .stat-label { font-size: 0.85rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .stat-value { font-size: 1.85rem; font-weight: 700; margin-top: 0.25rem; }
    .finding-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      margin-bottom: 1rem;
      overflow: hidden;
    }
    .card-header {
      padding: 1rem 1.25rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: rgba(255, 255, 255, 0.02);
      border-bottom: 1px solid var(--border);
    }
    .card-body { padding: 1.25rem; display: flex; flex-direction: column; gap: 0.6rem; }
    .meta-row { font-size: 0.95rem; }
    .meta-row strong { color: var(--muted); min-width: 100px; display: inline-block; }
    .fix-row {
      margin-top: 0.5rem;
      padding-top: 0.75rem;
      border-top: 1px dashed var(--border);
    }
    .fix-text { color: #86efac; }
    code {
      background: rgba(0, 0, 0, 0.3);
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.88rem;
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.6rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.05em;
    }
    .badge-cat { background: rgba(56, 189, 248, 0.15); color: var(--accent); }
    .sev-critical { border-left: 4px solid var(--red); }
    .sev-critical .badge-sev { background: var(--red); color: #fff; }
    .sev-high { border-left: 4px solid var(--orange); }
    .sev-high .badge-sev { background: var(--orange); color: #fff; }
    .sev-medium { border-left: 4px solid var(--yellow); }
    .sev-medium .badge-sev { background: var(--yellow); color: #000; }
    .sev-low { border-left: 4px solid var(--blue); }
    .sev-low .badge-sev { background: var(--blue); color: #fff; }
    .finding-num { color: var(--muted); font-weight: 600; font-size: 0.9rem; }
    .empty-state {
      padding: 3rem;
      text-align: center;
      background: var(--card-bg);
      border-radius: 8px;
      border: 1px solid var(--border);
      color: var(--green);
      font-size: 1.2rem;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>DeadClick Interaction Audit</h1>
      <div class="subtitle">Scanned Target: <strong>${HtmlReporter.escapeHtml(result.url)}</strong> &bull; ${new Date(summary.endTime).toLocaleString()}</div>
    </header>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Pages Scanned</div>
        <div class="stat-value">${summary.totalPagesScanned}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Elements Tested</div>
        <div class="stat-value">${summary.totalElementsTested}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Issues Found</div>
        <div class="stat-value" style="color: ${totalFindings > 0 ? 'var(--orange)' : 'var(--green)'};">${totalFindings}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Scan Duration</div>
        <div class="stat-value">${(summary.durationMs / 1000).toFixed(1)}s</div>
      </div>
    </div>

    <section class="findings-section">
      ${
        totalFindings === 0
          ? '<div class="empty-state">No dead clicks or broken interactions detected!</div>'
          : findingsHtml
      }
    </section>
  </div>
</body>
</html>`;
  }

  static async write(result: ScanResult, outputPath: string): Promise<string> {
    const html = this.generate(result);
    const resolvedPath = path.resolve(process.cwd(), outputPath);
    await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
    await fs.writeFile(resolvedPath, html, 'utf-8');
    return resolvedPath;
  }
}

