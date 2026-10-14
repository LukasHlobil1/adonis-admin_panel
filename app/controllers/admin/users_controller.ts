import User, { USER_ROLES } from '#models/user'
import { countActiveAdmins, getUserStats } from '#services/user_stats'
import { adminCreateUserValidator, adminUpdateUserValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'

/**
 * Sloupce, podle kterých lze v seznamu řadit.
 * (whitelist – hodnotu z URL nikdy nepředáváme do SQL přímo)
 */
const SORTABLE_COLUMNS = {
  name: 'full_name',
  email: 'email',
  role: 'role',
  created: 'created_at',
  lastLogin: 'last_login_at',
} as const

type SortKey = keyof typeof SORTABLE_COLUMNS

const PER_PAGE = 10

/**
 * Administrace uživatelů – výpis, vytvoření, úprava, blokace a smazání.
 * Všechny routy jsou chráněné middlewarem `auth` + `admin`.
 */
export default class UsersController {
  /**
   * Seznam uživatelů s vyhledáváním, filtry, řazením a stránkováním
   */
  async index({ request, view }: HttpContext) {
    const page = Math.max(Number(request.input('page', 1)) || 1, 1)
    const search = String(request.input('search') ?? '').trim()
    const role = String(request.input('role') ?? '')
    const status = String(request.input('status') ?? '')

    const sortParam = String(request.input('sort') ?? 'created')
    const sort: SortKey = sortParam in SORTABLE_COLUMNS ? (sortParam as SortKey) : 'created'
    const direction = request.input('direction') === 'asc' ? 'asc' : 'desc'

    const query = User.query()

    if (search) {
      query.where((q) => {
        q.whereLike('email', `%${search}%`).orWhereLike('full_name', `%${search}%`)
      })
    }

    if ((USER_ROLES as readonly string[]).includes(role)) {
      query.where('role', role)
    }

    if (status === 'active') {
      query.where('is_active', true)
    } else if (status === 'blocked') {
      query.where('is_active', false)
    }

    const users = await query
      .orderBy(SORTABLE_COLUMNS[sort], direction)
      .orderBy('id', 'desc')
      .paginate(page, PER_PAGE)

    const filters = { search, role, status, sort, direction }

    users.baseUrl(request.url()).queryString({ search, role, status, sort, direction })

    return view.render('pages/admin/users/index', {
      users,
      filters,
      stats: await getUserStats(),
      roles: USER_ROLES,
    })
  }

  /**
   * Formulář pro vytvoření uživatele
   */
  async create({ view }: HttpContext) {
    return view.render('pages/admin/users/create', { roles: USER_ROLES })
  }

  /**
   * Uložení nového uživatele
   */
  async store({ request, response, session }: HttpContext) {
    const payload = await request.validateUsing(adminCreateUserValidator)

    const user = await User.create({
      fullName: payload.fullName,
      email: payload.email,
      password: payload.password,
      role: payload.role,
      isActive: payload.isActive ?? false,
    })

    session.flash('success', `Uživatel ${user.displayName} byl vytvořen.`)
    return response.redirect().toRoute('admin.users.index')
  }

  /**
   * Formulář pro úpravu uživatele
   */
  async edit({ params, view }: HttpContext) {
    const user = await User.findOrFail(params.id)
    return view.render('pages/admin/users/edit', { user, roles: USER_ROLES })
  }

  /**
   * Uložení změn uživatele
   */
  async update({ params, request, response, session, auth }: HttpContext) {
    const user = await User.findOrFail(params.id)
    const payload = await request.validateUsing(adminUpdateUserValidator, {
      meta: { userId: user.id },
    })

    const isActive = payload.isActive ?? false
    const isSelf = user.id === auth.user!.id

    /**
     * Administrátor si nesmí sám odebrat práva ani zablokovat účet –
     * jinak by se mohl odříznout od administrace.
     */
    if (isSelf && (payload.role !== 'admin' || !isActive)) {
      session.flash('error', 'Sami sobě nemůžete odebrat administrátorská práva ani zablokovat účet.')
      return response.redirect().back()
    }

    /**
     * V systému musí vždy zůstat alespoň jeden aktivní administrátor.
     */
    const losesAdmin = user.isAdmin && user.isActive && (payload.role !== 'admin' || !isActive)
    if (losesAdmin && (await countActiveAdmins()) <= 1) {
      session.flash('error', 'V systému musí zůstat alespoň jeden aktivní administrátor.')
      return response.redirect().back()
    }

    user.merge({
      fullName: payload.fullName,
      email: payload.email,
      role: payload.role,
      isActive,
    })

    if (payload.password) {
      user.password = payload.password
    }

    await user.save()

    session.flash('success', `Změny uživatele ${user.displayName} byly uloženy.`)
    return response.redirect().toRoute('admin.users.index')
  }

  /**
   * Zablokování / odblokování uživatele jedním kliknutím
   */
  async toggleStatus({ params, response, session, auth }: HttpContext) {
    const user = await User.findOrFail(params.id)

    if (user.id === auth.user!.id) {
      session.flash('error', 'Nemůžete zablokovat sami sebe.')
      return response.redirect().back()
    }

    if (user.isAdmin && user.isActive && (await countActiveAdmins()) <= 1) {
      session.flash('error', 'Posledního aktivního administrátora nelze zablokovat.')
      return response.redirect().back()
    }

    user.isActive = !user.isActive
    await user.save()

    session.flash(
      'success',
      user.isActive
        ? `Uživatel ${user.displayName} byl odblokován.`
        : `Uživatel ${user.displayName} byl zablokován.`
    )
    return response.redirect().back()
  }

  /**
   * Smazání uživatele
   */
  async destroy({ params, response, session, auth }: HttpContext) {
    const user = await User.findOrFail(params.id)

    if (user.id === auth.user!.id) {
      session.flash('error', 'Nemůžete smazat svůj vlastní účet.')
      return response.redirect().back()
    }

    if (user.isAdmin && user.isActive && (await countActiveAdmins()) <= 1) {
      session.flash('error', 'Posledního aktivního administrátora nelze smazat.')
      return response.redirect().back()
    }

    await user.delete()

    session.flash('success', `Uživatel ${user.displayName} byl smazán.`)
    return response.redirect().toRoute('admin.users.index')
  }
}
