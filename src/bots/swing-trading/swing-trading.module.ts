import { Module } from '@nestjs/common'
import { SwingTradingBot } from './swing-trading.bot'

@Module({
  providers: [SwingTradingBot],
  exports: [SwingTradingBot],
})
export class SwingTradingModule {}
