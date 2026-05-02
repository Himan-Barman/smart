import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const dbPath = resolve(process.cwd(), 'prisma', 'dev.db');
const journalPath = resolve(process.cwd(), 'prisma', 'dev.db-journal');

if (existsSync(dbPath)) rmSync(dbPath);
if (existsSync(journalPath)) rmSync(journalPath);

execSync('npx prisma db execute --file prisma/init.sql --url "file:./prisma/dev.db"', { stdio: 'inherit' });
execSync('npx prisma db seed', { stdio: 'inherit' });

console.log('Database reset complete.');
