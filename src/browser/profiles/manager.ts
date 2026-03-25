import { chromium, type Browser, type BrowserContext } from 'playwright';
import { browserLogger } from '../logger.js';
import type { BrowserProfile, RunningChrome } from '../types.js';
import { launchChrome, stopChrome } from '../chrome.js';
import {
  BrowserProfileUnavailableError,
  BrowserNotStartedError,
} from '../errors.js';
import { ProfileStorage, getDefaultProfileStorage } from './storage.js';

export class ProfileManager {
  private profiles: Map<string, BrowserProfile> = new Map();
  private browsers: Map<string, Browser> = new Map();
  private chromeProcesses: Map<string, RunningChrome> = new Map();
  private storage: ProfileStorage;

  constructor(profiles: BrowserProfile[], storage?: ProfileStorage) {
    this.storage = storage || getDefaultProfileStorage();
    
    for (const profile of profiles) {
      // 自动设置 userDataDir
      if (!profile.userDataDir) {
        profile.userDataDir = this.storage.getProfileDir(profile.name);
      }
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

    // 恢复 Cookies（如果有）
    const contexts = browser.contexts();
    if (contexts.length > 0) {
      await this.restoreCookies(profile.name, contexts[0]);
    }

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
      // 保存 Cookies
      try {
        await this.saveCookies(profileName, browser);
      } catch (error) {
        browserLogger.warn({ profile: profileName, error }, 'Failed to save cookies');
      }

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

  /**
   * 保存浏览器的 Cookies
   */
  private async saveCookies(profileName: string, browser: Browser): Promise<void> {
    const contexts = browser.contexts();
    
    if (contexts.length === 0) {
      return;
    }

    const allCookies: any[] = [];

    for (const context of contexts) {
      try {
        const cookies = await context.cookies();
        allCookies.push(...cookies);
      } catch (error) {
        browserLogger.warn({ profile: profileName, error }, 'Failed to get cookies from context');
      }
    }

    if (allCookies.length > 0) {
      await this.storage.saveCookies(profileName, allCookies);
      browserLogger.info({ profile: profileName, count: allCookies.length }, 'Cookies saved');
    }
  }

  /**
   * 加载并恢复 Cookies
   */
  private async restoreCookies(profileName: string, context: BrowserContext): Promise<void> {
    try {
      const cookies = await this.storage.loadCookies(profileName);
      
      if (cookies.length > 0) {
        await context.addCookies(cookies);
        browserLogger.info({ profile: profileName, count: cookies.length }, 'Cookies restored');
      }
    } catch (error) {
      browserLogger.warn({ profile: profileName, error }, 'Failed to restore cookies');
    }
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

// 导出 ProfileStorage 以便外部使用
export { ProfileStorage } from './storage.js';
