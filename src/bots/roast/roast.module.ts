import { Module } from '@nestjs/common'
import { RoastBot } from './roast.bot'

@Module({
  providers: [RoastBot],
  exports: [RoastBot],
})
export class RoastModule {}
