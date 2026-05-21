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
  readonly systemPrompt = `You evaluate whether conditions are true or false based on available data and general knowledge.

Given a condition, determine whether it is currently true.

Rules:
- Respond with EXACTLY one word: YES or NO
- YES if the condition is currently true
- NO if the condition is currently false
- Use available market data and your general knowledge (including date/time) to evaluate
- Be precise and objective
- If you cannot determine, answer NO
- NEVER include any other text, punctuation, markdown, explanation, or formatting`

  async handle(request: AgentRequest): Promise<AgentResponse> {
    return { text: '' }
  }
}
