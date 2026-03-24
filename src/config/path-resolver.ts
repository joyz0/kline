import path from 'path';

/**
 * 路径解析器
 * 
 * 用于将配置文件中的相对路径转换为绝对路径
 * Base 路径默认为项目的 .kline 目录
 */

export interface PathResolverOptions {
  /** Base 路径，默认为 .kline 目录 */
  baseDir?: string;
}

export class PathResolver {
  private baseDir: string;

  constructor(options: PathResolverOptions = {}) {
    this.baseDir = options.baseDir ?? path.join(process.cwd(), '.kline');
  }

  /**
   * 解析路径
   * - 如果是绝对路径，直接返回
   * - 如果是相对路径，相对于 baseDir 解析
   * - 如果是空字符串，返回空字符串
   */
  resolve(filePath: string): string {
    if (!filePath || filePath.trim() === '') {
      return filePath;
    }

    if (path.isAbsolute(filePath)) {
      return filePath;
    }

    return path.resolve(this.baseDir, filePath);
  }

  /**
   * 获取 base 目录
   */
  getBaseDir(): string {
    return this.baseDir;
  }

  /**
   * 静态方法：快速解析路径
   */
  static resolve(filePath: string, baseDir?: string): string {
    const resolver = new PathResolver({ baseDir });
    return resolver.resolve(filePath);
  }
}
