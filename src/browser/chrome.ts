import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import path from "path";
import { browserLogger } from "./logger.js";
import type { RunningChrome } from "./types.js";
import { waitForCDPReady } from "./cdp-helpers.js";

export function findChromeExecutable(): string {
  const platform = process.platform;

  const candidates: Record<string, string[]> = {
    darwin: [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    ],
    linux: [
      "google-chrome",
      "google-chrome-stable",
      "chromium-browser",
      "chromium",
    ],
    win32: [
      "chrome.exe",
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    ],
  };

  const platformCandidates = candidates[platform] || [];

  for (const exe of platformCandidates) {
    if (path.isAbsolute(exe)) {
      const fs = require("fs");

      if (fs.existsSync(exe)) {
        return exe;
      }
    } else {
      const whichSync = require("which").sync as (
        cmd: string,
      ) => string | null;

      try {
        const resolved = whichSync(exe);

        if (resolved) {
          return resolved;
        }
      } catch {
        // Ignore and try next candidate
      }
    }
  }

  throw new Error(
    "Chrome executable not found. Please install Chrome or specify executable path.",
  );
}

export async function launchChrome(options: {
  cdpPort: number;
  userDataDir: string;
  executablePath?: string;
  headless?: boolean;
  extraArgs?: string[];
}): Promise<RunningChrome> {
  const executable = options.executablePath || findChromeExecutable();

  const args = [
    `--remote-debugging-port=${options.cdpPort}`,
    `--user-data-dir=${options.userDataDir}`,
    "--no-first-run",
    "--no-default-browser-check",
  ];

  if (options.headless) {
    args.push("--headless=new");
  }

  if (options.extraArgs) {
    args.push(...options.extraArgs);
  }

  browserLogger.info(
    {
      executable,
      cdpPort: options.cdpPort,
      userDataDir: options.userDataDir,
      headless: options.headless,
    },
    "Launching Chrome",
  );

  const proc = spawn(executable, args, {
    stdio: ["ignore", "pipe", "pipe"],
    detached: false,
  });

  proc.stdout.on("data", (data) => {
    browserLogger.debug({ stdout: data.toString() }, "Chrome stdout");
  });

  proc.stderr.on("data", (data) => {
    browserLogger.warn({ stderr: data.toString() }, "Chrome stderr");
  });

  proc.on("exit", (code, signal) => {
    browserLogger.info(
      { pid: proc.pid, code, signal },
      "Chrome process exited",
    );
  });

  try {
    await waitForCDPReady(options.cdpPort, 15000);

    browserLogger.info(
      { pid: proc.pid, cdpPort: options.cdpPort },
      "Chrome is ready",
    );
  } catch (error) {
    browserLogger.error(
      { error, cdpPort: options.cdpPort },
      "Chrome failed to start",
    );

    proc.kill();
    throw error;
  }

  return {
    pid: proc.pid!,
    exe: executable,
    userDataDir: options.userDataDir,
    cdpPort: options.cdpPort,
    startedAt: Date.now(),
    proc: proc as ChildProcessWithoutNullStreams,
  };
}

export async function stopChrome(
  chrome: RunningChrome,
): Promise<void> {
  browserLogger.info({ pid: chrome.pid }, "Stopping Chrome");

  return new Promise((resolve) => {
    if (chrome.proc) {
      chrome.proc.on("exit", () => {
        resolve();
      });

      chrome.proc.kill("SIGTERM");

      setTimeout(() => {
        if (chrome.proc && !chrome.proc.killed) {
          chrome.proc.kill("SIGKILL");
        }

        resolve();
      }, 5000);
    } else {
      resolve();
    }
  });
}

export function isChromeRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
