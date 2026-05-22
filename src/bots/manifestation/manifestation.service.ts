import { Injectable, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as fs from 'fs'
import * as path from 'path'
import { AgentService } from '../../common/agent/agent.service'
import { ManifestationDailyAgent } from './manifestation.agent'

interface Goal {
  description: string
  chatId: number
  createdAt: string
}

@Injectable()
export class ManifestationService implements OnModuleDestroy {
  private goals = new Map<number, Goal>()
  private dailyAgent = new ManifestationDailyAgent()
  private sendMessageFn: ((chatId: number, text: string) => Promise<void>) | null = null
  private timers: ReturnType<typeof setInterval>[] = []
  private dataPath: string

  constructor(
    private agentService: AgentService,
    private configService: ConfigService,
  ) {
    this.dataPath = this.configService.get<string>(
      'MANIFESTATION_DATA_PATH',
      path.join(process.cwd(), 'data', 'manifestation-goals.json'),
    )
    this.loadGoals()
  }

  setSendMessageFn(fn: (chatId: number, text: string) => Promise<void>): void {
    this.sendMessageFn = fn
  }

  private loadGoals(): void {
    try {
      if (!fs.existsSync(this.dataPath)) return
      const raw = fs.readFileSync(this.dataPath, 'utf-8')
      const data: [number, Goal][] = JSON.parse(raw)
      this.goals = new Map(data)
      console.log(`[Manifestation] Loaded ${this.goals.size} goal(s) from disk`)
    } catch (err) {
      console.error('[Manifestation] Error loading goals:', err)
    }
  }

  private saveGoals(): void {
    try {
      const dir = path.dirname(this.dataPath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(this.dataPath, JSON.stringify([...this.goals]), 'utf-8')
    } catch (err) {
      console.error('[Manifestation] Error saving goals:', err)
    }
  }

  startDailyReminders(): void {
    if (this.timers.length > 0) return
    console.log('[Manifestation] Scheduling daily reminders at 8am and 10pm')
    this.scheduleAt(8, 'MORNING')
    this.scheduleAt(22, 'NIGHT')
  }

  private scheduleAt(hour: number, label: string): void {
    const now = new Date()
    const next = new Date(now)
    next.setHours(hour, 0, 0, 0)
    if (next <= now) next.setDate(next.getDate() + 1)
    const delay = next.getTime() - now.getTime()
    setTimeout(() => {
      this.sendReminders(label)
      this.timers.push(setInterval(() => this.sendReminders(label), 24 * 60 * 60 * 1000))
    }, delay)
  }

  stopDailyReminders(): void {
    for (const t of this.timers) clearInterval(t)
    this.timers = []
  }

  onModuleDestroy(): void {
    this.stopDailyReminders()
  }

  async sendSample(chatId: number, label: string): Promise<void> {
    const goal = this.goals.get(chatId)
    if (!goal) {
      await this.sendMessageFn?.(chatId, 'Set a goal first with /goal.')
      return
    }
    const response = await this.agentService.run(this.dailyAgent, {
      message: `Time: ${label}\nThe user's manifestation goal is: ${goal.description}\n\nGenerate a natural, human-sounding ${label.toLowerCase()} reminder for them.`,
      chatId,
    })
    await this.sendMessageFn?.(chatId, response.text)
  }

  private async sendReminders(label: string): Promise<void> {
    if (!this.sendMessageFn) return
    if (this.goals.size === 0) return
    console.log(`[Manifestation] Sending ${label} reminders to ${this.goals.size} user(s)`)
    for (const [chatId, goal] of this.goals) {
      try {
        const response = await this.agentService.run(this.dailyAgent, {
          message: `Time: ${label}\nThe user's manifestation goal is: ${goal.description}\n\nGenerate a natural, human-sounding ${label.toLowerCase()} reminder for them.`,
          chatId,
        })
        await this.sendMessageFn(chatId, response.text)
      } catch (err) {
        console.error(`[Manifestation] Error sending ${label} reminder to ${chatId}:`, err)
      }
    }
  }

  setGoal(chatId: number, description: string): Goal {
    const goal: Goal = {
      description,
      chatId,
      createdAt: new Date().toISOString(),
    }
    this.goals.set(chatId, goal)
    this.saveGoals()
    return goal
  }

  getGoal(chatId: number): Goal | null {
    return this.goals.get(chatId) ?? null
  }

  deleteGoal(chatId: number): boolean {
    const removed = this.goals.delete(chatId)
    if (removed) this.saveGoals()
    return removed
  }
}
