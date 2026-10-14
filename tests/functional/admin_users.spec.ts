import { test } from '@japa/runner'
import User from '#models/user'
import testUtils from '@adonisjs/core/services/test_utils'

/**
 * Pomocná funkce pro vytvoření uživatele v testech
 */
function createUser(attributes: Partial<{
  fullName: string
  email: string
  password: string
  role: 'admin' | 'user'
  isActive: boolean
}> = {}) {
  return User.create({
    fullName: 'Testovací Uživatel',
    email: `user-${Math.random().toString(36).slice(2, 8)}@example.com`,
    password: 'heslo1234',
    role: 'user',
    isActive: true,
    ...attributes,
  })
}

test.group('Administrace uživatelů – přístup', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('nepřihlášený uživatel je přesměrován na přihlášení', async ({ client }) => {
    const response = await client.get('/admin/users').redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('běžný uživatel nemá přístup do administrace', async ({ client }) => {
    const user = await createUser()
    const response = await client.get('/admin/users').loginAs(user).redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/dashboard')
  })

  test('administrátor vidí seznam uživatelů', async ({ client }) => {
    const admin = await createUser({ role: 'admin' })
    const jana = await createUser({ fullName: 'Jana Nováková', email: 'jana@example.com' })

    const response = await client.get('/admin/users').loginAs(admin)

    response.assertStatus(200)
    response.assertTextIncludes(jana.email)
    response.assertTextIncludes('Jana Nováková')
  })

  test('vyhledávání filtruje seznam', async ({ client, assert }) => {
    const admin = await createUser({ role: 'admin' })
    await createUser({ email: 'jana@example.com' })
    await createUser({ email: 'petr@example.com' })

    const response = await client.get('/admin/users').qs({ search: 'jana' }).loginAs(admin)

    response.assertStatus(200)
    response.assertTextIncludes('jana@example.com')
    assert.notInclude(response.text(), 'petr@example.com')
  })
})

test.group('Administrace uživatelů – změny', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('administrátor vytvoří nového uživatele', async ({ client, assert }) => {
    const admin = await createUser({ role: 'admin' })

    const response = await client
      .post('/admin/users')
      .form({
        fullName: 'Nový Uživatel',
        email: 'novy@example.com',
        role: 'user',
        isActive: 'on',
        password: 'tajneheslo',
        passwordConfirmation: 'tajneheslo',
      })
      .withCsrfToken()
      .loginAs(admin)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/admin/users')

    const user = await User.findByOrFail('email', 'novy@example.com')
    assert.equal(user.role, 'user')
    assert.isTrue(user.isActive)
    assert.notEqual(user.password, 'tajneheslo', 'heslo musí být uložené jako hash')
  })

  test('nelze vytvořit uživatele s již použitým e-mailem', async ({ client, assert }) => {
    const admin = await createUser({ role: 'admin' })
    await createUser({ email: 'obsazeny@example.com' })

    await client
      .post('/admin/users')
      .form({
        email: 'obsazeny@example.com',
        role: 'user',
        password: 'tajneheslo',
        passwordConfirmation: 'tajneheslo',
      })
      .withCsrfToken()
      .loginAs(admin)
      .redirects(0)

    const users = await User.query().where('email', 'obsazeny@example.com')
    assert.lengthOf(users, 1)
  })

  test('administrátor upraví uživatele a prázdné heslo nemění', async ({ client, assert }) => {
    const admin = await createUser({ role: 'admin' })
    const user = await createUser({ email: 'upravit@example.com' })
    const originalHash = user.password

    const response = await client
      .put(`/admin/users/${user.id}`)
      .form({
        fullName: 'Přejmenovaný',
        email: 'upravit@example.com',
        role: 'admin',
        isActive: 'on',
        password: '',
      })
      .withCsrfToken()
      .loginAs(admin)
      .redirects(0)

    response.assertStatus(302)

    await user.refresh()
    assert.equal(user.fullName, 'Přejmenovaný')
    assert.equal(user.role, 'admin')
    assert.equal(user.password, originalHash)
  })

  test('zablokovaný uživatel se nemůže přihlásit', async ({ client, assert }) => {
    const admin = await createUser({ role: 'admin' })
    const user = await createUser({ email: 'blokovany@example.com', password: 'heslo1234' })

    await client
      .patch(`/admin/users/${user.id}/status`)
      .withCsrfToken()
      .loginAs(admin)
      .redirects(0)

    await user.refresh()
    assert.isFalse(user.isActive)

    const login = await client
      .post('/login')
      .form({ email: 'blokovany@example.com', password: 'heslo1234' })
      .withCsrfToken()
      .redirects(0)

    login.assertStatus(302)
    assert.notEqual(login.header('location'), '/dashboard')
  })

  test('administrátor nemůže smazat ani zablokovat sám sebe', async ({ client, assert }) => {
    const admin = await createUser({ role: 'admin' })

    await client.delete(`/admin/users/${admin.id}`).withCsrfToken().loginAs(admin).redirects(0)
    await client
      .patch(`/admin/users/${admin.id}/status`)
      .withCsrfToken()
      .loginAs(admin)
      .redirects(0)

    await admin.refresh()
    assert.isTrue(admin.isActive)
    assert.isNotNull(await User.find(admin.id))
  })

  test('administrátor smaže jiného uživatele', async ({ client, assert }) => {
    const admin = await createUser({ role: 'admin' })
    const user = await createUser()

    const response = await client
      .delete(`/admin/users/${user.id}`)
      .withCsrfToken()
      .loginAs(admin)
      .redirects(0)

    response.assertStatus(302)
    assert.isNull(await User.find(user.id))
  })
})

test.group('Registrace', (group) => {
  group.each.setup(() => testUtils.db().withGlobalTransaction())

  test('první registrovaný uživatel se stane administrátorem', async ({ client, assert }) => {
    await User.query().delete()

    await client
      .post('/signup')
      .form({
        fullName: 'První Uživatel',
        email: 'prvni@example.com',
        password: 'heslo1234',
        passwordConfirmation: 'heslo1234',
      })
      .withCsrfToken()
      .redirects(0)

    const user = await User.findByOrFail('email', 'prvni@example.com')
    assert.equal(user.role, 'admin')
  })
})
