import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Pustí dál pouze přihlášené administrátory.
 *
 * Middleware musí běžet AŽ ZA middlewarem `auth`, který zajistí,
 * že `ctx.auth.user` existuje.
 */
export default class AdminMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.user

    if (!user || !user.isAdmin) {
      ctx.session.flash('error', 'Do administrace mají přístup pouze administrátoři.')
      return ctx.response.redirect().toRoute('dashboard')
    }

    return next()
  }
}
