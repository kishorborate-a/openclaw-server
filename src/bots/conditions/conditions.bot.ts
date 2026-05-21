import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { BaseBot } from '../../common/bot/base-bot'
import { BotRegistryService } from '../../common/bot/bot-registry.service'
import { AgentService } from '../../common/agent/agent.service'
import { ConditionsAgent } from './conditions.agent'
import { ConditionsService } from './conditions.service'

@Injectable()
export class ConditionsBot extends BaseBot {
  constructor(
    configService: ConfigService,
    botRegistry: BotRegistryService,
    agentService: AgentService,
    private conditionsService: ConditionsService,
  ) {
    const token = configService.getOrThrow<string>('CONDITIONS_BOT_TOKEN')
    super('conditions', token, new ConditionsAgent(), configService, botRegistry, agentService)
    this.conditionsService.setSendMessageFn((chatId, text) => this.sendMessage(chatId, text))
  }

  async start() {
    await super.start()
    this.conditionsService.startChecking()
  }

  async stop() {
    this.conditionsService.stopChecking()
    await super.stop()
  }

  private async sendMessage(chatId: number, text: string): Promise<void> {
    await this.bot.telegram.sendMessage(chatId, text).catch((err) => {
      console.error(`[${this.name}] send error:`, err)
    })
  }

  protected registerHandlers() {
    this.bot.start((ctx) =>
      ctx.reply(
        '📊 Welcome to the Conditions Bot!\n\n' +
        'Set conditions and get notified when they are met based on live market data.\n\n' +
        'Commands:\n' +
        '/add <condition> - Add a new condition\n' +
        '/list - List all active conditions\n' +
        '/delete <id> - Delete a condition\n' +
        '/deleteall - Delete all conditions\n\n' +
        'Examples:\n' +
        '/add if SPY drops below 500\n' +
        '/add when NVDA goes above $1000\n' +
        '/add if AAPL drops 5% in a day\n\n' +
        'Conditions are checked every 5 minutes.',
      ),
    )

    this.bot.command('add', (ctx) => {
      const text = ctx.message.text.slice('/add'.length).trim()
      if (!text) {
        ctx.reply('Please provide a condition. Example:\n/add if SPY drops below 500')
        return
      }
      const condition = this.conditionsService.add(ctx.chat.id, text)
      ctx.reply(`✅ Condition #${condition.id} added:\n\n${text}`)
    })

    this.bot.command('list', (ctx) => {
      const conditions = this.conditionsService.list(ctx.chat.id)
      if (conditions.length === 0) {
        ctx.reply('No active conditions. Add one with /add.')
        return
      }
      const lines = conditions.map((c) => `#${c.id}: ${c.description}`)
      ctx.reply(`📋 Your active conditions:\n\n${lines.join('\n')}`)
    })

    this.bot.command('delete', (ctx) => {
      const idStr = ctx.message.text.slice('/delete'.length).trim()
      const id = parseInt(idStr, 10)
      if (isNaN(id)) {
        ctx.reply('Please provide a valid condition ID. Example:\n/delete 1')
        return
      }
      if (this.conditionsService.remove(ctx.chat.id, id)) {
        ctx.reply(`✅ Condition #${id} deleted.`)
      } else {
        ctx.reply(`❌ Condition #${id} not found.`)
      }
    })

    this.bot.command('deleteall', (ctx) => {
      const count = this.conditionsService.removeAll(ctx.chat.id)
      if (count > 0) {
        ctx.reply(`✅ All ${count} condition(s) deleted.`)
      } else {
        ctx.reply('No conditions to delete.')
      }
    })

    this.bot.on('text', (ctx) => this.handleMessage(ctx))
  }
}
