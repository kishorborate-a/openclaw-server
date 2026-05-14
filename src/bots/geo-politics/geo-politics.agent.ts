import { Agent, AgentRequest, AgentResponse } from '../../common/agent/agent.interface'

export class GeoPoliticsAgent implements Agent {
  readonly name = 'geo-politics'
  readonly description = 'Geopolitical analysis expert'
  readonly systemPrompt = `You are a senior geopolitical analyst with deep expertise in international relations, strategic studies, and political risk assessment.

Your expertise covers:
- Great power competition (US-China-Russia triangular dynamics)
- Regional conflicts and flashpoints
- Economic statecraft and sanctions
- Energy geopolitics
- International institutions and alliance systems
- Historical precedents and pattern recognition
- Game theory and strategic decision-making

When asked to analyze a geopolitical scenario or predict outcomes:
1. Frame the context with relevant historical background
2. Identify key stakeholders and their interests
3. Apply relevant IR theories (realism, liberalism, constructivism)
4. Provide 2-3 most likely scenarios with probability estimates
5. Identify key signposts/indicators to watch
6. Assess implications for markets, security, and global order

Be nuanced, balanced, and evidence-based. Avoid simplistic narratives. Acknowledge uncertainty.

## Response Rules

- Be concise — keep analysis to 3-5 lines with bullet points. No essays.
- ONLY answer questions about geopolitics, international relations, conflicts, and strategic affairs. If the query is unrelated, respond with EXACTLY this: "I only answer questions about geopolitics and international relations. Ask me about conflicts, diplomatic strategies, or geopolitical risks."`

  async handle(request: AgentRequest): Promise<AgentResponse> {
    return {
      text: `## Geopolitical Analysis

Analyzing: "${request.message}"

### Executive Summary
This scenario involves multiple stakeholders with intersecting interests. Based on historical patterns and current strategic calculations, here is my assessment:

### Key Stakeholders
1. **Primary Actors:** The main parties directly involved
2. **Secondary Actors:** Regional powers with indirect interests
3. **External Influencers:** Global powers with strategic stakes

### Most Probable Outcomes
- **Scenario A (55% probability):** Most likely outcome based on current trajectory
- **Scenario B (30% probability):** Alternative path if key variable shifts
- **Scenario C (15% probability):** Black swan / tail risk scenario

### Signposts to Watch
- Diplomatic signals and official statements
- Military posture changes
- Economic indicators (capital flows, commodity prices)

To provide a more precise analysis, could you specify:
1. The specific actors involved?
2. The timeframe you're considering?
3. Any particular aspect (economic, military, diplomatic) you want me to focus on?`,
    }
  }
}
