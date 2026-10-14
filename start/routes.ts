/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import { controllers } from '#generated/controllers'
import router from '@adonisjs/core/services/router'

router.on('/').render('pages/home').as('home')

/**
 * Přihlášení a registrace – jen pro nepřihlášené
 */
router
  .group(() => {
    router.get('signup', [controllers.NewAccount, 'create'])
    router.post('signup', [controllers.NewAccount, 'store'])

    router.get('login', [controllers.Session, 'create'])
    router.post('login', [controllers.Session, 'store'])
  })
  .use(middleware.guest())

/**
 * Sekce pro přihlášené uživatele
 */
router
  .group(() => {
    router.get('dashboard', [controllers.Dashboard, 'index']).as('dashboard')
    router.post('logout', [controllers.Session, 'destroy'])

    router.get('profile', [controllers.Profile, 'edit']).as('profile.edit')
    router.put('profile', [controllers.Profile, 'update']).as('profile.update')
    router
      .put('profile/password', [controllers.Profile, 'updatePassword'])
      .as('profile.password')
  })
  .use([middleware.auth(), middleware.activeUser()])

/**
 * Administrace uživatelů – jen pro administrátory
 */
router
  .group(() => {
    router.get('users', [controllers.admin.Users, 'index']).as('admin.users.index')
    router.get('users/create', [controllers.admin.Users, 'create']).as('admin.users.create')
    router.post('users', [controllers.admin.Users, 'store']).as('admin.users.store')
    router.get('users/:id/edit', [controllers.admin.Users, 'edit']).as('admin.users.edit')
    router.put('users/:id', [controllers.admin.Users, 'update']).as('admin.users.update')
    router
      .patch('users/:id/status', [controllers.admin.Users, 'toggleStatus'])
      .as('admin.users.toggle_status')
    router.delete('users/:id', [controllers.admin.Users, 'destroy']).as('admin.users.destroy')
  })
  .prefix('admin')
  .where('id', router.matchers.number())
  .use([middleware.auth(), middleware.activeUser(), middleware.admin()])
