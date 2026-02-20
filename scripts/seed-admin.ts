/**
 * Seed Script: Gottfrieds Admin-Account anlegen
 *
 * Usage: POSTGRES_URL=... npx tsx scripts/seed-admin.ts
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { adminUsers } from '../lib/db/schema';
import { eq } from 'drizzle-orm';
import { hash } from 'bcryptjs';

async function main() {
  const url = process.env.POSTGRES_URL;
  if (!url) {
    console.error('❌ POSTGRES_URL nicht gesetzt');
    process.exit(1);
  }

  const sql = neon(url);
  const db = drizzle(sql, { schema: { adminUsers } });

  const email = 'gottfried@austriaimperial.com';
  const password = 'AiggAdmin2025!';

  // Check if already exists
  const existing = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.email, email),
  });

  if (existing) {
    console.log(`⚠️  Benutzer ${email} existiert bereits (ID: ${existing.id}, Rolle: ${existing.role})`);
    process.exit(0);
  }

  const passwordHash = await hash(password, 12);

  const [user] = await db
    .insert(adminUsers)
    .values({
      email,
      name: 'Gottfried',
      passwordHash,
      role: 'admin',
    })
    .returning({ id: adminUsers.id });

  console.log(`✅ Admin-Benutzer erstellt:`);
  console.log(`   Email: ${email}`);
  console.log(`   Name:  Gottfried`);
  console.log(`   Rolle: admin (voller Zugriff)`);
  console.log(`   ID:    ${user.id}`);
  console.log(`\n⚠️  Passwort bitte nach dem ersten Login ändern!`);
}

main().catch((err) => {
  console.error('❌ Fehler:', err);
  process.exit(1);
});
