import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import type { ScannerOptions } from '../core/types.js';

export class BrowserEngine {
  private browser: Browser | null = null;
  private defaultTimeout: number;
  private isHeadless: boolean;

  constructor(options: Partial<ScannerOptions> = {}) {
    this.defaultTimeout = options.timeout ?? 30000;
    this.isHeadless = options.headless ?? true;
  }

  async init(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: this.isHeadless,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
    }
    return this.browser;
  }

  async createContext(viewport?: { width: number; height: number }): Promise<BrowserContext> {
    const browser = await this.init();
    const context = await browser.newContext({
      viewport: viewport ?? { width: 1280, height: 800 },
      ignoreHTTPSErrors: true
    });
    context.setDefaultTimeout(this.defaultTimeout);
    return context;
  }

  async createPage(context: BrowserContext): Promise<Page> {
    const page = await context.newPage();
    page.setDefaultTimeout(this.defaultTimeout);
    return page;
  }

  async close(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
      } catch {
        // Suppress cleanup errors
      } finally {
        this.browser = null;
      }
    }
  }
}

