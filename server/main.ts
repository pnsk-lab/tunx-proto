import { Hono } from '@hono/hono'
import { cors } from '@hono/hono/cors'
import { proxy } from './proxy.ts'
//import { jsApp } from './js.ts'

const app = new Hono()

app.use(cors())

app.route('/', proxy)
//app.route('/', jsApp)

Deno.serve(app.fetch)
