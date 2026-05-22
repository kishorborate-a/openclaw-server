import { Injectable } from '@nestjs/common'
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
export class ManifestationService {
  private goals = new Map<number, Goal>()
  private dailyAgent = new ManifestationDailyAgent()
  private sendMessageFn: ((chatId: number, text: string) => Promise<void>) | null = null
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

  async sendManifestation(chatId: number): Promise<void> {
    const goal = this.goals.get(chatId)
    if (!goal) {
      await this.sendMessageFn?.(chatId, 'Set a goal first with /goal.')
      return
    }
    try {
      const response = await this.agentService.run(this.dailyAgent, {
        message: `The user's manifestation goal is: ${goal.description}\n\nGenerate a natural, human-sounding manifestation reminder for them.`,
        chatId,
      })
      await this.sendMessageFn?.(chatId, response.text)
    } catch (err: any) {
      console.error(`[Manifestation] AI error for ${chatId}:`, err.message)
      await this.sendMessageFn?.(chatId, 'The universe needs a moment to recharge. Try /manifest again in a little while.')
    }
  }

  setGoal(chatId: number, description: string): Goal | null {
    if (this.goals.has(chatId)) return null
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
