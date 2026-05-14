import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { BaseBot } from '../../common/bot/base-bot'
import { BotRegistryService } from '../../common/bot/bot-registry.service'
import { AgentService } from '../../common/agent/agent.service'
import { GeoPoliticsAgent } from './geo-politics.agent'

@Injectable()
export class GeoPoliticsBot extends BaseBot {
  constructor(
    configService: ConfigService,
    botRegistry: BotRegistryService,
    agentService: AgentService,
  ) {
    const token = configService.getOrThrow<string>('GEO_POLITICS_BOT_TOKEN')
    super(
      'geo-politics',
      token,
      new GeoPoliticsAgent(),
      configService,
      botRegistry,
      agentService,
    )
  }

  protected registerHandlers() {
    this.bot.start((ctx) =>
      ctx.reply(
        'Welcome to the Geopolitical Analysis Bot! I provide expert analysis on international relations, conflicts, and strategic affairs. Describe the scenario you want analyzed.',
      ),
    )
    this.bot.on('text', (ctx) => this.handleMessage(ctx))
  }
}
