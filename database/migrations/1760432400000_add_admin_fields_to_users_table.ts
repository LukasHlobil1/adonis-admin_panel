import { BaseSchema } from '@adonisjs/lucid/schema'

/**
 * Přidá do tabulky "users" sloupce potřebné pro administraci:
 *  - role          → 'admin' | 'user'
 *  - is_active     → zablokovaný uživatel se nemůže přihlásit
 *  - last_login_at → čas posledního přihlášení
 */
export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('role', 20).notNullable().defaultTo('user')
      table.boolean('is_active').notNullable().defaultTo(true)
      table.timestamp('last_login_at').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('role')
      table.dropColumn('is_active')
      table.dropColumn('last_login_at')
    })
  }
}
