import fs from 'fs';
import path from 'path';
import { logger } from '../../logging/index.js';

/**
 * Profile Storage 管理类
 * 
 * 负责浏览器配置文件的持久化存储，包括：
 * - 用户数据目录管理
 * - Cookies 保存和加载
 * - LocalStorage 持久化
 * - 配置文件清理
 */
export class ProfileStorage {
  private baseDir: string;

  /**
   * @param baseDir 基础目录，默认为 ~/.kline/browser
   */
  constructor(baseDir?: string) {
    // 如果没有提供 baseDir，使用默认路径
    this.baseDir = baseDir || path.join(process.env.HOME || process.cwd(), '.kline', 'browser');
    this.ensureBaseDir();
  }

  /**
   * 确保基础目录存在
   */
  private ensureBaseDir(): void {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
      logger.info({ dir: this.baseDir }, 'Created profile base directory');
    }
  }

  /**
   * 获取配置文件的用户数据目录
   * @param profileName 配置文件名称
   * @returns 用户数据目录路径
   */
  getProfileDir(profileName: string): string {
    const profileDir = path.join(this.baseDir, profileName, 'user-data');
    
    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true });
      logger.info({ profile: profileName, dir: profileDir }, 'Created profile directory');
    }
    
    return profileDir;
  }

  /**
   * 获取配置文件的 Cookies 文件路径
   * @param profileName 配置文件名称
   * @returns Cookies 文件路径
   */
  getCookiesPath(profileName: string): string {
    const profileDir = path.join(this.baseDir, profileName);
    return path.join(profileDir, 'cookies.json');
  }

  /**
   * 保存 Cookies
   * @param profileName 配置文件名称
   * @param cookies Cookies 数组
   */
  async saveCookies(profileName: string, cookies: any[]): Promise<void> {
    const filePath = this.getCookiesPath(profileName);
    const profileDir = path.dirname(filePath);
    
    // 确保目录存在
    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true });
    }
    
    // 序列化并保存 Cookies
    const serializedCookies = cookies.map(cookie => ({
      ...cookie,
      // 处理 Date 对象
      creation: cookie.creation instanceof Date ? cookie.creation.toISOString() : cookie.creation,
      lastAccessed: cookie.lastAccessed instanceof Date ? cookie.lastAccessed.toISOString() : cookie.lastAccessed,
    }));
    
    fs.writeFileSync(filePath, JSON.stringify(serializedCookies, null, 2));
    logger.debug({ profile: profileName, count: cookies.length }, 'Saved cookies');
  }

  /**
   * 加载 Cookies
   * @param profileName 配置文件名称
   * @returns Cookies 数组
   */
  async loadCookies(profileName: string): Promise<any[]> {
    const filePath = this.getCookiesPath(profileName);
    
    if (!fs.existsSync(filePath)) {
      logger.debug({ profile: profileName }, 'No cookies file found');
      return [];
    }
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const cookies = JSON.parse(content);
      
      // 反序列化 Cookies
      const restoredCookies = cookies.map(cookie => ({
        ...cookie,
        // 恢复 Date 对象
        creation: cookie.creation ? new Date(cookie.creation) : new Date(),
        lastAccessed: cookie.lastAccessed ? new Date(cookie.lastAccessed) : new Date(),
      }));
      
      logger.debug({ profile: profileName, count: restoredCookies.length }, 'Loaded cookies');
      return restoredCookies;
    } catch (error) {
      logger.warn({ profile: profileName, error }, 'Failed to load cookies');
      return [];
    }
  }

  /**
   * 保存 LocalStorage
   * @param profileName 配置文件名称
   * @param origin 来源 URL
   * @param data LocalStorage 数据
   */
  async saveLocalStorage(profileName: string, origin: string, data: Record<string, string>): Promise<void> {
    const filePath = path.join(this.baseDir, profileName, 'localstorage', `${Buffer.from(origin).toString('base64')}.json`);
    const dir = path.dirname(filePath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    logger.debug({ profile: profileName, origin, keys: Object.keys(data).length }, 'Saved local storage');
  }

  /**
   * 加载 LocalStorage
   * @param profileName 配置文件名称
   * @param origin 来源 URL
   * @returns LocalStorage 数据
   */
  async loadLocalStorage(profileName: string, origin: string): Promise<Record<string, string>> {
    const filePath = path.join(this.baseDir, profileName, 'localstorage', `${Buffer.from(origin).toString('base64')}.json`);
    
    if (!fs.existsSync(filePath)) {
      return {};
    }
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);
      logger.debug({ profile: profileName, origin, keys: Object.keys(data).length }, 'Loaded local storage');
      return data;
    } catch (error) {
      logger.warn({ profile: profileName, origin, error }, 'Failed to load local storage');
      return {};
    }
  }

  /**
   * 清除配置文件的所有数据
   * @param profileName 配置文件名称
   */
  async clearProfile(profileName: string): Promise<void> {
    const profileDir = path.join(this.baseDir, profileName);
    
    if (fs.existsSync(profileDir)) {
      fs.rmSync(profileDir, { recursive: true, force: true });
      logger.info({ profile: profileName }, 'Cleared profile data');
    }
  }

  /**
   * 列出所有配置文件
   * @returns 配置文件名称列表
   */
  listProfiles(): string[] {
    if (!fs.existsSync(this.baseDir)) {
      return [];
    }
    
    const entries = fs.readdirSync(this.baseDir, { withFileTypes: true });
    return entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);
  }

  /**
   * 获取配置文件信息
   * @param profileName 配置文件名称
   * @returns 配置文件信息
   */
  getProfileInfo(profileName: string): {
    name: string;
    exists: boolean;
    hasCookies: boolean;
    cookieCount?: number;
    userDataDir?: string;
  } {
    const profileDir = path.join(this.baseDir, profileName);
    const exists = fs.existsSync(profileDir);
    const cookiesPath = this.getCookiesPath(profileName);
    const hasCookies = fs.existsSync(cookiesPath);
    
    let cookieCount: number | undefined;
    if (hasCookies) {
      try {
        const content = fs.readFileSync(cookiesPath, 'utf-8');
        const cookies = JSON.parse(content);
        cookieCount = Array.isArray(cookies) ? cookies.length : 0;
      } catch {
        cookieCount = 0;
      }
    }
    
    return {
      name: profileName,
      exists,
      hasCookies,
      cookieCount,
      userDataDir: exists ? this.getProfileDir(profileName) : undefined,
    };
  }

  /**
   * 获取基础目录路径
   */
  getBaseDir(): string {
    return this.baseDir;
  }
}

// 单例实例
let instance: ProfileStorage | null = null;

/**
 * 获取默认的 ProfileStorage 实例
 */
export function getDefaultProfileStorage(): ProfileStorage {
  if (!instance) {
    instance = new ProfileStorage();
  }
  return instance;
}
