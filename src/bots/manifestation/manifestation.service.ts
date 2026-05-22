import { Injectable, OnModuleDestroy } from '@nestjs/common'
import { AgentService } from '../../common/agent/agent.service'
import { ManifestationDailyAgent } from './manifestation.agent'

interface Goal {
  description: string
  chatId: number
  createdAt: Date
}

@Injectable()
export class ManifestationService implements OnModuleDestroy {
  private goals = new Map<number, Goal>()
  private timer: ReturnType<typeof setInterval> | null = null
  private dailyAgent = new ManifestationDailyAgent()
  private sendMessageFn: ((chatId: number, text: string) => Promise<void>) | null = null

  constructor(private agentService: AgentService) {}

  setSendMessageFn(fn: (chatId: number, text: string) => Promise<void>): void {
    this.sendMessageFn = fn
  }

  startDailyReminders(): void {
    if (this.timer) return
    console.log('[Manifestation] Starting daily reminders every 24 hours')
    const now = new Date()
    const msUntil9am = (() => {
      const next = new Date(now)
      next.setHours(9, 0, 0, 0)
      if (next <= now) next.setDate(next.getDate() + 1)
      return next.getTime() - now.getTime()
    })()
    setTimeout(() => {
      this.sendDailyReminders()
      this.timer = setInterval(() => this.sendDailyReminders(), 24 * 60 * 60 * 1000)
    }, msUntil9am)
  }

  stopDailyReminders(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  onModuleDestroy(): void {
    this.stopDailyReminders()
  }

  private async sendDailyReminders(): Promise<void> {
    if (!this.sendMessageFn) return
    if (this.goals.size === 0) return
    console.log(`[Manifestation] Sending daily reminders to ${this.goals.size} user(s)`)
    for (const [chatId, goal] of this.goals) {
      try {
        const response = await this.agentService.run(this.dailyAgent, {
          message: `The user's manifestation goal is: ${goal.description}\n\nGenerate a daily reminder for them.`,
          chatId,
        })
        await this.sendMessageFn(chatId, `🌟 Daily Manifestation Reminder 🌟\n\n${response.text}`)
      } catch (err) {
        console.error(`[Manifestation] Error sending reminder to ${chatId}:`, err)
      }
    }
  }

  setGoal(chatId: number, description: string): Goal {
    const goal: Goal = {
      description,
      chatId,
      createdAt: new Date(),
    }
    this.goals.set(chatId, goal)
    return goal
  }

  getGoal(chatId: number): Goal | null {
    return this.goals.get(chatId) ?? null
  }

  deleteGoal(chatId: number): boolean {
    return this.goals.delete(chatId)
  }
}
