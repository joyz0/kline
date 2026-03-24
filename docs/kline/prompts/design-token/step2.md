# 任务目标

基于生成的 `tokens.json`，配置自动化工具链，将 Design Tokens 转换为多端代码。

# 技术要求

1. **工具选择**：使用 `Style Dictionary` (行业标准) 或编写自定义 Node.js 脚本。
2. **输出目标**：
   - **Web**: 生成 `src/styles/variables.css` (CSS Custom Properties, 如 `--color-brand-primary`)。
   - **Tailwind**: 自动生成/更新 `tailwind.config.js` 中的 `theme.extend` 部分，映射 CSS 变量。
   - **React**: (可选) 生成一个 TypeScript 类型定义文件 `tokens.d.ts`，确保类型安全。
3. **暗色模式支持**：在 CSS 输出中自动包含 `@media (prefers-color-scheme: dark)` 的变量覆写逻辑。

# 执行动作

- 安装必要的依赖包。
- 创建配置文件 (如 `sd.config.js`)。
- 运行构建命令，验证生成的文件是否正确。
- 创建一个 npm script (`npm run build:tokens`) 方便后续更新。
