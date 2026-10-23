import type { Config } from 'drizzle-kit'
import 'dotenv/config'

export default {
  schema:    ['./src/db/schema/users.ts', './src/db/schema/auth.ts', './src/db/schema/skates.ts', './src/db/schema/customers.ts', './src/db/schema/settings.ts', './src/db/schema/rentals.ts', './src/db/schema/rental_items.ts', './src/db/schema/rental_item_extensions.ts', './src/db/schema/payments.ts', './src/db/schema/inspections.ts', './src/db/schema/damages.ts', './src/db/schema/maintenance.ts', './src/db/schema/reservations.ts', './src/db/schema/products.ts', './src/db/schema/sales.ts', './src/db/schema/treasury.ts', './src/db/schema/subtreasury.ts', './src/db/schema/sequences.ts', './src/db/schema/audit.ts'],
  out:       './src/db/migrations',
  dialect:   'mysql',
  dbCredentials: {
    host:     process.env.DB_HOST     ?? 'localhost',
    port:     parseInt(process.env.DB_PORT ?? '3306', 10),
    database: process.env.DB_NAME     ?? 'koshk_skate',
    user:     process.env.DB_USER     ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
  },
} satisfies Config
