import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

/**
 * Pomocné dotazy pro počítání uživatelů (dashboard, ochrana posledního admina).
 */
export async function countUsers(where: Record<string, string | number | boolean> = {}) {
  const query = db.from('users')
  for (const [column, value] of Object.entries(where)) {
    query.where(column, value)
  }
  const row = await query.count('* as total').first()
  return Number(row?.total ?? 0)
}

export async function countActiveAdmins() {
  return countUsers({ role: 'admin', is_active: true })
}

export async function getUserStats() {
  // stejný formát, v jakém Lucid ukládá datum do SQLite
  const weekAgo = DateTime.now().minus({ days: 7 }).toFormat('yyyy-MM-dd HH:mm:ss')

  const [total, admins, active, blocked, newThisWeek] = await Promise.all([
    countUsers(),
    countUsers({ role: 'admin' }),
    countUsers({ is_active: true }),
    countUsers({ is_active: false }),
    db
      .from('users')
      .where('created_at', '>=', weekAgo)
      .count('* as total')
      .first()
      .then((row) => Number(row?.total ?? 0)),
  ])

  return { total, admins, active, blocked, newThisWeek }
}
