import User from '#models/user'
import { DateTime } from 'luxon'
import { signupValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * NewAccountController handles user registration.
 * It provides methods for displaying the signup page and creating
 * new user accounts.
 */
export default class NewAccountController {
  /**
   * Display the signup page
   */
  async create({ view }: HttpContext) {
    return view.render('pages/auth/signup')
  }

  /**
   * Create a new user account and authenticate the user
   */
  async store({ request, response, auth }: HttpContext) {
    const { fullName, email, password } = await request.validateUsing(signupValidator)

    /**
     * První registrovaný uživatel v prázdné databázi se stane administrátorem,
     * aby šlo aplikaci používat i bez spuštění seederu.
     */
    const isFirstUser = !(await User.query().select('id').first())

    const user = await User.create({
      fullName,
      email,
      password,
      role: isFirstUser ? 'admin' : 'user',
      isActive: true,
      lastLoginAt: DateTime.now(),
    })

    await auth.use('web').login(user)
    response.redirect().toRoute('dashboard')
  }
}
