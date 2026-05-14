import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class FileServerService {
  private baseUrl: string

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>(
      'FILESERVER_URL',
      'http://79.143.189.251',
    )
  }

  async upload(buffer: Buffer, filename: string): Promise<string> {
    const form = new FormData()
    const blob = new Blob([new Uint8Array(buffer)], {
      type: 'application/octet-stream',
    })
    form.append('file', blob, filename)

    const res = await fetch(`${this.baseUrl}/upload`, {
      method: 'POST',
      body: form,
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`upload failed (${res.status}): ${body}`)
    }

    const data = await res.json()
    return data.url as string
  }
}
