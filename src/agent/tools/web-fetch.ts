import { chromium } from 'playwright';
import { logger } from '../../logging/index.js';
import type { AnyLangGraphTool } from './langgraph-tools.js';
import { z } from 'zod';

/**
 * Web Fetch 工具的参数 Schema
 */
const WebFetchSchema = z.object({
  url: z.string().url().describe('要抓取的网页 URL'),
  selector: z.string().optional().describe('CSS 选择器，用于提取特定内容'),
  timeoutMs: z.number().optional().default(30000).describe('超时时间（毫秒）'),
});

type WebFetchParams = z.infer<typeof WebFetchSchema>;

/**
 * HTML 转 Markdown 的简单实现
 */
function htmlToMarkdown(html: string): string {
  // 简单的 HTML 转 Markdown 转换
  return html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gis, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gis, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gis, '### $1\n\n')
    .replace(/<p[^>]*>(.*?)<\/p>/gis, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gis, '[$2]($1)')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gis, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gis, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gis, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gis, '*$1*')
    .replace(/<ul[^>]*>(.*?)<\/ul>/gis, (match, content) => {
      return content.replace(/<li[^>]*>(.*?)<\/li>/gis, '- $1\n');
    })
    .replace(/<ol[^>]*>(.*?)<\/ol>/gis, (match, content) => {
      let index = 1;
      return content.replace(/<li[^>]*>(.*?)<\/li>/gis, () => `${index++}. $1\n`);
    })
    .replace(/<code[^>]*>(.*?)<\/code>/gis, '`$1`')
    .replace(/<pre[^>]*>(.*?)<\/pre>/gis, '```\n$1\n```')
    .replace(/<[^>]+>/g, '') // 移除剩余 HTML 标签
    .replace(/\n\s*\n/g, '\n\n') // 合并多余空行
    .trim();
}

/**
 * 创建 Web Fetch 工具
 */
export function createWebFetchTool(): AnyLangGraphTool | null {
  return {
    name: 'web_fetch',
    description: 'Fetch a URL and extract readable content (HTML to markdown). Use this when you need to read the content of a webpage.',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: '要抓取的网页 URL',
        },
        selector: {
          type: 'string',
          description: 'CSS 选择器，用于提取特定内容（可选）',
        },
        timeoutMs: {
          type: 'number',
          description: '超时时间（毫秒），默认 30000',
          default: 30000,
        },
      },
      required: ['url'],
    },
    execute: async (args: Record<string, any>) => {
      // 验证参数
      const validated = WebFetchSchema.parse(args);
      const { url, selector, timeoutMs = 30000 } = validated;

      logger.info({ url, selector, timeoutMs }, 'Executing web_fetch tool');

      const browser = await chromium.launch({
        headless: true,
      });

      try {
        const context = await browser.newContext({
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          viewport: { width: 1920, height: 1080 },
        });

        const page = await context.newPage();

        // 导航到页面
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: timeoutMs,
        });

        // 等待页面加载
        await page.waitForTimeout(1000);

        let content: string;

        if (selector) {
          // 如果指定了选择器，只提取该元素的内容
          const element = await page.$(selector);
          
          if (!element) {
            throw new Error(`Selector "${selector}" not found on page`);
          }

          content = await element.innerHTML();
        } else {
          // 否则获取整个 body 的内容
          const body = await page.$('body');
          
          if (!body) {
            throw new Error('No body element found');
          }

          content = await body.innerHTML();
        }

        // 转换为 Markdown
        const markdown = htmlToMarkdown(content);

        const pageTitle = await page.title();

        logger.info({ url, title: pageTitle, contentLength: markdown.length }, 'Web fetch completed');

        return {
          success: true,
          url,
          title: pageTitle,
          content: markdown,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        logger.error({ url, error }, 'Web fetch failed');
        throw error;
      } finally {
        await browser.close();
      }
    },
  };
}
