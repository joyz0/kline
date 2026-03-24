1. 设计：Figma (设计) + Design Tokens (规范)。
2. 生成：Pencil (AI) 初稿。
3. 数据：Claude 调用 Mockaroo / Faker (及其 CLI 版本) 注入真实感数据。
4. 验证：Claude 编写 (Playwright + Percy) 脚本 -> 运行测试 -> 发现视觉偏差 -> 自动修复 CSS -> 再次测试 (无人值守循环)。让 Claude 专注于生成单个组件的故事（Story），并在 Storybook 中即时预览。
5. 规范：Claude 运行 Linter 自我纠错 + 更新 ADR (Architecture Decision Records) 要求它必须生成一条 ADR 文件 (docs/adr/001-choice.md)。
6. 文档：Claude 根据最终代码自动生成 Mermaid 架构图或 PlantUML 时序图和 API 文档。
