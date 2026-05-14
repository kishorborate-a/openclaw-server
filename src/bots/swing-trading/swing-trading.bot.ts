import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { BaseBot } from '../../common/bot/base-bot'
import { BotRegistryService } from '../../common/bot/bot-registry.service'
import { AgentService } from '../../common/agent/agent.service'
import { MarketDataService } from '../../common/market-data/market-data.service'
import { SwingTradingAgent } from './swing-trading.agent'

@Injectable()
export class SwingTradingBot extends BaseBot {
  constructor(
    configService: ConfigService,
    botRegistry: BotRegistryService,
    agentService: AgentService,
    private marketData: MarketDataService,
  ) {
    const token = configService.getOrThrow<string>('SWING_TRADING_BOT_TOKEN')
    super(
      'swing-trading',
      token,
      new SwingTradingAgent(),
      configService,
      botRegistry,
      agentService,
    )
  }

  protected registerHandlers() {
    this.bot.start((ctx) =>
      ctx.reply(
        'Welcome to the Swing Trading Bot! I analyze live market data to find stocks with strong catalysts for upward movement. What are you looking to analyze?',
      ),
    )
    this.bot.on('text', (ctx) => this.handleMessage(ctx))
  }

  protected async handleMessage(ctx: any) {
    const messageText = ctx.message?.text
    if (!messageText) return

    await ctx.reply('Analyzing live market data...')

    try {
      const marketContext = await this.marketData.getMarketContext()

      const agentResponse = await this.agentService.run(this.agent, {
        message: `${messageText}\n\n${marketContext}`,
        chatId: ctx.chat.id,
        userId: ctx.from?.id,
      })

      for (const chunk of splitMessage(agentResponse.text)) {
        await replyWithMarkdown(ctx, chunk)
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
  const MAX = 4000
  if (text.length <= MAX) return [text]

  const chunks: string[] = []
  let remaining = text

  while (remaining.length > 0) {
    if (remaining.length <= MAX) {
      chunks.push(remaining)
      break
    }

    let splitAt = remaining.lastIndexOf('\n', MAX)
    if (splitAt <= 0) splitAt = remaining.lastIndexOf('.', MAX)
    if (splitAt <= 0) splitAt = remaining.lastIndexOf(' ', MAX)
    if (splitAt <= 0) splitAt = MAX

    chunks.push(remaining.slice(0, splitAt))
    remaining = remaining.slice(splitAt).trim()
  }

  return chunks
}
