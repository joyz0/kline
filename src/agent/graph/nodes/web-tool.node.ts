import { callLangGraphTool } from '../../tools/langgraph-tools.js';
import { logger } from '../../../logging/index.js';
import type { AnalysisState } from '../state.js';

/**
 * Web Tool Node
 *
 * 在 LangGraph 中调用 Web 工具的 Node
 *
 * 这个 Node 会：
 * 1. 从 state 中获取工具调用请求
 * 2. 调用相应的工具
 * 3. 将结果返回到 state
 */
export async function webToolNode(
  state: AnalysisState,
): Promise<Partial<AnalysisState>> {
  const { toolCalls } = state;

  if (!toolCalls || toolCalls.length === 0) {
    logger.warn({ taskId: state.taskId }, 'No tool calls to process');
    return { toolResults: [] };
  }

  const toolResults: any[] = [];

  for (const toolCall of toolCalls) {
    try {
      logger.info(
        { tool: toolCall.name, args: toolCall.args },
        'Processing tool call',
      );

      // 调用工具
      const result = await callLangGraphTool(toolCall.name, toolCall.args);

      toolResults.push({
        toolCallId: toolCall.toolCallId,
        toolName: toolCall.name,
        success: true,
        result,
      });

      logger.info(
        { tool: toolCall.name, success: true },
        'Tool call completed',
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      toolResults.push({
        toolCallId: toolCall.toolCallId,
        toolName: toolCall.name,
        success: false,
        error: errorMessage,
      });

      logger.error(
        { tool: toolCall.name, error: errorMessage },
        'Tool call failed',
      );
    }
  }

  return {
    toolResults,
    // 清除已处理的 toolCalls
    toolCalls: [],
  };
}

/**
 * 创建工具调用请求的辅助函数
 */
export function createToolCall<T extends Record<string, any>>(opts: {
  name: string;
  args: T;
  toolCallId?: string;
}) {
  return {
    toolCallId:
      opts.toolCallId ||
      `tool_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: opts.name,
    args: opts.args,
  };
}

/**
 * 示例：使用 Web Fetch 工具
 */
export function createWebFetchCall(
  url: string,
  options?: {
    selector?: string;
    timeoutMs?: number;
  },
) {
  return createToolCall({
    name: 'web_fetch',
    args: {
      url,
      ...options,
    },
  });
}

/**
 * 示例：使用 Browser 工具打开网页
 */
export function createBrowserOpenCall(url: string, profile?: string) {
  return createToolCall({
    name: 'browser',
    args: {
      action: 'open',
      url,
      profile,
    },
  });
}

/**
 * 示例：使用 Browser 工具获取快照
 */
export function createBrowserSnapshotCall(options?: {
  profile?: string;
  targetId?: string;
  interactive?: boolean;
  format?: 'ai' | 'aria';
}) {
  return createToolCall({
    name: 'browser',
    args: {
      action: 'snapshot',
      ...options,
    },
  });
}

/**
 * 示例：使用 Browser 工具点击元素
 */
export function createBrowserClickCall(
  ref: string,
  options?: {
    profile?: string;
    targetId?: string;
    double?: boolean;
  },
) {
  return createToolCall({
    name: 'browser',
    args: {
      action: 'click',
      ref,
      ...options,
    },
  });
}

/**
 * 示例：使用 Browser 工具输入文本
 */
export function createBrowserTypeCall(
  ref: string,
  text: string,
  options?: {
    profile?: string;
    targetId?: string;
    submit?: boolean;
  },
) {
  return createToolCall({
    name: 'browser',
    args: {
      action: 'type',
      ref,
      text,
      ...options,
    },
  });
}
