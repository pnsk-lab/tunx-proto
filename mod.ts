import { parseProxyResponse } from './utils.ts'

/**
 * @example
 * ```ts
 * const fetch = createFetch('https://turnx-api.deno.dev/proxy')
 * ```
 * @module
 */

export const createFetch = (
  proxyUrlInput: string | URL,
  fetchFn?: (req: Request) => Response,
  customHeaders?: HeadersInit
): typeof globalThis.fetch => {
  const proxyUrl = new URL(proxyUrlInput)

  const fetch = fetchFn ?? globalThis.fetch

  let isSupportedReadableUpload = true

  return async (input, options) => {
    const bodyToSend = options?.body ?? ((typeof input === 'object' && 'body' in input) ? input.body : null) ?? null

    const urlToSendProxy = new URL(proxyUrl)
    urlToSendProxy.searchParams.append('url', input instanceof Request ? input.url : input.toString())
    const method = input instanceof Request ? input.method : options?.method

    const headers = new Headers()
    if (input instanceof Request) {
      input.headers.forEach((value, key) => {
        headers.set(`x-tunx-${key}`, value)
      })
      new Headers(customHeaders).forEach((value, key) => {
        headers.set(`x-tunx-${key}`, value)
      })
    }

    if (Array.isArray(options?.headers)) {
      for (const [key, value] of options.headers) {
        headers.set(`x-tunx-${key}`, value)
      }
    } else if (options?.headers && typeof options.headers === 'object') {
      for (const key in options?.headers) {
        const value = options.headers[key as keyof typeof options.headers]
        if (typeof value === 'string') {
          headers.set(`x-tunx-${key}`, value)
        }
      }
    }

    const req = new Request(urlToSendProxy, {
      headers,
      method,
      body: bodyToSend
    })

    let res!: Response
    if (isSupportedReadableUpload) {
      try {
        res = await fetch(req)
      } catch (e) {
        if (e instanceof DOMException && e.message.includes('ReadableStream uploading is not supported')) {
          isSupportedReadableUpload = false
        } else {
          throw e
        }
      }
    }
    if (!isSupportedReadableUpload) {
      res = await fetch(new Request(urlToSendProxy, {
        headers,
        method,
        body: bodyToSend ? await new Response(bodyToSend).blob() : null
      }))
    }

    if (!res.body) {
      throw new TypeError("Proxy didn't send body")
    }
    if (res.status !== 200) {
      throw new TypeError('Proxy didn\'t response 200')
    }

    const { json, body } = await parseProxyResponse(res.body)

    const responseToReturn = new Response(body, {
      headers: json.headers,
      status: json.status,
      statusText: json.statusText
    })

    return responseToReturn
  }
}
