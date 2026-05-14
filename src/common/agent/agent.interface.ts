export interface AgentRequest {
  message: string
  chatId: number
  userId?: number
}

export interface AgentResponse {
  text: string
  media?: { type: 'photo' | 'document'; url?: string; buffer?: Buffer; filename?: string }
}

export interface Agent {
  readonly name: string
  readonly description: string
  readonly systemPrompt: string
  handle(request: AgentRequest): Promise<AgentResponse>
}
