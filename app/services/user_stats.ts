import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

/**
 * Pomocné dotazy pro počítání uživatelů (dashboard, ochrana posledního admina).
 */
export async function countUsers(where: Record<string, unknown> = {}) {
  const row = await db.from('users').where(where).count('* as total').first()
  return Number(row?.total ?? 0)
}

export async function countActiveAdmins() {
  return countUsers({ role: 'admin', is_active: true })
}

export async function getUserStats() {
  const weekAgo = DateTime.now().minus({ days: 7 }).toSQL({ includeOffset: false })

  const [total, admins, active, blocked, newThisWeek] = await Promise.all([
    countUsers(),
    countUsers({ role: 'admin' }),
    countUsers({ is_active: true }),
    countUsers({ is_active: false }),
    db
      .from('users')
      .where('created_at', '>=', weekAgo!)
      .count('* as total')
      .first()
      .then((row) => Number(row?.total ?? 0)),
  ])

  return { total, admins, active, blocked, newThisWeek }
}
