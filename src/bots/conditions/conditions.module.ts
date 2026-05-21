import { Module } from '@nestjs/common'
import { ConditionsBot } from './conditions.bot'
import { ConditionsService } from './conditions.service'

@Module({
  providers: [ConditionsBot, ConditionsService],
  exports: [ConditionsBot, ConditionsService],
})
export class ConditionsModule {}
