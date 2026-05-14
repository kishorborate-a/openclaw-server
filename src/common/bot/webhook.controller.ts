import { Controller, Post, Param, Req } from '@nestjs/common'
import { Request } from 'express'
import { BotRegistryService } from './bot-registry.service'

@Controller('webhook')
export class WebhookController {
  constructor(private botRegistry: BotRegistryService) {}

  @Post(':name')
  async handleWebhook(@Param('name') name: string, @Req() req: Request) {
    const bot = this.botRegistry.get(name)
    if (!bot) {
      return { error: `Bot "${name}" not found` }
    }
    await (bot as any).bot.handleUpdate(req.body)
    return { ok: true }
  }
}
