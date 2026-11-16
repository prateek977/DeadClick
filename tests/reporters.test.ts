import { describe, it, expect } from 'vitest';
import { TerminalReporter } from '../src/reporters/terminal.js';
import { JsonReporter } from '../src/reporters/json.js';
import { HtmlReporter } from '../src/reporters/html.js';
import type { ScanResult } from '../src/core/types.js';

describe('Reporters', () => {
  const mockResult: ScanResult = {
    url: 'https://example.com',
    scannedPages: ['https://example.com'],
    errors: [],
    summary: {
      totalPagesScanned: 1,
      totalElementsDiscovered: 5,
      totalElementsTested: 5,
      findingsCount: {
        DEAD_CLICK: 1,
        BROKEN_LINK: 0,
        EMPTY_LINK: 1,
        NO_INTERACTION_HANDLER: 0,
        FORM_FAILURE: 0,
        INCONCLUSIVE: 0
      },
      durationMs: 1250,
      startTime: '2026-01-01T00:00:00.000Z',
      endTime: '2026-01-01T00:00:01.250Z'
    },
    findings: [
      {
        id: 'finding-1',
        pageUrl: 'https://example.com',
        selector: '#broken-btn',
        elementText: 'Submit Issue',
        category: 'DEAD_CLICK',
        severity: 'high',
        evidence: 'Click resulted in 0 DOM mutations and 0 requests',
        suggestedFix: 'Attach click listener'
      },
      {
        id: 'finding-2',
        pageUrl: 'https://example.com',
        selector: '#empty-link',
        elementText: 'Empty Link',
        category: 'EMPTY_LINK',
        severity: 'medium',
        evidence: 'Anchor with href="#" produced no effect',
        suggestedFix: 'Provide valid href or use button'
      }
    ]
  };

  it('TerminalReporter generates formatted terminal output', () => {
    const output = TerminalReporter.render(mockResult);
    expect(output).toContain('DeadClick Interaction Audit Report');
    expect(output).toContain('#broken-btn');
    expect(output).toContain('DEAD_CLICK');
    expect(output).toContain('HIGH');
  });

  it('JsonReporter generates valid JSON string', () => {
    const jsonStr = JsonReporter.format(mockResult);
    const parsed = JSON.parse(jsonStr);
    expect(parsed.url).toBe('https://example.com');
    expect(parsed.findings).toHaveLength(2);
    expect(parsed.summary.totalElementsTested).toBe(5);
  });

  it('HtmlReporter generates standalone HTML report with escaped content', () => {
    const html = HtmlReporter.generate(mockResult);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('DeadClick Interaction Audit');
    expect(html).toContain('https://example.com');
    expect(html).toContain('#broken-btn');
    expect(html).toContain('badge badge-cat');
  });
});

