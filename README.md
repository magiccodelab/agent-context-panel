# agent-context-panel

AI 编程助手会话的上下文面板 MVP：上下文窗口用量、请求词元构成、缓存命中、增长曲线与按轮次分组的原始消息。所有数据均为固定种子生成的测试数据。

支持导出两种格式：完整会话 JSON，以及仅保留用户与助手正文的 Markdown（适合交接给另一个模型）。

技术栈：Bun · Vite · React · Tailwind CSS v4 · Lucide

界面默认英文，可在顶栏切换为简体中文，选择会保存在本地。文案集中在 `src/i18n/messages.ts`，中英字典结构由类型约束保持一致。

```bash
bun install
bun run dev      # 开发服务器
bun test         # 单元测试
bun run build    # 类型检查 + 生产构建
```
<img width="2714" height="1710" alt="download" src="https://github.com/user-attachments/assets/8d3c5ee5-5bf6-4ddf-89cb-67405fb03ec6" />
<img width="2714" height="1710" alt="download" src="https://github.com/user-attachments/assets/1f018327-a85a-4526-88bf-3ef3787ab0f9" />
<img width="2714" height="1710" alt="download" src="https://github.com/user-attachments/assets/b106d51e-70e7-421d-b5ad-fae07411de62" />
<img width="2714" height="1710" alt="download" src="https://github.com/user-attachments/assets/1827c36c-04b3-4b56-a132-206fef3d6128" />
<img width="2714" height="1710" alt="download" src="https://github.com/user-attachments/assets/d491c082-3899-41f2-8027-901bd0fe83e8" />
