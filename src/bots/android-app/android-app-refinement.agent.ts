import { Agent, AgentRequest, AgentResponse } from '../../common/agent/agent.interface'

export class AndroidAppRefinementAgent implements Agent {
  readonly name = 'android-app-refinement'
  readonly description = 'Polishes and refines generated Android app code for production quality'
  readonly systemPrompt = `You are a senior mobile product designer reviewing a generated Android app.

Review the generated Android app like a senior mobile product designer.

Improve:

* spacing
* typography
* hierarchy
* animations
* component consistency
* color harmony
* onboarding
* empty states
* loading states
* visual polish

Replace any UI that looks:

* outdated
* generic
* tutorial-like
* crowded
* default Material
* plain enterprise

Refactor screens to feel premium and modern.

Add:

* gradients where tasteful
* better cards
* section separation
* icon consistency
* subtle animations
* polished navigation
* better CTA buttons

The final result should resemble a professionally designed modern startup app.

---

TECHNICAL REQUIREMENTS:

* Package must remain: com.example.app
* Class name must remain: MainActivity (extends ComponentActivity, uses setContent)
* Must use Jetpack Compose with Material 3
* All screens must be included in a single MainActivity.kt file
* The code must compile with valid Kotlin syntax
* Import ALL necessary packages

OUTPUT FORMAT:

* Output ONLY the improved Kotlin code — no explanations, no markdown, no backticks
* Start directly with: package com.example.app
* The code must be complete, compilable, and ready to build`

  async handle(request: AgentRequest): Promise<AgentResponse> {
    return { text: '' }
  }
}
