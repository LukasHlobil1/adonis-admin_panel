import { UserSchema } from '#database/schema'
import hash from '@adonisjs/core/services/hash'
import { column } from '@adonisjs/lucid/orm'
import { compose } from '@adonisjs/core/helpers'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'

/**
 * Role, které může uživatel mít.
 */
export const USER_ROLES = ['admin', 'user'] as const
export type UserRole = (typeof USER_ROLES)[number]

/**
 * Model uživatele. Sloupce jsou vygenerovány do `database/schema.ts`
 * (příkazem `node ace migration:run`), zde přidáváme jen chování.
 */
export default class User extends compose(UserSchema, withAuthFinder(hash)) {
  /**
   * SQLite ukládá boolean jako 0/1. `consume` hodnotu při načtení
   * z databáze převede zpět na skutečný boolean.
   */
  @column({ consume: (value: unknown) => Boolean(value) })
  declare isActive: boolean

  /**
   * Je uživatel administrátor?
   */
  get isAdmin() {
    return this.role === 'admin'
  }

  /**
   * Zobrazované jméno – celé jméno, nebo e-mail.
   */
  get displayName() {
    return this.fullName || this.email
  }

  /**
   * Iniciály z celého jména, případně z e-mailu.
   */
  get initials() {
    const [first, last] = this.fullName ? this.fullName.split(' ') : this.email.split('@')
    if (first && last) {
      return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()
    }
    return `${first.slice(0, 2)}`.toUpperCase()
  }
}
