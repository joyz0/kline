import { Command } from 'commander';

export function registerBrowserCli(program: Command) {
  const browser = program
    .command('browser')
    .description('Browser control commands');

  browser
    .command('start')
    .option('--profile <name>', 'Browser profile name', 'default')
    .description('Start browser with specified profile')
    .action(async (opts) => {
      try {
        const response = await callBrowserRequest({
          method: 'POST',
          path: '/start',
          body: { profile: opts.profile },
        });

        console.log('✓ Browser started successfully');
        console.log(`  Profile: ${opts.profile}`);

        if (response.port) {
          console.log(`  Port: ${response.port}`);
        }
      } catch (error) {
        console.error(
          '✗ Failed to start browser:',
          error instanceof Error ? error.message : 'Unknown error',
        );

        process.exit(1);
      }
    });

  browser
    .command('stop')
    .option('--profile <name>', 'Browser profile name', 'default')
    .description('Stop browser with specified profile')
    .action(async (opts) => {
      try {
        await callBrowserRequest({
          method: 'POST',
          path: '/stop',
          body: { profile: opts.profile },
        });

        console.log('✓ Browser stopped successfully');
      } catch (error) {
        console.error(
          '✗ Failed to stop browser:',
          error instanceof Error ? error.message : 'Unknown error',
        );

        process.exit(1);
      }
    });

  browser
    .command('status')
    .option('--profile <name>', 'Browser profile name', 'default')
    .description('Get browser status')
    .action(async (opts) => {
      try {
        const response = await callBrowserRequest({
          method: 'GET',
          path: '/status',
          query: { profile: opts.profile },
        });

        console.log('Browser Status:');
        console.log(`  Profile: ${response.profile}`);
        console.log(`  Running: ${response.running ? 'Yes ✓' : 'No ✗'}`);

        if (response.config) {
          console.log('  Configuration:');

          if (response.config.cdpPort) {
            console.log(`    CDP Port: ${response.config.cdpPort}`);
          }

          if (response.config.cdpUrl) {
            console.log(`    CDP URL: ${response.config.cdpUrl}`);
          }

          console.log(
            `    Headless: ${response.config.headless ? 'Yes' : 'No'}`,
          );
        }
      } catch (error) {
        console.error(
          '✗ Failed to get status:',
          error instanceof Error ? error.message : 'Unknown error',
        );

        process.exit(1);
      }
    });

  browser
    .command('open')
    .argument('<url>', 'URL to open')
    .option('--profile <name>', 'Browser profile name', 'default')
    .description('Open URL in browser')
    .action(async (url, opts) => {
      try {
        const response = await callBrowserRequest({
          method: 'POST',
          path: '/tabs/open',
          body: { url, profile: opts.profile },
        });

        console.log('✓ URL opened successfully');
        console.log(`  Target ID: ${response.targetId}`);
        console.log(`  Title: ${response.title}`);
      } catch (error) {
        console.error(
          '✗ Failed to open URL:',
          error instanceof Error ? error.message : 'Unknown error',
        );

        process.exit(1);
      }
    });

  browser
    .command('tabs')
    .option('--profile <name>', 'Browser profile name', 'default')
    .description('List open tabs')
    .action(async (opts) => {
      try {
        const response = await callBrowserRequest({
          method: 'GET',
          path: '/tabs',
          query: { profile: opts.profile },
        });

        if (!response.tabs || response.tabs.length === 0) {
          console.log('No open tabs');
          return;
        }

        console.log(`Open tabs (${response.tabs.length}):`);

        for (const tab of response.tabs) {
          console.log(`  [${tab.targetId}] ${tab.title}`);
          console.log(`    URL: ${tab.url}`);
        }
      } catch (error) {
        console.error(
          '✗ Failed to list tabs:',
          error instanceof Error ? error.message : 'Unknown error',
        );

        process.exit(1);
      }
    });

  browser
    .command('snapshot')
    .option('--profile <name>', 'Browser profile name', 'default')
    .option('--target <id>', 'Target tab ID')
    .option('--format <format>', 'Snapshot format (ai|aria)', 'ai')
    .description('Get page snapshot')
    .action(async (opts) => {
      try {
        const response = await callBrowserRequest({
          method: 'GET',
          path: '/snapshot',
          query: {
            profile: opts.profile,
            targetId: opts.target,
            format: opts.format,
          },
        });

        console.log('Page Snapshot:');
        console.log(`  URL: ${response.url}`);
        console.log(`  Title: ${response.title}`);
        console.log('\nSnapshot:');
        console.log(response.snapshot);
      } catch (error) {
        console.error(
          '✗ Failed to get snapshot:',
          error instanceof Error ? error.message : 'Unknown error',
        );

        process.exit(1);
      }
    });

  browser
    .command('screenshot')
    .option('--profile <name>', 'Browser profile name', 'default')
    .option('--target <id>', 'Target tab ID')
    .option('--output <path>', 'Output file path', 'screenshot.png')
    .option('--full-page', 'Capture full page', false)
    .description('Take page screenshot')
    .action(async (opts) => {
      try {
        console.log(
          '⚠️  Screenshot command is not fully implemented in CLI yet',
        );
        console.log('   Use the HTTP API directly for screenshots');
      } catch (error) {
        console.error(
          '✗ Failed to take screenshot:',
          error instanceof Error ? error.message : 'Unknown error',
        );

        process.exit(1);
      }
    });

  browser
    .command('click')
    .argument('<ref>', 'Element reference ID')
    .option('--profile <name>', 'Browser profile name', 'default')
    .option('--target <id>', 'Target tab ID')
    .option('--double', 'Double click', false)
    .description('Click element')
    .action(async (ref, opts) => {
      try {
        const response = await callBrowserRequest({
          method: 'POST',
          path: '/click',
          body: {
            ref,
            profile: opts.profile,
            targetId: opts.target,
            double: opts.double,
          },
        });

        console.log('✓ Element clicked successfully');
        console.log(`  Ref: ${ref}`);
      } catch (error) {
        console.error(
          '✗ Failed to click element:',
          error instanceof Error ? error.message : 'Unknown error',
        );

        process.exit(1);
      }
    });

  browser
    .command('type')
    .argument('<ref>', 'Element reference ID')
    .argument('<text>', 'Text to type')
    .option('--profile <name>', 'Browser profile name', 'default')
    .option('--target <id>', 'Target tab ID')
    .option('--submit', 'Submit after typing', false)
    .description('Type text into element')
    .action(async (ref, text, opts) => {
      try {
        const response = await callBrowserRequest({
          method: 'POST',
          path: '/type',
          body: {
            ref,
            text,
            profile: opts.profile,
            targetId: opts.target,
            submit: opts.submit,
          },
        });

        console.log('✓ Text typed successfully');
        console.log(`  Ref: ${ref}`);
        console.log(`  Text: ${text}`);
      } catch (error) {
        console.error(
          '✗ Failed to type text:',
          error instanceof Error ? error.message : 'Unknown error',
        );

        process.exit(1);
      }
    });

  browser
    .command('navigate')
    .argument('<url>', 'URL to navigate to')
    .option('--profile <name>', 'Browser profile name', 'default')
    .option('--target <id>', 'Target tab ID')
    .description('Navigate to URL')
    .action(async (url, opts) => {
      try {
        const response = await callBrowserRequest({
          method: 'POST',
          path: '/navigate',
          body: {
            url,
            profile: opts.profile,
            targetId: opts.target,
          },
        });

        console.log('✓ Navigated successfully');
        console.log(`  URL: ${response.url}`);
        console.log(`  Title: ${response.title}`);
      } catch (error) {
        console.error(
          '✗ Failed to navigate:',
          error instanceof Error ? error.message : 'Unknown error',
        );

        process.exit(1);
      }
    });
}

async function callBrowserRequest(params: {
  method: string;
  path: string;
  query?: Record<string, string>;
  body?: Record<string, unknown>;
}): Promise<any> {
  const url = new URL(params.path, `http://127.0.0.1:18791`);

  if (params.query) {
    Object.entries(params.query).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const options: RequestInit = {
    method: params.method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (params.body && params.method.toUpperCase() !== 'GET') {
    options.body = JSON.stringify(params.body);
  }

  const response = await fetch(url.toString(), options);

  const responseBody: any = await response.json();

  if (!response.ok) {
    throw new Error(responseBody.message || `HTTP ${response.status}`);
  }

  return responseBody;
}
