import { Agent, AgentRequest, AgentResponse } from '../../common/agent/agent.interface'

export class ConditionsAgent implements Agent {
  readonly name = 'conditions'
  readonly description = 'Manages conditions for market alerts'
  readonly systemPrompt = 'You help users manage conditions for market alerts. Respond helpfully. Available commands: /add <condition>, /list, /delete <id>, /deleteall.'

  async handle(request: AgentRequest): Promise<AgentResponse> {
    return { text: '' }
  }
}

export class ConditionsCheckAgent implements Agent {
  readonly name = 'conditions-check'
  readonly description = 'Evaluates whether market conditions are met'
  readonly systemPrompt = `You evaluate market conditions against current market data.

Given the current market data and a specific condition, determine whether the condition is met.

Rules:
- Respond ONLY with exactly one word: YES or NO
- YES if the condition is clearly satisfied by the current data
- NO if the condition is not satisfied
- Be precise and objective
- If the data is insufficient to evaluate, answer NO

Do not include any other text, explanation, or formatting.`

  async handle(request: AgentRequest): Promise<AgentResponse> {
    return { text: '' }
  }
}
