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
): typeof globalThis.fetch => {
  const proxyUrl = new URL(proxyUrlInput)

  const fetch = fetchFn ?? globalThis.fetch

  return async (input, options) => {
    const userRequest = new Request(input, options)
    const bodyToSend = options?.body ?? ((typeof input === 'object' && 'body' in input) ? input.body : null) ?? null

    const urlToSendProxy = new URL(proxyUrl)
    urlToSendProxy.searchParams.append('url', userRequest.url)

    const headers = new Headers()
    userRequest.headers.forEach((value, key) => {
      headers.set(`x-tunx-${key}`, value)
    })
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
      method: userRequest.method,
      body: bodyToSend
    })

    const res = await fetch(req)

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
