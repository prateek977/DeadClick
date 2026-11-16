import { BrowserEngine } from '../browser/engine.js';
import { InteractionAnalyzer } from './analyzer.js';
import { InteractionDetector } from './detector.js';
import type { Finding, FindingCategory, ScannerOptions, ScanResult, ScanSummary } from './types.js';

export class Scanner {
  private options: Required<ScannerOptions>;
  private engine: BrowserEngine;

  constructor(options: ScannerOptions) {
    this.options = {
      url: options.url,
      maxPages: options.maxPages ?? 1,
      timeout: options.timeout ?? 30000,
      exclude: options.exclude ?? [],
      safeMode: options.safeMode ?? false,
      headless: options.headless ?? true,
      format: options.format ?? ['terminal'],
      outputPath: options.outputPath ?? '',
      viewport: options.viewport ?? { width: 1280, height: 800 },
      concurrency: options.concurrency ?? 1,
      verbose: options.verbose ?? false
    };
    this.engine = new BrowserEngine(this.options);
  }

  async run(): Promise<ScanResult> {
    const startTime = new Date().toISOString();
    const startTimestamp = Date.now();

    const scannedPages: string[] = [];
    const errors: Array<{ pageUrl: string; error: string }> = [];
    const allFindings: Finding[] = [];
    let totalElementsDiscovered = 0;
    let totalElementsTested = 0;

    const findingsCount: Record<FindingCategory, number> = {
      DEAD_CLICK: 0,
      BROKEN_LINK: 0,
      EMPTY_LINK: 0,
      NO_INTERACTION_HANDLER: 0,
      FORM_FAILURE: 0,
      INCONCLUSIVE: 0
    };

    const pagesToVisit: string[] = [this.options.url];
    const visitedUrls = new Set<string>();

    let context: any = null;

    try {
      context = await this.engine.createContext(this.options.viewport);

      while (pagesToVisit.length > 0 && scannedPages.length < this.options.maxPages) {
        const currentUrl = pagesToVisit.shift()!;
        if (visitedUrls.has(currentUrl)) continue;
        visitedUrls.add(currentUrl);

        const page = await this.engine.createPage(context);

        try {
          if (this.options.verbose) {
            console.log(`[DeadClick] Navigating to ${currentUrl}...`);
          }

          await page.goto(currentUrl, {
            waitUntil: 'domcontentloaded',
            timeout: this.options.timeout
          });

          scannedPages.push(currentUrl);

          // Discover candidate elements
          const elements = await InteractionAnalyzer.discoverElements(page, this.options.exclude);
          totalElementsDiscovered += elements.length;

          // Filter for discoverable, visible elements
          const testableElements = elements.filter((el) => el.isVisible);

          // If crawling multiple pages, collect internal links
          if (this.options.maxPages > 1) {
            const currentOrigin = new URL(currentUrl).origin;
            for (const el of elements) {
              if (el.tagName === 'a' && el.href) {
                try {
                  const resolvedUrl = new URL(el.href, currentUrl);
                  if (
                    resolvedUrl.origin === currentOrigin &&
                    !visitedUrls.has(resolvedUrl.href) &&
                    !pagesToVisit.includes(resolvedUrl.href)
                  ) {
                    pagesToVisit.push(resolvedUrl.href);
                  }
                } catch {
                  // Ignore malformed URL
                }
              }
            }
          }

          // Test elements sequentially with state restoration
          for (const el of testableElements) {
            // Check if page URL changed or DOM was navigated away
            if (page.url() !== currentUrl) {
              await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: this.options.timeout });
            }

            // Check if element is still attached, otherwise reload
            const locator = page.locator(el.selector).first();
            const count = await locator.count().catch(() => 0);
            if (count === 0) {
              await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: this.options.timeout });
            }

            totalElementsTested++;

            try {
              const signals = await InteractionAnalyzer.testInteraction(page, el);
              const finding = InteractionDetector.classify(el, signals, currentUrl, this.options.safeMode);

              if (finding) {
                allFindings.push(finding);
                findingsCount[finding.category]++;
              }

              // If interaction navigated away or mutated page significantly, restore page
              if (signals.urlChanged || signals.targetElementRemoved) {
                await page.goto(currentUrl, { waitUntil: 'domcontentloaded', timeout: this.options.timeout }).catch(() => {});
              }
            } catch (interactionError: any) {
              if (this.options.verbose) {
                console.warn(`[DeadClick] Interaction failed on ${el.selector}:`, interactionError?.message);
              }
            }
          }
        } catch (pageError: any) {
          errors.push({
            pageUrl: currentUrl,
            error: pageError?.message || 'Unknown page error'
          });
        } finally {
          await page.close().catch(() => {});
        }
      }
    } finally {
      if (context) {
        await context.close().catch(() => {});
      }
      await this.engine.close().catch(() => {});
    }

    const endTime = new Date().toISOString();
    const durationMs = Date.now() - startTimestamp;

    const summary: ScanSummary = {
      totalPagesScanned: scannedPages.length,
      totalElementsDiscovered,
      totalElementsTested,
      findingsCount,
      durationMs,
      startTime,
      endTime
    };

    return {
      url: this.options.url,
      summary,
      findings: allFindings,
      scannedPages,
      errors
    };
  }
}

