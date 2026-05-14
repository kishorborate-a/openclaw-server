import { Module } from '@nestjs/common'
import { AndroidAppBot } from './android-app.bot'

@Module({
  providers: [AndroidAppBot],
  exports: [AndroidAppBot],
})
export class AndroidAppModule {}
