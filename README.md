# OpenClaw Server

Multi-bot Telegram server powered by AI agents. Built with NestJS, Telegraf, and OpenAI-compatible APIs.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                 NestJS Application                   │
│                                                      │
│  ┌─────────────────────────────────────────────────┐│
│  │                AppModule                        ││
│  │  ┌──────────┐  ┌────────────────┐              ││
│  │  │ Config   │  │ BotRegistry    │              ││
│  │  │ Module   │  │ Service        │              ││
│  │  └──────────┘  └───────┬────────┘              ││
│  │                        │                        ││
│  │  ┌─────────────────────┴──────────────────────┐││
│  │  │  BaseBot (abstract)                        │││
│  │  │  - Telegraf instance per bot               │││
│  │  │  - registerHandlers()                      │││
│  │  │  - handleMessage() → AgentService          │││
│  │  │  - splitMessage() for long responses       │││
│  │  └──────┬─────────────────────────────────────┘││
│  │         │ extends                               ││
│  │  ┌──────┼──────────┬──────────────────┐        ││
│  │  ▼      ▼          ▼                  ▼        ││
│  │  Android  Swing   Geo-Politics     (future)    ││
│  │  App Bot  Trading  Bot                          ││
│  │           Bot                                   ││
│  │                                                 ││
│  │  ┌────────────────────────────────────────┐    ││
│  │  │  AgentService                          │    ││
│  │  │  - run(agent, request) → AI completion │    ││
│  │  │  - Uses agent.systemPrompt as context  │    ││
│  │  └──────────┬─────────────────────────────┘    ││
│  │             │ uses                              ││
│  │  ┌──────────┴──────────────┐                   ││
│  │  │  Agent (interface)      │                   ││
│  │  │  - systemPrompt: string │                   ││
│  │  │  - handle(request)      │                   ││
│  │  └─────────────────────────┘                   ││
│  │                                                 ││
│  │  ┌────────────────────────────────────────┐    ││
│  │  │  FileServerService                     │    ││
│  │  │  - upload(file) → external file server │    ││
│  │  └────────────────────────────────────────┘    ││
│  └─────────────────────────────────────────────────┘│
│                                                      │
│  ┌─────────────────────────────────────────────────┐│
│  │  WebhookController                              ││
│  │  POST /webhook/:name                            ││
│  │  → bot.handleUpdate(req.body)                   ││
│  └─────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

## Data Flow (Polling Mode)

```
User → Telegram → Telegraf (bot instance)
  → bot handler (handleAndroidBuild or handleMessage)
    → AgentService.run(agent, request)
      → OpenAI chat completion (system prompt + user message)
    → Process response
      → Android: extract code → FileServerService → APK download URL
      → Others: split into chunks → send as Markdown
  → Reply sent to user via Telegram
```

## Bots

### 1. Android App Builder
- **Token ENV:** `ANDROID_APP_BOT_TOKEN`
- **Purpose:** Generates Android apps from natural language descriptions. Produces Kotlin/Jetpack Compose code, sends to build server, returns APK download link.
- **Handler:** Custom `handleAndroidBuild()` — overrides BaseBot's generic handler.
- **Flow:** Request → AI generates Kotlin code → parse/extract code → POST to file server `/build-android` → return APK URL.

### 2. Swing Trading
- **Token ENV:** `SWING_TRADING_BOT_TOKEN`
- **Purpose:** Stock suggestions, technical analysis, market insights (RSI, MACD, moving averages, candlestick patterns).
- **Handler:** Inherited `handleMessage()` from BaseBot.
- **Flow:** Request → `AgentService.run(SwingTradingAgent)` → AI response → split into 4000-char chunks → send as Markdown.

### 3. Geo-Politics
- **Token ENV:** `GEO_POLITICS_BOT_TOKEN`
- **Purpose:** Geopolitical analysis on international relations, conflicts, strategic affairs (US-China-Russia dynamics, regional conflicts, energy geopolitics).
- **Handler:** Inherited `handleMessage()` from BaseBot.
- **Flow:** Same as Swing Trading — `AgentService.run(GeoPoliticsAgent)` → AI response.

## Project Structure

