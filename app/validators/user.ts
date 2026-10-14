import vine from '@vinejs/vine'
import { USER_ROLES } from '#models/user'

/**
 * Sdílená pravidla pro e-mail, jméno a heslo.
 */
const email = () => vine.string().trim().email().maxLength(254)
const password = () => vine.string().minLength(8).maxLength(32)
const fullName = () => vine.string().trim().maxLength(100).nullable()

/**
 * Registrace nového účtu (veřejný formulář /signup)
 */
export const signupValidator = vine.create({
  fullName: fullName(),
  email: email().unique({ table: 'users', column: 'email' }),
  password: password(),
  passwordConfirmation: password().sameAs('password'),
})

/**
 * Přihlášení
 */
export const loginValidator = vine.create({
  email: email(),
  password: vine.string(),
})

/**
 * Administrace: vytvoření nového uživatele administrátorem
 */
export const adminCreateUserValidator = vine.create({
  fullName: fullName(),
  email: email().unique({ table: 'users', column: 'email' }),
  role: vine.enum(USER_ROLES),
  isActive: vine.boolean().optional(),
  password: password(),
  passwordConfirmation: password().sameAs('password'),
})

/**
 * Administrace: úprava existujícího uživatele.
 *
 * Unikátnost e-mailu kontrolujeme mimo upravovaného uživatele – jeho ID
 * předáváme jako metadata: request.validateUsing(validator, { meta: { userId } })
 * Heslo je nepovinné – prázdné pole znamená „heslo neměnit“.
 */
export const adminUpdateUserValidator = vine.withMetaData<{ userId: number }>().create({
  fullName: fullName(),
  email: email().unique({
    table: 'users',
    column: 'email',
    filter: (query, _value, field) => {
      query.whereNot('id', field.meta.userId)
    },
  }),
  role: vine.enum(USER_ROLES),
  isActive: vine.boolean().optional(),
  password: password().nullable(),
})

/**
 * Profil: úprava vlastního jména a e-mailu
 */
export const profileValidator = vine.withMetaData<{ userId: number }>().create({
  fullName: fullName(),
  email: email().unique({
    table: 'users',
    column: 'email',
    filter: (query, _value, field) => {
      query.whereNot('id', field.meta.userId)
    },
  }),
})

/**
 * Profil: změna vlastního hesla
 */
export const changePasswordValidator = vine.create({
  currentPassword: vine.string(),
  password: password(),
  passwordConfirmation: password().sameAs('password'),
})
