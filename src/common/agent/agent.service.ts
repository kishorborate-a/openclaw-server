import OpenAI from 'openai'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Agent, AgentRequest, AgentResponse } from './agent.interface'

@Injectable()
export class AgentService {
  private openai: OpenAI
  private model: string

  constructor(private configService: ConfigService) {
    const baseURL = this.configService.get<string>('AI_BASE_URL')

    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('AI_API_KEY'),
      ...(baseURL && { baseURL }),
    })
    this.model = this.configService.get<string>('AI_MODEL', 'gpt-4o')
  }

  async run(agent: Agent, request: AgentRequest): Promise<AgentResponse> {
    const completion = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: agent.systemPrompt },
        { role: 'user', content: request.message },
      ],
      temperature: 0.7,
    })

    return {
      text: completion.choices[0]?.message?.content ?? 'No response generated.',
    }
  }
}