```
src/
├── main.ts                     # Entry point
├── app.module.ts               # Root NestJS module
├── config/
│   └── bots.config.ts          # Static bot metadata config
├── common/
│   ├── agent/
│   │   ├── agent.interface.ts  # AgentRequest, AgentResponse, Agent interface
│   │   └── agent.service.ts    # OpenAI-compatible chat completion runner
│   ├── bot/
│   │   ├── bot.interface.ts    # TelegramBot interface (start/stop)
│   │   ├── base-bot.ts         # Abstract base bot with Telegraf + message handling
│   │   ├── bot-registry.service.ts  # Lifecycle manager (startAll/stopAll)
│   │   └── webhook.controller.ts    # Express controller for webhook POSTs
│   └── fileserver/
│       └── fileserver.service.ts    # Upload files to external build server
└── bots/
    ├── android-app/            # Android App Builder bot
    ├── swing-trading/          # Swing Trading bot
    └── geo-politics/           # Geo-Politics bot
```

Key concepts:
- Each bot module includes a NestJS module, bot implementation (extends `BaseBot`), and an agent (implements `Agent` interface with a `systemPrompt`).
- `BaseBot` provides shared infrastructure: Telegraf setup, message splitting, Markdown sending.
- `AgentService` is the AI runner — it takes an agent's system prompt and user message, calls the OpenAI-compatible API, and returns the response.
- `BotRegistryService` manages lifecycle — starts all bots on app bootstrap, stops them on shutdown.
- `WebhookController` handles optional webhook mode when `WEBHOOK_URL` is set.

## Setup

```bash
npm install
cp .env.example .env
# Edit .env with your bot tokens and AI API key
npm run start:dev   # Development with hot-reload
```

### Environment Variables

| Variable | Description |
|---|---|
| `ANDROID_APP_BOT_TOKEN` | Telegram bot token for Android App Builder |
| `SWING_TRADING_BOT_TOKEN` | Telegram bot token for Swing Trading |
| `GEO_POLITICS_BOT_TOKEN` | Telegram bot token for Geo-Politics |
| `AI_API_KEY` | OpenAI-compatible API key |
| `AI_BASE_URL` | API base URL (default: `https://opencode.ai/zen/v1`) |
| `AI_MODEL` | Model name (default: `deepseek-v4-flash-free`) |
| `FILESERVER_URL` | External file server URL for APK builds/uploads |
| `WEBHOOK_URL` | Optional: set to enable webhook mode instead of polling |
| `PORT` | HTTP server port (default: `3000`) |

### Scripts

| Script | Description |
|---|---|
| `npm run start:dev` | Development with watch mode |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run compiled production build |
| `npm run lint` | Lint source code |

## Deployment

### Prerequisites

A Linux server (Ubuntu 24.04+) with root SSH access.

### Config

Copy the deploy config template and fill in your server credentials:

```bash
cp deploy.config.example.json deploy.config.json
# Edit deploy.config.json with your server details
```

`deploy.config.json` is gitignored and **must never be committed**.

### Deploy

```bash
# 1. Build the project
npm run build

# 2. Run deploy script
# (or manually:)
rsync -avz --delete dist/ package.json package-lock.json .env root@your-server:/opt/openclaw-server/

# 3. SSH into the server and install deps + restart
ssh root@your-server
cd /opt/openclaw-server
npm install --production
systemctl restart openclaw-server
```

The app is managed as a systemd service (`openclaw-server`) on the server:

| Command | Description |
|---|---|
| `systemctl status openclaw-server` | Check service status |
| `journalctl -u openclaw-server -f` | Tail live logs |
| `systemctl restart openclaw-server` | Restart the service |

### Architecture Notes

- Polling mode is used (Telegram webhooks require HTTPS, which isn't available on the current server).
- The server runs on port 3000 alongside the file server on port 80.
- A systemd unit with `Restart=always` keeps the process alive.

## Adding a New Bot

1. Create `src/bots/<name>/` directory with module, bot, and agent files.
2. Extend `BaseBot` and implement the `Agent` interface.
3. Import the module into `AppModule`.
4. Add the bot token environment variable to `.env` and `.env.example`.
5. Optionally add the token env var name to `bots.config.ts`.
