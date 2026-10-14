import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Pokud administrátor zablokuje uživatele, který je zrovna přihlášený,
 * tento middleware ho při dalším požadavku odhlásí.
 *
 * Běží AŽ ZA middlewarem `auth`.
 */
export default class ActiveUserMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const user = ctx.auth.user

    if (user && !user.isActive) {
      await ctx.auth.use('web').logout()
      ctx.session.flash('error', 'Váš účet byl zablokován administrátorem.')
      return ctx.response.redirect().toRoute('session.create')
    }

    return next()
  }
}
