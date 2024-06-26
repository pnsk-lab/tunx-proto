/**
 * Proxy code
 * @module
 */

import type { ResponseInfo } from '../types.ts'
import { Hono } from '@hono/hono'

const app = new Hono()

app.all('/proxy', async (c) => {
  const urlString = c.req.query('url')
  if (!urlString) {
    return c.text('Bad request', 400)
  }
  const url = new URL(urlString)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return c.text('Bad request', 400)
  }

  const headers = new Headers()
  for (const [name, data] of Object.entries(c.req.header())) {
    if (name.startsWith('x-tunx-')) {
      headers.append(name.replace(/^x-tunx-/, ''), data)
    }
  }

  const res = await fetch(url, {
    headers,
    body: c.req.raw.body,
    method: c.req.method,
    redirect: 'manual',
  })

  const responseData: ResponseInfo = {
    status: res.status,
    statusText: res.statusText,
    headers: Object.fromEntries([...res.headers.entries()]),
  }

  const responseStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(
        new TextEncoder().encode(JSON.stringify(responseData) + '\n'),
      )
      if (!res.body) {
        return
      }
      for await (const chunk of res.body) {
        controller.enqueue(chunk)
      }
      controller.close()
    },
  })
  return c.newResponse(responseStream)
})

export const proxy = app
