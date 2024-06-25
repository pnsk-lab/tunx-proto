import type { ResponseInfo } from './types.ts'

export const parseProxyResponse = async (
  stream: ReadableStream<Uint8Array>,
): Promise<{
  json: ResponseInfo
  body: ReadableStream<Uint8Array>
}> => {
  const reader = stream.getReader()

  let beforeText: string = ''

  let firstBody: Uint8Array
  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }
    if (!value) {
      continue
    }
    const lineBreakIndex = value.indexOf(10)
    if (lineBreakIndex === -1) {
      beforeText += new TextDecoder().decode(value)
    } else {
      beforeText += new TextDecoder().decode(value.slice(0, lineBreakIndex))
      firstBody = value.slice(lineBreakIndex + 1)
      break
    }
  }
  return {
    json: JSON.parse(beforeText),
    body: new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(firstBody)
        while (true) {
          const { done, value } = await reader.read()
          if (value) {
            controller.enqueue(value)
          }
          if (done) {
            controller.close()
          }
        }
      },
    }),
  }
}
