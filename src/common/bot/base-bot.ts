import { Telegraf } from 'telegraf'
import { ConfigService } from '@nestjs/config'
import { BotRegistryService } from './bot-registry.service'
import { TelegramBot } from './bot.interface'
import { Agent } from '../agent/agent.interface'
import { AgentService } from '../agent/agent.service'

const MAX_MSG_LENGTH = 4000

export abstract class BaseBot implements TelegramBot {
  readonly name: string
  protected bot: Telegraf
  protected agent: Agent

  constructor(
    name: string,
    token: string,
    agent: Agent,
    protected configService: ConfigService,
    protected botRegistry: BotRegistryService,
    protected agentService: AgentService,
  ) {
    this.name = name
    this.agent = agent
    this.bot = new Telegraf(token, { handlerTimeout: 600000 })
    this.registerHandlers()
    this.bot.catch((err) => {
      console.error(`[${this.name}] unhandled error:`, err)
    })
    botRegistry.register(this)
  }

  async start() {
    const webhookUrl = this.configService.get<string>('WEBHOOK_URL')
    const webhookPath = this.configService.get<string>(
      `WEBHOOK_PATH_${this.name.toUpperCase().replace(/-/g, '_')}`,
      `/webhook/${this.name}`,
    )

    try {
      if (webhookUrl) {
        const fullUrl = `${webhookUrl.replace(/\/$/, '')}${webhookPath}`
        await this.bot.telegram.setWebhook(fullUrl)
        console.log(`[${this.name}] using webhook: ${fullUrl}`)
      }
      console.log(`[${this.name}] launching...`)
      this.bot.launch()
      console.log(`[${this.name}] started and polling.`)
    } catch (err) {
      console.error(`[${this.name}] start error:`, err)
    }
  }

  async stop() {
    await this.bot.stop()
  }

  protected abstract registerHandlers(): void

  protected async handleMessage(ctx: any) {
    const messageText = ctx.message?.text
    if (!messageText) return

    try {
      const response = await this.agentService.run(this.agent, {
        message: messageText,
        chatId: ctx.chat.id,
        userId: ctx.from?.id,
      })

      if (response.media) {
        if (response.media.type === 'photo') {
          await ctx.replyWithPhoto(
            response.media.url ?? { source: response.media.buffer! },
            { caption: response.text },
          )
        } else if (response.media.type === 'document') {
          await ctx.replyWithDocument(
            response.media.url ?? { source: response.media.buffer! },
            { caption: response.text, filename: response.media.filename },
          )
        }
      } else {
        for (const chunk of splitMessage(response.text)) {
          await replyWithMarkdown(ctx, chunk)
        }
      }
    } catch (err) {
      console.error(`[${this.name}] error handling message:`, err)
      await ctx.reply('Sorry, an error occurred while processing your request.').catch(() => {})
    }
  }
}

async function replyWithMarkdown(ctx: any, text: string) {
  try {
    await ctx.reply(text, { parse_mode: 'Markdown' })
  } catch {
    await ctx.reply(text).catch(() => {})
  }
}

function splitMessage(text: string): string[] {
  if (text.length <= MAX_MSG_LENGTH) return [text]

  const chunks: string[] = []
  let remaining = text

  while (remaining.length > 0) {
    if (remaining.length <= MAX_MSG_LENGTH) {
      chunks.push(remaining)
      break
    }

    let splitAt = remaining.lastIndexOf('\n', MAX_MSG_LENGTH)
    if (splitAt <= 0) splitAt = remaining.lastIndexOf('.', MAX_MSG_LENGTH)
    if (splitAt <= 0) splitAt = remaining.lastIndexOf(' ', MAX_MSG_LENGTH)
    if (splitAt <= 0) splitAt = MAX_MSG_LENGTH

    chunks.push(remaining.slice(0, splitAt))
    remaining = remaining.slice(splitAt).trim()
  }

  return chunks
}
