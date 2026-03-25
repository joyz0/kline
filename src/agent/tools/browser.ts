import { z } from 'zod';
import { logger } from '../../logging/index.js';
import type { AnyLangGraphTool } from './langgraph-tools.js';

/**
 * Browser 工具的参数 Schema
 */
const BrowserActionSchema = z.discriminatedUnion('action', [
  // 生命周期管理
  z.object({
    action: z.literal('start'),
    profile: z.string().optional(),
  }),
  z.object({
    action: z.literal('stop'),
    profile: z.string().optional(),
  }),
  z.object({
    action: z.literal('status'),
    profile: z.string().optional(),
  }),
  
  // 标签页操作
  z.object({
    action: z.literal('open'),
    url: z.string().url(),
    profile: z.string().optional(),
    targetId: z.string().optional(),
  }),
  z.object({
    action: z.literal('close'),
    targetId: z.string(),
    profile: z.string().optional(),
  }),
  z.object({
    action: z.literal('focus'),
    targetId: z.string(),
    profile: z.string().optional(),
  }),
  
  // 页面操作
  z.object({
    action: z.literal('snapshot'),
    profile: z.string().optional(),
    targetId: z.string().optional(),
    interactive: z.boolean().optional(),
    format: z.enum(['ai', 'aria']).optional(),
  }),
  z.object({
    action: z.literal('screenshot'),
    profile: z.string().optional(),
    targetId: z.string().optional(),
    fullPage: z.boolean().optional(),
    ref: z.string().optional(),
    type: z.enum(['png', 'jpeg']).optional(),
  }),
  z.object({
    action: z.literal('navigate'),
    url: z.string().url(),
    profile: z.string().optional(),
    targetId: z.string().optional(),
  }),
  
  // 元素交互
  z.object({
    action: z.literal('click'),
    ref: z.string(),
    profile: z.string().optional(),
    targetId: z.string().optional(),
    double: z.boolean().optional(),
    button: z.enum(['left', 'right', 'middle']).optional(),
  }),
  z.object({
    action: z.literal('type'),
    ref: z.string(),
    text: z.string(),
    profile: z.string().optional(),
    targetId: z.string().optional(),
    submit: z.boolean().optional(),
    slowly: z.boolean().optional(),
  }),
  z.object({
    action: z.literal('press'),
    key: z.string(),
    profile: z.string().optional(),
    targetId: z.string().optional(),
  }),
  z.object({
    action: z.literal('scroll'),
    ref: z.string().optional(),
    x: z.number().optional(),
    y: z.number().optional(),
    profile: z.string().optional(),
    targetId: z.string().optional(),
  }),
  
  // 等待操作
  z.object({
    action: z.literal('wait'),
    selector: z.string().optional(),
    text: z.string().optional(),
    timeout: z.number().optional(),
    profile: z.string().optional(),
    targetId: z.string().optional(),
  }),
  
  // JavaScript 执行
  z.object({
    action: z.literal('evaluate'),
    script: z.string(),
    profile: z.string().optional(),
    targetId: z.string().optional(),
  }),
]);



/**
 * 调用 Gateway 的 browser.request 接口
 */
