import User from '#models/user'
import { getUserStats } from '#services/user_stats'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Úvodní stránka po přihlášení. Administrátor vidí statistiky
 * a naposledy registrované uživatele, běžný uživatel přehled svého účtu.
 */
export default class DashboardController {
  async index({ view, auth }: HttpContext) {
    if (!auth.user!.isAdmin) {
      return view.render('pages/dashboard')
    }

    const [stats, recentUsers] = await Promise.all([
      getUserStats(),
      User.query().orderBy('created_at', 'desc').orderBy('id', 'desc').limit(5),
    ])

    return view.render('pages/dashboard', { stats, recentUsers })
  }
}
