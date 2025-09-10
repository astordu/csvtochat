<a href="https://csvtochat.com/">
<img alt="CSV2Chat" src="./public/og.jpg">
</a>

## 🚀 雷哥AI 优化版本

> **雷哥AI (http://leigeai.com) 备注**

### ⚡ 简化配置
- **原版问题**: 需要配置多个API密钥（云存储、云Redis等）
- **优化后**: 只需配置一个 `TOGETHER_AI_API_KEY`，大大简化了部署流程

### 🎯 优势
- ✅ **配置简单**: 一个密钥即可运行
- ✅ **测试友好**: 方便开发者快速体验
- ✅ **功能完整**: 保留所有核心功能

<div align="center">
    <h1>CSV2Chat</h1>
    <p>
        Chat with your CSV files using AI. Upload a CSV, ask questions, and get instant, code-backed answers and visualizations.
    </p>
</div>

## Tech Stack

- **Frontend**: Next.js, Typescript, Tailwind CSS, Shadcn UI
- **Together AI LLM**: Generates Python code to answer questions and visualize data
- [**Together Code Interpreter**: Executes Python code and returns results](https://www.together.ai/code-interpreter)

## How it works

1. User uploads a CSV file
2. The app analyzes the CSV headers and suggests insightful questions
3. User asks a question about the data
4. Together.ai generates Python code to answer the question, runs it, and returns results (including charts) using Together Code Interpreter
5. All chats and results are stored in Upstash Redis for fast retrieval

## Cloning & running

1. Fork or clone the repo
2. Create accounts at [Together.ai](https://together.ai/) and [Upstash](https://upstash.com/) for LLM and Redis
3. Create a `.env` file and add your API keys:
   - `TOGETHER_API_KEY`
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. Run `pnpm install` and `pnpm run dev` to install dependencies and start the app locally

Open [http://localhost:3000](http://localhost:3000) to use CSV2Chat.
