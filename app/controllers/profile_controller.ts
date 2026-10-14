import hash from '@adonisjs/core/services/hash'
import { changePasswordValidator, profileValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Správa vlastního účtu – jméno, e-mail a heslo přihlášeného uživatele.
 */
export default class ProfileController {
  /**
   * Stránka profilu
   */
  async edit({ view }: HttpContext) {
    return view.render('pages/profile/edit')
  }

  /**
   * Uložení jména a e-mailu
   */
  async update({ request, response, session, auth }: HttpContext) {
    const user = auth.user!
    const payload = await request.validateUsing(profileValidator, {
      meta: { userId: user.id },
    })

    user.merge(payload)
    await user.save()

    session.flash('success', 'Profil byl uložen.')
    return response.redirect().toRoute('profile.edit')
  }

  /**
   * Změna hesla – vyžaduje zadání stávajícího hesla
   */
  async updatePassword({ request, response, session, auth }: HttpContext) {
    const user = auth.user!
    const { currentPassword, password } = await request.validateUsing(changePasswordValidator)

    if (!(await hash.verify(user.password, currentPassword))) {
      session.flash('inputErrorsBag', { currentPassword: ['Stávající heslo není správné.'] })
      return response.redirect().back()
    }

    user.password = password
    await user.save()

    session.flash('success', 'Heslo bylo změněno.')
    return response.redirect().toRoute('profile.edit')
  }
}