async function callBrowserRequest(params: {
  method: string;
  path: string;
  query?: Record<string, string>;
  body?: Record<string, any>;
  timeoutMs?: number;
}): Promise<any> {
  const gatewayPort = process.env.GATEWAY_PORT || '18789';
  const gatewayUrl = `http://127.0.0.1:${gatewayPort}/gateway/browser/request`;

  logger.info({
    url: gatewayUrl,
    method: params.method,
    path: params.path,
  }, 'Calling Gateway browser.request');

  const response = await fetch(gatewayUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(params.timeoutMs || 30000),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gateway request failed: ${response.status} ${error}`);
  }

  const result = await response.json() as { success: boolean; error?: string; [key: string]: any };
  
  if (!result.success) {
    throw new Error(result.error || 'Unknown error');
  }

  return result;
}

/**
 * 创建 Browser 工具
 */
export function createBrowserTool(): AnyLangGraphTool | null {
  return {
    name: 'browser',
    description: 'Control the browser to interact with JavaScript-heavy websites or sites that require login. Supports opening pages, taking snapshots, screenshots, clicking, typing, and more.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description: '要执行的操作',
          enum: [
            'start', 'stop', 'status',
            'open', 'close', 'focus',
            'snapshot', 'screenshot', 'navigate',
            'click', 'type', 'press', 'scroll',
            'wait', 'evaluate',
          ],
        },
        url: {
          type: 'string',
          description: '要访问的 URL',
        },
        targetId: {
          type: 'string',
          description: '标签页 ID',
        },
        profile: {
          type: 'string',
          description: '浏览器配置文件名',
        },
        ref: {
          type: 'string',
          description: '元素引用 ID（从 snapshot 获取）',
        },
        text: {
          type: 'string',
          description: '要输入的文本',
        },
        selector: {
          type: 'string',
          description: 'CSS 选择器',
        },
        script: {
          type: 'string',
          description: '要执行的 JavaScript 代码',
        },
        interactive: {
          type: 'boolean',
          description: '是否包含交互式元素（用于 snapshot）',
        },
        format: {
          type: 'string',
          description: '快照格式（ai 或 aria）',
          enum: ['ai', 'aria'],
        },
        fullPage: {
          type: 'boolean',
          description: '是否截取整个页面',
        },
        double: {
          type: 'boolean',
          description: '是否双击',
        },
        submit: {
          type: 'boolean',
          description: '输入后是否提交（按 Enter）',
        },
        slowly: {
          type: 'boolean',
          description: '是否慢速输入（模拟人类）',
        },
        key: {
          type: 'string',
          description: '要按下的键',
        },
        timeout: {
          type: 'number',
          description: '超时时间（毫秒）',
        },
      },
      required: ['action'],
    },
    execute: async (args: Record<string, any>) => {
      // 验证参数
      const validated = BrowserActionSchema.parse(args);
      const { action } = validated;

      logger.info({ action, args }, 'Executing browser tool');

      try {
        switch (action) {
          // ========== 生命周期管理 ==========
          case 'start': {
            const result = await callBrowserRequest({
              method: 'POST',
              path: '/start',
              body: { profile: validated.profile },
            });
            return { success: true, message: 'Browser started', ...result };
          }

          case 'stop': {
            const result = await callBrowserRequest({
              method: 'POST',
              path: '/stop',
              body: { profile: validated.profile },
            });
            return { success: true, message: 'Browser stopped', ...result };
          }

          case 'status': {
            const result = await callBrowserRequest({
              method: 'GET',
              path: '/status',
              query: { profile: validated.profile || 'default' },
            });
            return result;
          }

          // ========== 标签页操作 ==========
          case 'open': {
            const result = await callBrowserRequest({
              method: 'POST',
              path: '/tabs/open',
              body: {
                url: validated.url,
                profile: validated.profile,
              },
            });
            return { success: true, ...result };
          }

          case 'close': {
            const result = await callBrowserRequest({
              method: 'DELETE',
              path: `/tabs/${validated.targetId}`,
              query: { profile: validated.profile || 'default' },
            });
            return { success: true, ...result };
          }

          case 'focus': {
            const result = await callBrowserRequest({
              method: 'POST',
              path: '/tabs/focus',
              body: {
                targetId: validated.targetId,
                profile: validated.profile,
              },
            });
            return { success: true, ...result };
          }

          // ========== 页面操作 ==========
          case 'snapshot': {
            const result = await callBrowserRequest({
              method: 'GET',
              path: '/snapshot',
              query: {
                profile: validated.profile || 'default',
                targetId: validated.targetId || '',
                format: validated.format || 'ai',
                interactive: validated.interactive?.toString() || 'true',
              },
            });
            return { success: true, ...result };
          }

          case 'screenshot': {
            const result = await callBrowserRequest({
              method: 'POST',
              path: '/screenshot',
              body: {
                profile: validated.profile,
                targetId: validated.targetId,
                fullPage: validated.fullPage,
                ref: validated.ref,
                type: validated.type || 'png',
              },
            });
            return { success: true, ...result };
          }

          case 'navigate': {
            const result = await callBrowserRequest({
              method: 'POST',
              path: '/navigate',
              body: {
                url: validated.url,
                profile: validated.profile,
                targetId: validated.targetId,
              },
            });
            return { success: true, ...result };
          }

          // ========== 元素交互 ==========
          case 'click': {
            const result = await callBrowserRequest({
              method: 'POST',
              path: '/click',
              body: {
                ref: validated.ref,
                profile: validated.profile,
                targetId: validated.targetId,
                double: validated.double,
                button: validated.button || 'left',
              },
            });
            return { success: true, ...result };
          }

          case 'type': {
            const result = await callBrowserRequest({
              method: 'POST',
              path: '/type',
              body: {
                ref: validated.ref,
                text: validated.text,
                profile: validated.profile,
                targetId: validated.targetId,
                submit: validated.submit,
                slowly: validated.slowly,
              },
            });
            return { success: true, ...result };
          }

          case 'press': {
            const result = await callBrowserRequest({
              method: 'POST',
              path: '/press',
              body: {
                key: validated.key,
                profile: validated.profile,
                targetId: validated.targetId,
              },
            });
            return { success: true, ...result };
          }

          case 'scroll': {
            const result = await callBrowserRequest({
              method: 'POST',
              path: '/scroll',
              body: {
                ref: validated.ref,
                x: validated.x,
                y: validated.y,
                profile: validated.profile,
                targetId: validated.targetId,
              },
            });
            return { success: true, ...result };
          }

          // ========== 等待操作 ==========
          case 'wait': {
            const result = await callBrowserRequest({
              method: 'POST',
              path: '/wait',
              body: {
                selector: validated.selector,
                text: validated.text,
                timeout: validated.timeout || 5000,
                profile: validated.profile,
                targetId: validated.targetId,
              },
            });
            return { success: true, ...result };
          }

          // ========== JavaScript 执行 ==========
          case 'evaluate': {
            const result = await callBrowserRequest({
              method: 'POST',
              path: '/evaluate',
              body: {
                script: validated.script,
                profile: validated.profile,
                targetId: validated.targetId,
              },
            });
            return { success: true, ...result };
          }

          default: {
            const unreachable: never = action;
            throw new Error(`Unknown browser action: ${unreachable}`);
          }
        }
      } catch (error) {
        logger.error({ action, error }, 'Browser tool execution failed');
        throw error;
      }
    },
  };
}
