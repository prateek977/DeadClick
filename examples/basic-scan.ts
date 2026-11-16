import { Scanner, TerminalReporter, JsonReporter, HtmlReporter } from '../src/index.js';

async function main() {
  const targetUrl = process.argv[2] || 'https://example.com';
  console.log(`Starting programmatic scan of ${targetUrl}...`);

  const scanner = new Scanner({
    url: targetUrl,
    timeout: 15000,
    safeMode: true,
    exclude: ['.logout', '.delete']
  });

  const result = await scanner.run();

  // Print terminal report
  console.log(TerminalReporter.render(result));

  // Save HTML report
  const htmlPath = await HtmlReporter.write(result, 'example-report.html');
  console.log(`Report generated at: ${htmlPath}`);
}

main().catch(console.error);

