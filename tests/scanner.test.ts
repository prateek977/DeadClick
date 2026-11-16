import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { Scanner } from '../src/core/scanner.js';

describe('Scanner Integration Test', () => {
  let server: http.Server;
  let serverUrl: string;

  beforeAll(async () => {
    const fixtureHtml = fs.readFileSync(
      path.resolve(__dirname, 'fixtures/test-page.html'),
      'utf-8'
    );

    server = http.createServer((req, res) => {
      if (req.url === '/' || req.url === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(fixtureHtml);
      } else if (req.url === '/broken-404') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      } else {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
      }
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          serverUrl = `http://127.0.0.1:${address.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it('scans the test page and detects dead clicks without false positives', async () => {
    const scanner = new Scanner({
      url: serverUrl,
      timeout: 10000,
      headless: true,
      safeMode: true
    });

    const result = await scanner.run();

    expect(result.summary.totalPagesScanned).toBe(1);
    expect(result.summary.totalElementsDiscovered).toBeGreaterThan(0);
    expect(result.findings.length).toBeGreaterThan(0);

    // Verify DEAD_CLICK was found for dead-btn
    const deadClick = result.findings.find((f) => f.selector.includes('dead-btn'));
    expect(deadClick).toBeDefined();
    expect(deadClick?.category).toBe('DEAD_CLICK');

    // Verify EMPTY_LINK was found for empty-link
    const emptyLink = result.findings.find((f) => f.selector.includes('empty-link'));
    expect(emptyLink).toBeDefined();
    expect(emptyLink?.category).toBe('EMPTY_LINK');

    // Verify working button is NOT flagged as dead click
    const workingBtnFinding = result.findings.find((f) => f.selector.includes('working-btn'));
    expect(workingBtnFinding).toBeUndefined();

    // Verify NO_INTERACTION_HANDLER for fake button
    const fakeBtnFinding = result.findings.find((f) => f.selector.includes('no-handler-btn'));
    expect(fakeBtnFinding).toBeDefined();
    expect(fakeBtnFinding?.category).toBe('NO_INTERACTION_HANDLER');

    // Verify FORM_FAILURE
    const formFailure = result.findings.find((f) => f.selector.includes('broken-submit-btn'));
    expect(formFailure).toBeDefined();
    expect(formFailure?.category).toBe('FORM_FAILURE');
  }, 30000);
});
