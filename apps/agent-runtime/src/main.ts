import { runtimeConfigSchema } from './config.js'
import { createRuntimeServer } from './http-server.js'

const config = runtimeConfigSchema.safeParse(process.env)
if (!config.success) {
  process.stderr.write(
    `Agent Runtime 配置无效：${config.error.issues.map((issue) => issue.path.join('.')).join(', ')}\n`,
  )
  process.exit(1)
}
const runtime = createRuntimeServer(config.data)
runtime.server.listen(config.data.PORT, '0.0.0.0', () =>
  process.stdout.write(`Agent Runtime listening on ${config.data.PORT}\n`),
)
process.on('SIGTERM', runtime.close)
process.on('SIGINT', runtime.close)
