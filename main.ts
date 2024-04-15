import { Hono, MiddlewareHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { bearerAuth } from 'hono/bearer-auth'

interface Address {
  value: string;
  time: number;
  timeDelta: number;
}

interface SsConfig {
  name: string;
  ip: string;
  port: number | string;
  method: 'aes-128-gcm';
  password: string
}

interface VmessConfig {
  name: string;
  ip: string;
  port: string | number;
  uuid: string;
  alterId: number;
}

const ADDRESS_KEY = 'address'
const token = Deno.env.get('TOKEN')
const ssPassword = Deno.env.get('SS_PASSWORD')
const vmessUuid = Deno.env.get('VMESS_UUID')

if (!token || !vmessUuid) {
  throw new Error('auth or vmess uuid env is need')
}

const kv = await Deno.openKv()

function createSsConfig(config: SsConfig) {
  const password = `${config.method}:${config.password}`
  const name = encodeURIComponent(config.name)
  return `ss://${btoa(password)}@${config.ip}:${config.port}#${name}`
}
  
function createVmessConfig(config: VmessConfig) {
  const subscriptionConfig = {
    "v": "2",
    "ps": "vmess home",
    "add": config.ip,
    "port": String(config.port),
    "id": config.uuid,
    "aid": String(config.alterId),
    "scy": "auto",
    "net": "tcp",
    "type": "none",
    "host": "",
    "path": "",
    "tls": "",
    "sni": "",
    "alpn": "",
    "fp": ""
  }
  return `vmess://${btoa(JSON.stringify(subscriptionConfig))}`
}

const app = new Hono()

function queryAuth(config: { key: string, token: string }): MiddlewareHandler {
  return async (c, next) => {
    const token = c.req.query(config.key)
    if (!token) {
      const res = new Response('Unauthorized', {
        status: 401,
      })
      throw new HTTPException(401, { res })
    }
    await next()
  }
}

function kvKey(id?: string) {
  return id ? [ADDRESS_KEY, id] : [ADDRESS_KEY]
}

app.get('/ddns/subscription', queryAuth({ key: 'token', token }),async c => {
  const id = c.req.query('id')
  const res = await kv.get<Address>(kvKey(id))
  if (!res.value) {
    c.status(500)
    return c.json({ message: 'no content' })
  }

  const [ip, port] = res.value.value.split(':')
  if (c.req.query('type') === 'ss') {
    const config: SsConfig = {
      name: 'ss home',
      ip,
      port,
      method: 'aes-128-gcm',
      password: ssPassword as string,
    }
    return c.text(createSsConfig(config))
  }
  
  return c.text(createVmessConfig({
    name: 'vmess home',
    ip,
    port,
    uuid: vmessUuid,
    alterId: 0
  }))
})

app.use('/ddns/address', bearerAuth({ token }))

app.get('/ddns/address/:id?', async (c) => {
  const id = c.req.param('id')
  const res = await kv.get<Address>(kvKey(id))
  if (!res.value) {
    c.status(500)
    return c.json({ message: 'no content' })
  }
  
  return c.json({ data: res.value })
})

app.post('/ddns/address/:id?', async c => {
  const json = await c.req.json<Pick<Address, 'value'>>()
  const id = c.req.param('id')
  
  const last = await kv.get<Address>(kvKey(id))
  const time = Date.now()
  let timeDelta = 0
  if (last.value) {
    timeDelta = time - last.value.time
    console.log(`address changed after ${Math.floor(timeDelta / 1000)} seconds`)
  }
  const address: Address = {
    value: json.value,
    time, 
    timeDelta,
  }
  await kv.set(kvKey(id), address)
  return c.text('ok')
})

Deno.serve(app.fetch)
