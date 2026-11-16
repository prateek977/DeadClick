import { describe, it, expect } from 'vitest';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

describe('CLI Options and Argument Handling', () => {
  it('displays help when --help is passed', async () => {
    const { stdout } = await execAsync('node ./dist/cli.js --help');
    expect(stdout).toContain('Usage: deadclick');
    expect(stdout).toContain('scan');
  });

  it('rejects invalid URL protocols with non-zero exit code', async () => {
    try {
      await execAsync('node ./dist/cli.js scan ftp://invalid-url.com');
      expect.fail('Should have failed on invalid protocol');
    } catch (err: any) {
      expect(err.code).toBe(1);
      expect(err.stderr).toContain('URL must start with http:// or https://');
    }
  });

  it('displays version number with --version', async () => {
    const { stdout } = await execAsync('node ./dist/cli.js --version');
    expect(stdout.trim()).toBe('0.1.0');
  });
});

