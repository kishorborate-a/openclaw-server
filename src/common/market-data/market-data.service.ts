import { Injectable } from '@nestjs/common'

interface Quote {
  symbol: string
  price: number
  change: number
  changePercent: number
  high: number
  low: number
  volume: number
  previousClose: number
}

interface NewsItem {
  title: string
  publisher: string
  time: string
  url: string
  related: string
}

@Injectable()
export class MarketDataService {
  private watchlist = [
    'SPY', 'QQQ', 'IWM', 'DIA',
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA',
    'XLK', 'XLF', 'XLE', 'XLV', 'XLI', 'XLY',
  ]

  private cache: { data: string; timestamp: number } | null = null
  private readonly CACHE_TTL = 120_000

  async getMarketContext(): Promise<string> {
    if (this.cache && Date.now() - this.cache.timestamp < this.CACHE_TTL) {
      return this.cache.data
    }

    const [quotes, news] = await Promise.all([
      this.fetchQuotes(this.watchlist),
      this.fetchRecentNews(),
    ])

    const gainers = [...quotes].sort((a, b) => b.changePercent - a.changePercent)
    const losers = [...gainers].reverse()

    const lines: string[] = ['--- LIVE MARKET DATA ---', '']

    lines.push('Market Overview:')
    for (const q of quotes.filter((q) => ['SPY', 'QQQ', 'IWM', 'DIA'].includes(q.symbol))) {
      lines.push(
        `  ${q.symbol}: $${q.price.toFixed(2)} (${q.changePercent >= 0 ? '+' : ''}${q.changePercent.toFixed(2)}%)  Vol: ${this.fmtVolume(q.volume)}`,
      )
    }

    lines.push('', 'Top Gainers:')
    for (const q of gainers.slice(0, 5)) {
      if (q.price <= 0) continue
      const dir = q.changePercent >= 0 ? '+' : ''
      lines.push(`  ${q.symbol}: $${q.price.toFixed(2)} (${dir}${q.changePercent.toFixed(2)}%)`)
    }

    lines.push('', 'Top Losers:')
    for (const q of losers.slice(0, 3)) {
      if (q.price <= 0) continue
      const dir = q.changePercent >= 0 ? '+' : ''
      lines.push(`  ${q.symbol}: $${q.price.toFixed(2)} (${dir}${q.changePercent.toFixed(2)}%)`)
    }

    if (news.length > 0) {
      lines.push('', 'Recent Market News:')
      for (const n of news.slice(0, 6)) {
        lines.push(`  [${n.related}] ${n.title} — ${n.publisher}`)
      }
    }

    const output = lines.join('\n')
    this.cache = { data: output, timestamp: Date.now() }
    return output
  }

  private async fetchQuotes(symbols: string[]): Promise<Quote[]> {
    const results = await Promise.allSettled(
      symbols.map((s) => this.fetchQuote(s)),
    )
    return results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<Quote>).value)
      .filter((q) => q.price > 0)
  }

  private async fetchQuote(symbol: string): Promise<Quote> {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1d&interval=1d`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    if (!res.ok) throw new Error(`YF ${symbol}: ${res.status}`)
    const json: any = await res.json()
    const result = json.chart?.result?.[0]
    if (!result) throw new Error(`YF ${symbol}: no data`)

    const meta = result.meta
    const quoteIndicators = result.indicators?.quote?.[0]
    const close = quoteIndicators?.close?.filter((v: number | null) => v !== null) ?? []
    const closePrice = close[close.length - 1] ?? meta.regularMarketPrice ?? 0
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? closePrice
    const change = closePrice - prevClose
    const pct = prevClose > 0 ? (change / prevClose) * 100 : 0

    return {
      symbol,
      price: closePrice,
      change,
      changePercent: pct,
      high: meta.regularMarketDayHigh ?? closePrice,
      low: meta.regularMarketDayLow ?? closePrice,
      volume: meta.regularMarketVolume ?? 0,
      previousClose: prevClose,
    }
  }

  private async fetchRecentNews(): Promise<NewsItem[]> {
    const terms = ['stock market', 'earnings', 'fed', 'tech stocks', 'market rally']
    const results = await Promise.allSettled(
      terms.map((t) => this.fetchNewsFor(t)),
    )
    const seen = new Set<string>()
    return results
      .filter((r) => r.status === 'fulfilled')
      .flatMap((r) => (r as PromiseFulfilledResult<NewsItem[]>).value)
      .filter((n) => {
        if (seen.has(n.title)) return false
        seen.add(n.title)
        return true
      })
      .slice(0, 10)
  }

  private async fetchNewsFor(query: string): Promise<NewsItem[]> {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&newsCount=3`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    if (!res.ok) return []
    const json: any = await res.json()
    return (json.news ?? []).map((item: any) => ({
      title: item.title ?? '',
      publisher: item.publisher ?? '',
      time: new Date((item.providerPublishTime ?? 0) * 1000).toISOString(),
      url: item.link ?? '',
      related: (item.relatedStocks ?? []).join(', ') || query,
    }))
  }

  private fmtVolume(v: number): string {
    if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + 'B'
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M'
    if (v >= 1_000) return (v / 1_000).toFixed(1) + 'K'
    return String(v)
  }
}
