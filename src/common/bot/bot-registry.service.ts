import { Injectable, OnApplicationShutdown } from '@nestjs/common'
import { TelegramBot } from './bot.interface'

@Injectable()
export class BotRegistryService implements OnApplicationShutdown {
  private bots = new Map<string, TelegramBot>()

  register(bot: TelegramBot) {
    if (this.bots.has(bot.name)) {
      throw new Error(`Bot "${bot.name}" is already registered.`)
    }
    this.bots.set(bot.name, bot)
  }

  get(name: string): TelegramBot | undefined {
    return this.bots.get(name)
  }

  getAll(): TelegramBot[] {
    return Array.from(this.bots.values())
  }

  async startAll() {
    const entries = Array.from(this.bots.entries())
    const results = await Promise.allSettled(
      entries.map(([, bot]) => bot.start()),
    )
    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      const [name] = entries[i]
      if (result.status === 'rejected') {
        console.error(`Bot "${name}" failed to start:`, result.reason)
      } else {
        console.log(`Bot "${name}" started successfully.`)
      }
    }
  }

  async onApplicationShutdown() {
    await Promise.all(
      Array.from(this.bots.values()).map((bot) => bot.stop()),
    )
  }
}
