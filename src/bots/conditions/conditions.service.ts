import { Injectable, OnModuleDestroy } from '@nestjs/common'
import { AgentService } from '../../common/agent/agent.service'
import { MarketDataService } from '../../common/market-data/market-data.service'
import { ConditionsCheckAgent } from './conditions.agent'

interface Condition {
  id: number
  description: string
  chatId: number
  createdAt: Date
}

@Injectable()
export class ConditionsService implements OnModuleDestroy {
  private conditions = new Map<number, Condition[]>()
  private nextId = 1
  private timer: ReturnType<typeof setInterval> | null = null
  private checkAgent = new ConditionsCheckAgent()
  private sendMessageFn: ((chatId: number, text: string) => Promise<void>) | null = null

  constructor(
    private marketDataService: MarketDataService,
    private agentService: AgentService,
  ) {}

  setSendMessageFn(fn: (chatId: number, text: string) => Promise<void>): void {
    this.sendMessageFn = fn
  }

  startChecking(): void {
    if (this.timer) return
    console.log('[Conditions] Starting periodic check every 5 minutes')
    this.timer = setInterval(() => this.checkConditions(), 5 * 60 * 1000)
    setTimeout(() => this.checkConditions(), 15_000)
  }

  stopChecking(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  onModuleDestroy(): void {
    this.stopChecking()
  }

  private async checkConditions(): Promise<void> {
    if (!this.sendMessageFn) return

    const all: Condition[] = []
    for (const [, conds] of this.conditions) {
      all.push(...conds)
    }
    if (all.length === 0) return

    console.log(`[Conditions] Checking ${all.length} condition(s)...`)

    const marketContext = await this.marketDataService.getMarketContext()
    const toRemove: Array<{ chatId: number; id: number }> = []

    for (const cond of all) {
      try {
        const response = await this.agentService.run(this.checkAgent, {
          message: `Current Market Data:\n${marketContext}\n\nCondition to evaluate: ${cond.description}\n\nIs this condition met? Answer YES or NO only.`,
          chatId: cond.chatId,
        })
        const raw = response.text.trim()
        const cleaned = raw.replace(/\*\*/g, '').replace(/`/g, '').trim().toUpperCase()
        console.log(`[Conditions] Condition #${cond.id} raw response: "${raw}"`)
        if (/\bYES\b/.test(cleaned)) {
          console.log(`[Conditions] Condition #${cond.id} met: ${cond.description}`)
          await this.sendMessageFn(cond.chatId, `✅ Condition met!\n\n${cond.description}`)
          toRemove.push({ chatId: cond.chatId, id: cond.id })
        }
      } catch (err) {
        console.error(`[Conditions] Error checking condition #${cond.id}:`, err)
      }
    }

    for (const { chatId, id } of toRemove) {
      const conds = this.conditions.get(chatId)
      if (conds) {
        this.conditions.set(chatId, conds.filter((c) => c.id !== id))
      }
    }
  }

  add(chatId: number, description: string): Condition {
    if (!this.conditions.has(chatId)) {
      this.conditions.set(chatId, [])
    }
    const condition: Condition = {
      id: this.nextId++,
      description,
      chatId,
      createdAt: new Date(),
    }
    this.conditions.get(chatId)!.push(condition)
    return condition
  }

  list(chatId: number): Condition[] {
    return this.conditions.get(chatId) ?? []
  }

  remove(chatId: number, id: number): boolean {
    const conds = this.conditions.get(chatId)
    if (!conds) return false
    const idx = conds.findIndex((c) => c.id === id)
    if (idx === -1) return false
    conds.splice(idx, 1)
    return true
  }

  removeAll(chatId: number): number {
    const conds = this.conditions.get(chatId)
    if (!conds) return 0
    const count = conds.length
    this.conditions.delete(chatId)
    return count
  }
}
