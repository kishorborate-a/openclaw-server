import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { BaseBot } from '../../common/bot/base-bot'
import { BotRegistryService } from '../../common/bot/bot-registry.service'
import { AgentService } from '../../common/agent/agent.service'
import { RoastAgent } from './roast.agent'

@Injectable()
export class RoastBot extends BaseBot {
  constructor(
    configService: ConfigService,
    botRegistry: BotRegistryService,
    agentService: AgentService,
  ) {
    const token = configService.getOrThrow<string>('ROAST_BOT_TOKEN')
    super('roast', token, new RoastAgent(), configService, botRegistry, agentService)
  }

  protected registerHandlers() {
    this.bot.start((ctx) =>
      ctx.reply(
        '🔥 मैं आ गया! I came to roast! मी आलो रे!\n\nSend me a name, a message, a photo caption — anything. I will roast it in Hindi / Marathi / English.\n\nWritten something funny? Want me to roast your friend? Send it!\n\nType /roast or just send anything.',
      ),
    )
    this.bot.on('text', (ctx) => this.handleMessage(ctx))
  }
}
