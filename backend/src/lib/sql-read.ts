import pg from 'pg';
import type { QueryResultRow } from 'pg';
import { env } from '../config/env.js';

const { Pool } = pg;

const normalizedDatabaseUrl = (): string => {
  const url = new URL(env.DATABASE_URL);
  url.searchParams.delete('pgbouncer');
  url.searchParams.delete('sslmode');
  return url.toString();
};

const globalForSql = globalThis as unknown as { sqlReadPool?: pg.Pool };

export const sqlReadPool =
  globalForSql.sqlReadPool ??
  new Pool({
    connectionString: normalizedDatabaseUrl(),
    max: 4,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 8_000,
    ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  });

if (env.NODE_ENV !== 'production') {
  globalForSql.sqlReadPool = sqlReadPool;
}

export const queryRows = async <T extends QueryResultRow>(sql: string, params: unknown[] = []): Promise<T[]> => {
  const result = await sqlReadPool.query<T>(sql, params);
  return result.rows;
};
