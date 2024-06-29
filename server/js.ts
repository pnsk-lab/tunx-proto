import { build, initialize } from 'esbuild-wasm'
import { Hono } from '@hono/hono'
import { HTTPException } from '@hono/hono/http-exception'
import { generateRandomVarName } from '../utils.ts'
import { REPLACES } from './js/globals.ts'

await initialize({
  worker: false,
  //wasmURL: 'https://cdn.jsdelivr.net/npm/esbuild-wasm/esbuild.wasm'
})

export const jsApp = new Hono()
  .get('/js', async (c) => {
    const url = c.req.query('url')
    if (!url) {
      throw new HTTPException(400)
    }
    const inputCode = await (await fetch(url)).text()

    c.header('Content-Type', 'text/javascript')

    const fakeGlobalSymbol = generateRandomVarName()
    const built = await build({
      stdin: {
        contents: inputCode,
        sourcefile: 'input.ts',
        loader: 'js',
      },
      format: 'esm',
      write: false,
      define: Object.fromEntries(REPLACES.map(replace => [replace, `${fakeGlobalSymbol}.${replace}`]))
    })
  
    if (!built.outputFiles) {
      return c.body('throw new Error("Unable to compile JS in proxy")')
    }
    const replacesCode = await Deno.readTextFile('server/js/replaces.js')

    const output = `var ${fakeGlobalSymbol} = ${replacesCode};\n${built.outputFiles[0].text}`
    return c.body(output)
  })
