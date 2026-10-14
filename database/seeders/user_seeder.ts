import User from '#models/user'
import { BaseSeeder } from '@adonisjs/lucid/seeders'

/**
 * Naplní databázi výchozím administrátorem a několika ukázkovými uživateli.
 * Spuštění: `node ace db:seed`
 *
 * Seeder je idempotentní – při opakovaném spuštění záznamy podle e-mailu
 * jen aktualizuje, nevytváří duplicity.
 */
export default class extends BaseSeeder {
  async run() {
    await User.updateOrCreateMany('email', [
      {
        fullName: 'Admin Administrátor',
        email: 'admin@example.com',
        password: 'admin1234',
        role: 'admin',
        isActive: true,
      },
      {
        fullName: 'Jana Nováková',
        email: 'jana@example.com',
        password: 'heslo1234',
        role: 'user',
        isActive: true,
      },
      {
        fullName: 'Petr Svoboda',
        email: 'petr@example.com',
        password: 'heslo1234',
        role: 'user',
        isActive: true,
      },
      {
        fullName: 'Eva Dvořáková',
        email: 'eva@example.com',
        password: 'heslo1234',
        role: 'admin',
        isActive: true,
      },
      {
        fullName: 'Karel Zablokovaný',
        email: 'karel@example.com',
        password: 'heslo1234',
        role: 'user',
        isActive: false,
      },
    ])
  }
}
