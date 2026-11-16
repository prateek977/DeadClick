import fs from 'node:fs/promises';
import path from 'node:path';
import type { ScanResult } from '../core/types.js';

export class JsonReporter {
  static format(result: ScanResult): string {
    return JSON.stringify(result, null, 2);
  }

  static async write(result: ScanResult, outputPath: string): Promise<string> {
    const json = this.format(result);
    const resolvedPath = path.resolve(process.cwd(), outputPath);
    await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
    await fs.writeFile(resolvedPath, json, 'utf-8');
    return resolvedPath;
  }
}

