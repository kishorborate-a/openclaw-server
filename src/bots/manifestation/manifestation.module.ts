import { Module } from '@nestjs/common'
import { ManifestationBot } from './manifestation.bot'
import { ManifestationService } from './manifestation.service'

@Module({
  providers: [ManifestationBot, ManifestationService],
  exports: [ManifestationBot],
})
export class ManifestationModule {}
