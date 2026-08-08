// @ts-nocheck
/// <reference types="vite/client" />
import { dynamic } from 'fumadocs-mdx/runtime/dynamic'
import * as Config from '../source.config'

await dynamic<
  typeof Config,
  import('fumadocs-mdx/runtime/types').InternalTypeConfig & {
    DocData: {}
  }
>(Config, { environment: 'dynamic', root: '', configPath: 'source.config.ts', outDir: '.source' })
