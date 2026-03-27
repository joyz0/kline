import { logger } from '../../logging/index.js';
import { createWebFetchTool } from './web-fetch.js';
import { createBrowserTool } from './browser.js';
import {
  createAkshareQuoteTool,
  createAkshareQuotesTool,
  createAkshareSearchTool,
  createAkshareHistoricalDataTool,
} from './akshare.js';

/**
 * 工具注册表
 * 
 * 所有可用的 LangGraph 工具都在这里注册
 */
const toolRegistry = new Map<string, AnyLangGraphTool>();

/**
 * 工具定义类型
 */
export interface AnyLangGraphTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (...args: any[]) => Promise<any>;
}

/**
 * 初始化所有工具
 */
export function initializeTools() {
  // 注册 Web Fetch 工具
  const webFetchTool = createWebFetchTool();
  if (webFetchTool) {
    toolRegistry.set(webFetchTool.name, webFetchTool);
    logger.info({ tool: webFetchTool.name }, 'Web fetch tool registered');
  }

  // 注册 Browser 工具
  const browserTool = createBrowserTool();
  if (browserTool) {
    toolRegistry.set(browserTool.name, browserTool);
    logger.info({ tool: browserTool.name }, 'Browser tool registered');
  }

  // 注册 Akshare 工具
  const akshareQuoteTool = createAkshareQuoteTool();
  if (akshareQuoteTool) {
    toolRegistry.set(akshareQuoteTool.name, akshareQuoteTool);
    logger.info({ tool: akshareQuoteTool.name }, 'Akshare quote tool registered');
  }

  const akshareQuotesTool = createAkshareQuotesTool();
  if (akshareQuotesTool) {
    toolRegistry.set(akshareQuotesTool.name, akshareQuotesTool);
    logger.info({ tool: akshareQuotesTool.name }, 'Akshare quotes tool registered');
  }

  const akshareSearchTool = createAkshareSearchTool();
  if (akshareSearchTool) {
    toolRegistry.set(akshareSearchTool.name, akshareSearchTool);
    logger.info({ tool: akshareSearchTool.name }, 'Akshare search tool registered');
  }

  const akshareHistoricalDataTool = createAkshareHistoricalDataTool();
  if (akshareHistoricalDataTool) {
    toolRegistry.set(akshareHistoricalDataTool.name, akshareHistoricalDataTool);
    logger.info({ tool: akshareHistoricalDataTool.name }, 'Akshare historical data tool registered');
  }

  logger.info({ count: toolRegistry.size }, 'Tools initialized');
}

/**
 * 调用 LangGraph 工具
 * 
 * @param toolName 工具名称
 * @param args 工具参数
 * @returns 工具执行结果
 */
export async function callLangGraphTool(
  toolName: string,
  args: Record<string, any>,
): Promise<any> {
  const tool = toolRegistry.get(toolName);

  if (!tool) {
    const availableTools = Array.from(toolRegistry.keys());
    throw new Error(
      `Tool "${toolName}" not found. Available tools: ${availableTools.join(', ')}`,
    );
  }

  logger.info({ tool: toolName, args }, 'Calling LangGraph tool');

  try {
    const result = await tool.execute(args);
    
    logger.info({ tool: toolName, success: true }, 'LangGraph tool call completed');
    
    return result;
  } catch (error) {
    logger.error({ tool: toolName, error: error instanceof Error ? error.message : error }, 'LangGraph tool call failed');
    throw error;
  }
}

/**
 * 获取所有已注册的工具列表
 */
export function getRegisteredTools(): AnyLangGraphTool[] {
  return Array.from(toolRegistry.values());
}

/**
 * 获取工具定义（用于 System Prompt）
 */
export function getToolDefinitions(): Array<{
  name: string;
  description: string;
  parameters: Record<string, any>;
}> {
  return Array.from(toolRegistry.values()).map(tool => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));
}
