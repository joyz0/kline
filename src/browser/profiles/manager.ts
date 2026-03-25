import { chromium, type Browser } from 'playwright';
import { browserLogger } from '../logger.js';
import type { BrowserProfile, RunningChrome } from '../types.js';
import { launchChrome, stopChrome } from '../chrome.js';
import {
  BrowserProfileUnavailableError,
  BrowserNotStartedError,
} from '../errors.js';

export class ProfileManager {
  private profiles: Map<string, BrowserProfile> = new Map();
  private browsers: Map<string, Browser> = new Map();
  private chromeProcesses: Map<string, RunningChrome> = new Map();

  constructor(profiles: BrowserProfile[]) {
    for (const profile of profiles) {
      this.profiles.set(profile.name, profile);
    }
  }

  getProfile(name: string): BrowserProfile | undefined {
    return this.profiles.get(name);
  }

  getAllProfiles(): BrowserProfile[] {
    return Array.from(this.profiles.values());
  }

  async getBrowser(profileName: string): Promise<Browser | undefined> {
    return this.browsers.get(profileName);
  }

  async ensureBrowser(profile: BrowserProfile): Promise<Browser> {
    const existingBrowser = this.browsers.get(profile.name);

    if (existingBrowser) {
      return existingBrowser;
    }

    if (profile.cdpUrl) {
      return await this.connectToRemoteCDP(profile);
    } else if (profile.cdpPort) {
      return await this.launchLocalChrome(profile);
    } else {
      throw new BrowserProfileUnavailableError(profile.name);
    }
  }

  private async connectToRemoteCDP(profile: BrowserProfile): Promise<Browser> {
    if (!profile.cdpUrl) {
      throw new Error('CDP URL is required for remote connection');
    }

    browserLogger.info(
      { profile: profile.name, cdpUrl: profile.cdpUrl, subsystem: 'browser' },
      'Connecting to remote CDP',
    );

    const browser = await chromium.connectOverCDP(profile.cdpUrl);

    this.browsers.set(profile.name, browser);

    browser.on('disconnected', () => {
      browserLogger.info(
        { profile: profile.name, subsystem: 'browser' },
        'Remote browser disconnected',
      );
      this.browsers.delete(profile.name);
    });

    return browser;
  }

  private async launchLocalChrome(profile: BrowserProfile): Promise<Browser> {
    browserLogger.info(
      { profile: profile.name, cdpPort: profile.cdpPort, subsystem: 'browser' },
      'Launching local Chrome',
    );

    if (!profile.cdpPort || !profile.userDataDir) {
      throw new Error(
        'CDP port and user data dir are required for local Chrome',
      );
    }

    const chromeProcess = await launchChrome({
      cdpPort: profile.cdpPort,
      userDataDir: profile.userDataDir,
      executablePath: profile.executablePath,
      headless: profile.headless,
      extraArgs: profile.extraArgs,
    });

    this.chromeProcesses.set(profile.name, chromeProcess);

    const browser = await chromium.connectOverCDP(
      `http://127.0.0.1:${profile.cdpPort}`,
    );

    this.browsers.set(profile.name, browser);

    browser.on('disconnected', () => {
      browserLogger.info(
        { profile: profile.name, subsystem: 'browser' },
        'Local browser disconnected',
      );
      this.browsers.delete(profile.name);
    });

    return browser;
  }

  async stopBrowser(profileName: string): Promise<void> {
    const browser = this.browsers.get(profileName);
    const chromeProcess = this.chromeProcesses.get(profileName);

    if (browser) {
      await browser.close();
      this.browsers.delete(profileName);
    }

    if (chromeProcess) {
      await stopChrome(chromeProcess);
      this.chromeProcesses.delete(profileName);
    }

    browserLogger.info(
      { profile: profileName, subsystem: 'browser' },
      'Browser stopped',
    );
  }

  async stopAll(): Promise<void> {
    const promises = Array.from(this.browsers.keys()).map((profileName) =>
      this.stopBrowser(profileName),
    );

    await Promise.all(promises);
  }

  getRunningBrowsers(): string[] {
    return Array.from(this.browsers.keys());
  }

  isBrowserRunning(profileName: string): boolean {
    return this.browsers.has(profileName);
  }
}

export class ProfileContext {
  constructor(
    private profile: BrowserProfile,
    private manager: ProfileManager,
  ) {}

  async ensureBrowserAvailable(): Promise<Browser> {
    const browser = await this.manager.getBrowser(this.profile.name);

    if (!browser) {
      throw new BrowserNotStartedError(this.profile.name);
    }

    return browser;
  }

  async getBrowser(): Promise<Browser> {
    return this.manager.ensureBrowser(this.profile);
  }

  getProfile(): BrowserProfile {
    return this.profile;
  }
}
