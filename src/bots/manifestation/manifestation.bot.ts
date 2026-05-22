import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { BaseBot } from '../../common/bot/base-bot'
import { BotRegistryService } from '../../common/bot/bot-registry.service'
import { AgentService } from '../../common/agent/agent.service'
import { ManifestationGoalAgent } from './manifestation.agent'
import { ManifestationService } from './manifestation.service'

@Injectable()
export class ManifestationBot extends BaseBot {
  constructor(
    configService: ConfigService,
    botRegistry: BotRegistryService,
    agentService: AgentService,
    private manifestationService: ManifestationService,
  ) {
    const token = configService.getOrThrow<string>('MANIFESTATION_BOT_TOKEN')
    super('manifestation', token, new ManifestationGoalAgent(), configService, botRegistry, agentService)
    this.manifestationService.setSendMessageFn((chatId, text) => this.sendMessage(chatId, text))
  }

  private async sendMessage(chatId: number, text: string): Promise<void> {
    await this.bot.telegram.sendMessage(chatId, text).catch((err) => {
      console.error(`[${this.name}] send error:`, err)
    })
  }

  protected registerHandlers() {
    this.bot.start((ctx) =>
      ctx.reply(
        '✨ Welcome to the Manifestation Bot!\n\n' +
        'Based on the principles of "The Secret" by Rhonda Byrne, ' +
        'I will help you manifest your goals using the Law of Attraction.\n\n' +
        'Commands:\n' +
        '/goal <your goal> - Set your manifestation goal\n' +
        '/mygoal - View your current goal\n' +
        '/manifest - Get a manifestation reminder right now\n' +
        '/delete - Delete your goal',
      ),
    )

    this.bot.command('goal', (ctx) => {
      const text = ctx.message.text.slice('/goal'.length).trim()
      if (!text) {
        ctx.reply('Please tell me your goal. Example:\n/goal I want to attract a fulfilling career')
        return
      }
      const goal = this.manifestationService.setGoal(ctx.chat.id, text)
      ctx.reply(
        `🎯 Goal set!\n\n"${goal.description}"\n\n` +
        'Use /manifest anytime to get a reminder tailored to your goal.',
      )
    })

    this.bot.command('mygoal', (ctx) => {
      const goal = this.manifestationService.getGoal(ctx.chat.id)
      if (!goal) {
        ctx.reply('You haven\'t set a goal yet. Use /goal to set one.')
        return
      }
      ctx.reply(`🎯 Your current goal:\n\n"${goal.description}"`)
    })

    this.bot.command('manifest', async (ctx) => {
      const goal = this.manifestationService.getGoal(ctx.chat.id)
      if (!goal) {
        ctx.reply('Set a goal first with /goal.')
        return
      }
      await this.manifestationService.sendManifestation(ctx.chat.id)
    })

    this.bot.command('delete', (ctx) => {
      if (this.manifestationService.deleteGoal(ctx.chat.id)) {
        ctx.reply('✅ Your goal has been deleted. The universe is still rooting for you!')
      } else {
        ctx.reply('No goal to delete.')
      }
    })

    this.bot.on('text', (ctx) => this.handleMessage(ctx))
  }
}
