import { parseArgs } from 'node:util'
import path from 'path'

import { sayHiFromJtoarSdk } from '@jtoar/sdk'
import chalk from 'chalk'
import { config } from 'dotenv-defaults'
import Fastify from 'fastify'

import {
  coerceRootPath,
  redwoodFastifyWeb,
  redwoodFastifyAPI,
  // redwoodFastifyGraphQLServer,
  DEFAULT_REDWOOD_FASTIFY_CONFIG,
} from '@redwoodjs/fastify'
import { getPaths, getConfig } from '@redwoodjs/project-config'

// import directives from 'src/directives/**/*.{js,ts}'
// import sdls from 'src/graphql/**/*.sdl.{js,ts}'
// import services from 'src/services/**/*.{js,ts}'

// Import if using RedwoodJS Realtime and subscriptions
// import subscriptions from 'src/subscriptions/**/*.{js,ts}'

// Import if using RedwoodJS authentication
// import { authDecoder } from '@redwoodjs/<your-auth-provider>'
// import { getCurrentUser } from 'src/lib/auth'
// import { logger } from './lib/logger'

// Import if using RedwoodJS Realtime via `yarn rw exp setup-realtime`
// import { pubSub, liveQueryStore } from './lib/realtime'

console.log(sayHiFromJtoarSdk())

async function serve() {
  // Parse server file args
  const { values: args } = parseArgs({
    options: {
      ['enable-web']: {
        type: 'boolean',
        default: false,
      },
    },
  })
  const { ['enable-web']: enableWeb } = args

  // Load .env files
  const redwoodProjectPaths = getPaths()
  const redwoodConfig = getConfig()

  const apiRootPath = enableWeb ? coerceRootPath(redwoodConfig.web.apiUrl) : ''
  const port = enableWeb ? redwoodConfig.web.port : redwoodConfig.api.port

  const tsServer = Date.now()

  config({
    path: path.join(redwoodProjectPaths.base, '.env'),
    defaults: path.join(redwoodProjectPaths.base, '.env.defaults'),
    multiline: true,
  })

  console.log(chalk.italic.dim('Starting API and Web Servers...'))

  // Configure Fastify
  const fastify = Fastify({
    ...DEFAULT_REDWOOD_FASTIFY_CONFIG,
  })

  if (enableWeb) {
    await fastify.register(redwoodFastifyWeb)
  }

  await fastify.register(redwoodFastifyAPI, {
    redwood: {
      apiRootPath,
    },
  })

  // await fastify.register(redwoodFastifyGraphQLServer, {
  //   // If authenticating, be sure to import and add in
  //   // authDecoder,
  //   // getCurrentUser,
  //   loggerConfig: {
  //     logger: logger,
  //   },
  //   graphiQLEndpoint: enableWeb ? '/.redwood/functions/graphql' : '/graphql',
  //   sdls,
  //   services,
  //   directives,
  //   allowIntrospection: true,
  //   allowGraphiQL: true,
  //   // Configure if using RedwoodJS Realtime via `yarn rw exp setup-realtime`
  //   // realtime: {
  //   //   subscriptions: { subscriptions, pubSub },
  //   //   liveQueries: { liveQueryStore },
  //   // },
  // })

  // Start
  fastify.listen({ port })

  fastify.ready(() => {
    console.log(chalk.italic.dim('Took ' + (Date.now() - tsServer) + ' ms'))
    const on = chalk.magenta(`http://localhost:${port}${apiRootPath}`)
    if (enableWeb) {
      const webServer = chalk.green(`http://localhost:${port}`)
      console.log(`Web server started on ${webServer}`)
    }
    const apiServer = chalk.magenta(`http://localhost:${port}`)
    console.log(`API serving from ${apiServer}`)
    console.log(`API listening on ${on}`)
    const graphqlEnd = chalk.magenta(`${apiRootPath}graphql`)
    console.log(`GraphQL function endpoint at ${graphqlEnd}`)
  })

  // process.on('exit', async () => {
  //   await fastify.close()
  // })

  // Vite recommends doing this for tree-shaking, but not sure if it applies here...
  // See https://vitejs.dev/guide/api-hmr.html#required-conditional-guard.
  //
  // This only works in ESM.
  //
  // @ts-expect-error This is for vite-node.
  if (import.meta.hot) {
    // See https://github.com/vitest-dev/vitest/issues/2334#issuecomment-1322180877.
    //
    // @ts-expect-error This is for vite-node.
    import.meta.hot.on("vite:beforeFullReload", async () => {
      await fastify.close()
    });
  }
}

serve()
