import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'
import type { Context } from './context'

const t = initTRPC.context<Context>().create({
  transformer: superjson,
})

export const router = t.router
export const publicProcedure = t.procedure

export const authProcedure = t.procedure.use(async function isAuthed(opts) {
  const { ctx } = opts
  try {
    const authHeader = ctx.req.headers.get('authorization')
    if (!authHeader) throw new Error('authorization required')

    const token = await ctx.jwtVerifier.verify(authHeader)
    const user = await ctx.stores.users.initUser(token)

    return opts.next({
      ctx: {
        auth: token,
        user: user,
      },
    })
  } catch (e: unknown) {
    console.error('auth error', e)
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
})
