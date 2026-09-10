import type { Config } from 'drizzle-kit'
import 'dotenv/config'

export default {
  schema:    ['./src/db/schema/users.ts', './src/db/schema/auth.ts', './src/db/schema/skates.ts'],
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
