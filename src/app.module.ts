import { Global, Module, OnApplicationBootstrap } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { BotRegistryService } from './common/bot/bot-registry.service'
import { AgentService } from './common/agent/agent.service'
import { FileServerService } from './common/fileserver/fileserver.service'
import { MarketDataService } from './common/market-data/market-data.service'
import { WebhookController } from './common/bot/webhook.controller'
import { AndroidAppModule } from './bots/android-app/android-app.module'
import { SwingTradingModule } from './bots/swing-trading/swing-trading.module'
import { GeoPoliticsModule } from './bots/geo-politics/geo-politics.module'
import { RoastModule } from './bots/roast/roast.module'
import { ConditionsModule } from './bots/conditions/conditions.module'

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AndroidAppModule,
    SwingTradingModule,
    GeoPoliticsModule,
    RoastModule,
    ConditionsModule,
  ],
  controllers: [WebhookController],
  providers: [BotRegistryService, AgentService, FileServerService, MarketDataService],
  exports: [BotRegistryService, AgentService, FileServerService, MarketDataService],
})
export class AppModule implements OnApplicationBootstrap {
  constructor(private botRegistry: BotRegistryService) {}

  onApplicationBootstrap() {
    console.log('[App] Starting bots...')
    this.botRegistry
      .startAll()
      .then(() => console.log('[App] All bots started.'))
      .catch((err) => console.error('[App] Bot startup error:', err))
  }
}
