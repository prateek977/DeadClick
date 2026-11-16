import chalk from 'chalk';
import type { Finding, FindingCategory, FindingSeverity, ScanResult } from '../core/types.js';

export class TerminalReporter {
  static formatSeverity(severity: FindingSeverity): string {
    switch (severity) {
      case 'critical':
        return chalk.bgRed.white.bold(' CRITICAL ');
      case 'high':
        return chalk.red.bold(' HIGH ');
      case 'medium':
        return chalk.yellow.bold(' MEDIUM ');
      case 'low':
        return chalk.blue.bold(' LOW ');
      default:
        return chalk.gray(` ${String(severity).toUpperCase()} `);
    }
  }

  static formatCategory(category: FindingCategory): string {
    switch (category) {
      case 'DEAD_CLICK':
        return chalk.redBright.bold('[DEAD_CLICK]');
      case 'BROKEN_LINK':
        return chalk.red.bold('[BROKEN_LINK]');
      case 'EMPTY_LINK':
        return chalk.yellow.bold('[EMPTY_LINK]');
      case 'FORM_FAILURE':
        return chalk.magenta.bold('[FORM_FAILURE]');
      case 'NO_INTERACTION_HANDLER':
        return chalk.cyan.bold('[NO_INTERACTION_HANDLER]');
      case 'INCONCLUSIVE':
        return chalk.gray.bold('[INCONCLUSIVE]');
      default:
        return chalk.white.bold(`[${category}]`);
    }
  }

  static render(result: ScanResult): string {
    const lines: string[] = [];

    lines.push('');
    lines.push(chalk.bold.cyan('╔═══════════════════════════════════════════════════════════╗'));
    lines.push(chalk.bold.cyan('║              DeadClick Interaction Audit Report           ║'));
    lines.push(chalk.bold.cyan('╚═══════════════════════════════════════════════════════════╝'));
    lines.push('');
    lines.push(`${chalk.gray('Target URL:')} ${chalk.bold.underline(result.url)}`);
    lines.push(`${chalk.gray('Pages Scanned:')} ${result.summary.totalPagesScanned}`);
    lines.push(`${chalk.gray('Elements Discovered:')} ${result.summary.totalElementsDiscovered}`);
    lines.push(`${chalk.gray('Elements Tested:')} ${result.summary.totalElementsTested}`);
    lines.push(`${chalk.gray('Scan Duration:')} ${(result.summary.durationMs / 1000).toFixed(2)}s`);
    lines.push('');

    const totalFindings = result.findings.length;
    if (totalFindings === 0) {
      lines.push(chalk.green.bold('✔ No dead clicks or broken interactions detected!'));
      lines.push('');
      return lines.join('\n');
    }

    lines.push(chalk.bold.underline(`Findings (${totalFindings} total):`));
    lines.push('');

    result.findings.forEach((f: Finding, idx: number) => {
      lines.push(
        `${chalk.bold(`#${idx + 1}`)} ${this.formatSeverity(f.severity)} ${this.formatCategory(f.category)} ${chalk.white.bold(f.elementText || '(No label)')}`
      );
      lines.push(`  ${chalk.gray('Page:')}      ${chalk.dim(f.pageUrl)}`);
      lines.push(`  ${chalk.gray('Selector:')}  ${chalk.cyan(f.selector)}`);
      lines.push(`  ${chalk.gray('Evidence:')}  ${chalk.white(f.evidence)}`);
      lines.push(`  ${chalk.gray('Fix:')}       ${chalk.green(f.suggestedFix)}`);
      lines.push('');
    });

    lines.push(chalk.bold('Summary by Category:'));
    for (const [cat, count] of Object.entries(result.summary.findingsCount)) {
      if (count > 0) {
        lines.push(`  - ${cat}: ${chalk.bold(count.toString())}`);
      }
    }
    lines.push('');

    return lines.join('\n');
  }
}
