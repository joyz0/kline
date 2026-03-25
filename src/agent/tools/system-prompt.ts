import { getToolDefinitions, initializeTools } from './langgraph-tools.js';

/**
 * 生成 System Prompt，包含工具列表和使用指南
 * 
 * 这个 System Prompt 会在 Agent 启动时生成，并作为 System Message 发送给 LLM，
 * 让 LLM 了解可用工具及其使用方法。
 */
export function generateSystemPrompt(): string {
  // 确保工具已初始化
  initializeTools();
  const tools = getToolDefinitions();
  
  return `
You have access to the following tools:

${tools.map(tool => `
### ${tool.name}
${tool.description}

Parameters:
${formatParameters(tool.parameters)}
`).join('\n')}

## Tool Selection Guidelines

### 1. Use web_fetch for:
- Static content
- Known URLs
- No login required
- Quick content extraction

### 2. Use browser for:
- Login required (e.g., Weibo, Twitter)
- Dynamic JavaScript content
- Need interaction (click/type)
- Need screenshots
- Complex UI automation

### 3. Browser workflow:
1. Start browser: action="start" (optional, auto-starts)
2. Open URL: action="open" with url parameter
3. Get snapshot: action="snapshot" with interactive=true
4. Interact: action="click"/"type" with refs from snapshot
5. Screenshot: action="screenshot" (optional, for verification)

## Best Practices

- Always check browser status before operations if unsure
- Use snapshot to get element refs before clicking/typing
- Keep the same tab for multi-step operations (pass targetId)
- Use refs="aria" for stable element references
- Close browser when done to save resources (optional, auto-cleanup)
- For logged-in user browser, use profile="user"

## Example Browser Workflow

User: "帮我发微博：今天天气真好！#好心情#"

Assistant's thought process:
1. Need to access Weibo (requires login)
2. Need interaction (input text, click button)
3. Choose browser tool
4. Steps:
   - browser(action="status") → check if running
   - browser(action="open", url="https://weibo.com")
   - browser(action="snapshot", interactive=true, refs="aria") → get refs
   - browser(action="type", ref="e1", text="今天天气真好！#好心情#")
   - browser(action="click", ref="e2") → click post button
   - browser(action="screenshot") → verify (optional)

## Error Handling

- If browser not started, it will auto-start
- If element not found, try snapshot again with interactive=true
- If timeout, increase timeoutMs parameter
- If ref invalid, get fresh snapshot

## Available Actions

### Lifecycle:
- start: Start browser with profile
- stop: Stop browser
- status: Check browser status

### Tabs:
- open: Open URL in new tab
- close: Close tab by targetId
- focus: Focus tab by targetId

### Page Operations:
- snapshot: Get page snapshot with refs
- screenshot: Take screenshot
- navigate: Navigate to URL

### Element Interaction:
- click: Click element by ref
- type: Type text into element by ref
- press: Press key
- scroll: Scroll page or element
- wait: Wait for element or text

### Advanced:
- evaluate: Execute JavaScript
`.trim();
}

/**
 * 格式化参数说明
 */
function formatParameters(parameters: Record<string, any>): string {
  const properties = parameters.properties || {};
  const required = parameters.required || [];
  
  const lines: string[] = [];
  
  for (const [key, value] of Object.entries(properties)) {
    const prop = value as any;
    const isRequired = required.includes(key);
    const type = prop.type || 'any';
    const description = prop.description || '';
    const enumValues = prop.enum ? ` (${prop.enum.join('|')})` : '';
    const defaultValue = prop.default !== undefined ? ` (default: ${prop.default})` : '';
    
    lines.push(`- ${key}${isRequired ? ' *' : ''}: ${type}${enumValues}${defaultValue} - ${description}`);
  }
  
  return lines.join('\n');
}

/**
 * 获取工具使用示例
 */
export function getToolExamples(): string {
  return `
## Tool Call Examples

### Web Fetch Example
\`\`\`json
{
  "name": "web_fetch",
  "arguments": {
    "url": "https://example.com/article",
    "selector": ".article-content"
  }
}
\`\`\`

### Browser - Open URL
\`\`\`json
{
  "name": "browser",
  "arguments": {
    "action": "open",
    "url": "https://weibo.com",
    "profile": "user"
  }
}
\`\`\`

### Browser - Get Snapshot
\`\`\`json
{
  "name": "browser",
  "arguments": {
    "action": "snapshot",
    "targetId": "tab-123",
    "interactive": true,
    "format": "ai"
  }
}
\`\`\`

### Browser - Click Element
\`\`\`json
{
  "name": "browser",
  "arguments": {
    "action": "click",
    "ref": "e1",
    "targetId": "tab-123"
  }
}
\`\`\`

### Browser - Type Text
\`\`\`json
{
  "name": "browser",
  "arguments": {
    "action": "type",
    "ref": "e2",
    "text": "Hello, World!",
    "targetId": "tab-123",
    "submit": true
  }
}
\`\`\`

### Browser - Screenshot
\`\`\`json
{
  "name": "browser",
  "arguments": {
    "action": "screenshot",
    "targetId": "tab-123",
    "fullPage": true
  }
}
\`\`\`
`.trim();
}

/**
 * 生成完整的 System Prompt（包含示例）
 */
export function generateFullSystemPrompt(): string {
  return `${generateSystemPrompt()}\n\n${getToolExamples()}`;
}
