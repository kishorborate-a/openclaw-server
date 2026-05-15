import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { BaseBot } from '../../common/bot/base-bot'
import { BotRegistryService } from '../../common/bot/bot-registry.service'
import { AgentService } from '../../common/agent/agent.service'
import { AndroidAppGenerationAgent } from './android-app.agent'
import { AndroidAppRefinementAgent } from './android-app-refinement.agent'

@Injectable()
export class AndroidAppBot extends BaseBot {
  private generationAgent = new AndroidAppGenerationAgent()
  private refinementAgent = new AndroidAppRefinementAgent()

  constructor(
    configService: ConfigService,
    botRegistry: BotRegistryService,
    agentService: AgentService,
  ) {
    const token = configService.getOrThrow<string>('ANDROID_APP_BOT_TOKEN')
    super(
      'android-app',
      token,
      new AndroidAppGenerationAgent(),
      configService,
      botRegistry,
      agentService,
    )
  }

  protected registerHandlers() {
    this.bot.start((ctx) =>
      ctx.reply(
        'Welcome to the Android App Builder Bot! Describe your app idea and I will build it for you.',
      ),
    )
    this.bot.on('text', (ctx) => this.handleAndroidBuild(ctx))
  }

  private async handleAndroidBuild(ctx: any) {
    const messageText = ctx.message?.text
    if (!messageText) return

    await ctx.reply('Analyzing your requirements and generating your app...')

    try {
      const response = await this.agentService.run(this.generationAgent, {
        message: messageText,
        chatId: ctx.chat.id,
        userId: ctx.from?.id,
      })

      const initialCode = extractKotlinCode(response.text)
      if (!initialCode) {
        await ctx.reply(
          'Failed to generate valid Android code. Please try again with more specific requirements.',
        )
        return
      }

      await ctx.reply('Refining your app with premium design polish...')

      const refinedResponse = await this.agentService.run(this.refinementAgent, {
        message: `Original request: ${messageText}\n\nGenerated code:\n${initialCode}`,
        chatId: ctx.chat.id,
        userId: ctx.from?.id,
      })

      const refinedCode = sanitizeKotlinCode(
        extractKotlinCode(refinedResponse.text) ?? initialCode,
      )

      await ctx.reply('Building APK, please wait (2-3 minutes)...')

      const apkUrl = await this.buildApk(refinedCode)

      await ctx.reply(
        `Your APK is ready!\n\nDownload: ${apkUrl}\n\nInstall it on your Android device to test.`,
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[${this.name}] build error:`, message)
      await ctx.reply(
        `Sorry, an error occurred while building your app.\n\n${message}`,
      )
    }
  }

  private async buildApk(code: string): Promise<string> {
    const buildUrl =
      this.configService.get<string>('FILESERVER_URL', 'http://79.143.189.251') +
      '/build-android'

    const res = await fetch(buildUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`build failed: ${body}`)
    }

    const data = await res.json()
    return data.url as string
  }
}

function extractKotlinCode(text: string): string | null {
  const trimmed = text.trim()

  if (/^package\s+\w/.test(trimmed)) {
    return trimmed
  }

  const match = text.match(/```(?:kotlin)?\s*\n?([\s\S]*?)\n?\s*```/)
  if (match) {
    return match[1].trim()
  }

  const declarationMatch = text.match(/(?:^|\n)\s*(package\s+[\w.]+[\s\S]*)/)
  if (declarationMatch) {
    return declarationMatch[1].trim()
  }

  return null
}

function sanitizeKotlinCode(code: string): string {
  const lines = code.split('\n')
  const packageIdx = lines.findIndex((l) => /^package\s+/.test(l.trim()))
  if (packageIdx === -1) return code

  const importLines: { line: string; idx: number }[] = []
  lines.forEach((l, i) => {
    if (/^import\s+/.test(l.trim())) {
      importLines.push({ line: l, idx: i })
    }
  })

  for (const { idx } of importLines.slice().reverse()) {
    lines.splice(idx, 1)
  }

  const pkgLine = packageIdx
  let insertAt = pkgLine + 1
  while (
    insertAt < lines.length &&
    lines[insertAt].trim() === ''
  ) {
    insertAt++
  }
  lines.splice(
    insertAt,
    0,
    '',
    ...importLines.map((i) => i.line),
  )

  let result = lines.join('\n')

  if (
    result.includes('isSystemInDarkTheme(') &&
    !result.includes('import androidx.compose.foundation.isSystemInDarkTheme') &&
    !result.includes('import androidx.compose.ui.platform.isSystemInDarkTheme')
  ) {
    const idx = result.indexOf('package ')
    const nlIdx = result.indexOf('\n', idx)
    const importInsert = result.slice(0, nlIdx + 1) +
      'import androidx.compose.foundation.isSystemInDarkTheme\n' +
      result.slice(nlIdx + 1)
    result = importInsert
  }

  result = result.replace(
    /val\s+Brush\.(\w+)\s*:\s*Brush\s*(get\s*\(\s*\)\s*)?=\s*/g,
    'val $1: Brush = ',
  )

  return result
}
