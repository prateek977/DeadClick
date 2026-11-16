#!/usr/bin/env node

import { Command } from 'commander';
import { Scanner } from './core/scanner.js';
import { TerminalReporter } from './reporters/terminal.js';
import { JsonReporter } from './reporters/json.js';
import { HtmlReporter } from './reporters/html.js';
import type { ScannerOptions } from './core/types.js';

const program = new Command();

program
  .name('deadclick')
  .description('Automated UI interaction testing and dead click detection')
  .version('0.1.0');

program
  .command('scan')
  .description('Scan a target URL for dead clicks, broken links, and interaction failures')
  .argument('<url>', 'Target URL to scan (e.g. https://example.com)')
  .option('-f, --format <format>', 'Report format: terminal, json, or html', 'terminal')
  .option('-o, --output <path>', 'Output file path for json or html reports')
  .option('-t, --timeout <ms>', 'Navigation and interaction timeout in milliseconds', '30000')
  .option('-m, --max-pages <num>', 'Maximum number of pages to crawl', '1')
  .option('-e, --exclude <selectors>', 'Comma-separated CSS selectors to exclude from testing')
  .option('--safe-mode', 'Skip potentially destructive actions such as delete, logout, etc.', false)
  .option('--no-headless', 'Run browser in headed mode for visual debugging')
  .option('-v, --verbose', 'Enable verbose logging')
  .action(async (url: string, cmdOptions: any) => {
    try {
      // Validate URL
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
          throw new Error('URL must start with http:// or https://');
        }
      } catch (err: any) {
        console.error(`Error: Invalid URL "${url}": ${err.message}`);
        process.exit(1);
      }

      const exclusions = cmdOptions.exclude
        ? cmdOptions.exclude.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [];

      const format = (cmdOptions.format || 'terminal').toLowerCase();
      const timeout = parseInt(cmdOptions.timeout, 10) || 30000;
      const maxPages = parseInt(cmdOptions.maxPages, 10) || 1;

      const options: ScannerOptions = {
        url: parsedUrl.href,
        timeout,
        maxPages,
        exclude: exclusions,
        safeMode: Boolean(cmdOptions.safeMode),
        headless: cmdOptions.headless !== false,
        verbose: Boolean(cmdOptions.verbose)
      };

      if (cmdOptions.verbose) {
        console.log(`Starting scan of ${options.url}...`);
      }

      const scanner = new Scanner(options);
      const result = await scanner.run();

      // Output based on format
      if (format === 'json') {
        const json = JsonReporter.format(result);
        if (cmdOptions.output) {
          const savedPath = await JsonReporter.write(result, cmdOptions.output);
          console.log(`JSON report saved to: ${savedPath}`);
        } else {
          console.log(json);
        }
      } else if (format === 'html') {
        const outputPath = cmdOptions.output || 'deadclick-report.html';
        const savedPath = await HtmlReporter.write(result, outputPath);
        console.log(`HTML report saved to: ${savedPath}`);
      } else {
        // Default terminal
        console.log(TerminalReporter.render(result));
        if (cmdOptions.output) {
          if (cmdOptions.output.endsWith('.html')) {
            await HtmlReporter.write(result, cmdOptions.output);
            console.log(`HTML report also saved to: ${cmdOptions.output}`);
          } else if (cmdOptions.output.endsWith('.json')) {
            await JsonReporter.write(result, cmdOptions.output);
            console.log(`JSON report also saved to: ${cmdOptions.output}`);
          }
        }
      }

      // Exit code: 1 if high/critical issues found
      const hasCriticalIssues = result.findings.some(
        (f) => f.severity === 'critical' || f.severity === 'high'
      );
      if (hasCriticalIssues) {
        process.exit(1);
      }
      process.exit(0);
    } catch (error: any) {
      console.error('Execution failed:', error?.message || error);
      process.exit(1);
    }
  });

program.parse(process.argv);

