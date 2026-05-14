import { Module } from '@nestjs/common'
import { GeoPoliticsBot } from './geo-politics.bot'

@Module({
  providers: [GeoPoliticsBot],
  exports: [GeoPoliticsBot],
})
export class GeoPoliticsModule {}
