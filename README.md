# agent-context-panel

AI 编程助手会话的上下文面板 MVP：上下文窗口用量、请求词元构成、增长曲线与按轮次分组的原始消息。所有数据均为固定种子生成的测试数据。

技术栈：Bun · Vite · React · Tailwind CSS v4 · Lucide

界面默认英文，可在顶栏切换为简体中文，选择会保存在本地。文案集中在 `src/i18n/messages.ts`，中英字典结构由类型约束保持一致。

```bash
bun install
bun run dev      # 开发服务器
bun test         # 单元测试
bun run build    # 类型检查 + 生产构建
```
