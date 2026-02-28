/**
 * Admin Producer Management API
 *
 * GET   /api/admin/producers — List all producers with product counts (admin only)
 * POST  /api/admin/producers — Create new producer / onboard (admin only)
 * PATCH /api/admin/producers — Update existing producer (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/admin';
import { db, dbPool } from '@/lib/db/drizzle';
import { producers, products, auditLog } from '@/lib/db/schema';
import { eq, sql, count } from 'drizzle-orm';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// ─── Slug validation regex ────────────────────
const SLUG_REGEX = /^[a-z][a-z0-9_-]{1,48}$/;

// ─── GET: List all producers with product counts ────────────────

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
  }

  // Fetch all producers (including inactive)
  const allProducers = await db.query.producers.findMany({
    orderBy: (p, { asc }) => [asc(p.sortOrder), asc(p.id)],
  });

  // Get product counts per producer slug
  const productCounts = await db
    .select({
      producer: products.producer,
      count: count(),
    })
    .from(products)
    .groupBy(products.producer);

  // Build a map slug -> count
  const countMap: Record<string, number> = {};
  for (const row of productCounts) {
    countMap[row.producer] = row.count;
  }

  // Attach product counts
  const producersWithCounts = allProducers.map((p) => ({
    ...p,
    productCount: countMap[p.slug] ?? 0,
  }));

  return NextResponse.json({ producers: producersWithCounts });
}

// ─── POST: Create new producer (onboarding) ──────────────

const createSchema = z.object({
  slug: z
    .string()
    .min(2, 'Slug muss mindestens 2 Zeichen haben')
    .max(50, 'Slug darf maximal 50 Zeichen haben')
    .regex(SLUG_REGEX, 'Slug muss mit Kleinbuchstabe beginnen und darf nur a-z, 0-9, - und _ enthalten'),
  displayName: z.string().min(1, 'Anzeigename ist Pflicht'),
  displayNameDe: z.string().min(1, 'Deutscher Anzeigename ist Pflicht'),
  displayNameEn: z.string().min(1, 'Englischer Anzeigename ist Pflicht'),
  displayNameAr: z.string().nullable().optional(),
  contactEmail: z.string().email('Ungueltige E-Mail').nullable().optional(),
  mode: z.enum(['api', 'email']).default('email'),
  apiUrl: z.string().url('Ungueltige URL').nullable().optional(),
  apiKey: z.string().nullable().optional(),
  airtableTableName: z.string().nullable().optional(),
  commissionPercent: z.union([z.string(), z.number()]).optional().default('0'),
  logoUrl: z.string().nullable().optional(),
  descriptionDe: z.string().nullable().optional(),
  descriptionEn: z.string().nullable().optional(),
  descriptionAr: z.string().nullable().optional(),
});

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Ungueltige Eingabe', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { slug } = parsed.data;

  // Double-check slug regex before using sql.raw()
  if (!SLUG_REGEX.test(slug)) {
    return NextResponse.json(
      { error: 'Ungueltiger Slug' },
      { status: 400 },
    );
  }

  // Check slug uniqueness in producers table
  const existing = await db.query.producers.findFirst({
    where: eq(producers.slug, slug),
  });

  if (existing) {
    return NextResponse.json(
      { error: 'Slug bereits vergeben' },
      { status: 409 },
    );
  }

  // Step 1: ALTER TYPE producer ADD VALUE IF NOT EXISTS
  // IMPORTANT: This CANNOT run inside a transaction!
  // Use sql.raw() for the slug value since parameterized queries don't work with ALTER TYPE.
  // The slug has already been validated with regex above to prevent SQL injection.
  try {
    await dbPool.execute(
      sql`ALTER TYPE producer ADD VALUE IF NOT EXISTS ${sql.raw(`'${slug}'`)}`
    );
  } catch (alterErr) {
    console.error('ALTER TYPE producer failed:', alterErr);
    return NextResponse.json(
      { error: 'PostgreSQL-Enum konnte nicht erweitert werden', detail: String(alterErr) },
      { status: 500 },
    );
  }

  // Step 2: INSERT into producers table
  try {
    const commissionStr = String(parsed.data.commissionPercent);

    const [newProducer] = await db
      .insert(producers)
      .values({
        slug,
        displayName: parsed.data.displayName,
        displayNameDe: parsed.data.displayNameDe,
        displayNameEn: parsed.data.displayNameEn,
        displayNameAr: parsed.data.displayNameAr ?? null,
        contactEmail: parsed.data.contactEmail ?? null,
        mode: parsed.data.mode,
        apiUrl: parsed.data.apiUrl ?? null,
        apiKeyEncrypted: parsed.data.apiKey ?? null, // TODO: encrypt before storing
        airtableTableName: parsed.data.airtableTableName ?? null,
        commissionPercent: commissionStr,
        logoUrl: parsed.data.logoUrl ?? null,
        descriptionDe: parsed.data.descriptionDe ?? null,
        descriptionEn: parsed.data.descriptionEn ?? null,
        descriptionAr: parsed.data.descriptionAr ?? null,
      })
      .returning();

    // Step 3: Audit log
    await db.insert(auditLog).values({
      entityType: 'producer',
      entityId: newProducer.id,
      action: 'create',
      newValues: {
        slug,
        displayName: parsed.data.displayName,
        mode: parsed.data.mode,
        contactEmail: parsed.data.contactEmail ?? null,
      },
      performedBy: session.email,
    });

    return NextResponse.json(
      { success: true, producer: newProducer },
      { status: 201 },
    );
  } catch (insertErr) {
    console.error('Producer INSERT failed:', insertErr);
    return NextResponse.json(
      { error: 'Produzent konnte nicht erstellt werden', detail: String(insertErr) },
      { status: 500 },
    );
  }
}

// ─── PATCH: Update existing producer ──────────────

const updateSchema = z.object({
  id: z.number().int().positive('ID ist Pflicht'),
  displayName: z.string().min(1).optional(),
  displayNameDe: z.string().min(1).optional(),
  displayNameEn: z.string().min(1).optional(),
  displayNameAr: z.string().nullable().optional(),
  contactEmail: z.string().email('Ungueltige E-Mail').nullable().optional(),
  mode: z.enum(['api', 'email']).optional(),
  apiUrl: z.string().url('Ungueltige URL').nullable().optional(),
  apiKey: z.string().nullable().optional(),
  airtableTableName: z.string().nullable().optional(),
  commissionPercent: z.union([z.string(), z.number()]).optional(),
  logoUrl: z.string().nullable().optional(),
  descriptionDe: z.string().nullable().optional(),
  descriptionEn: z.string().nullable().optional(),
  descriptionAr: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Ungueltige Eingabe', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id, ...fields } = parsed.data;

  // Verify producer exists
  const existing = await db.query.producers.findFirst({
    where: eq(producers.id, id),
  });

  if (!existing) {
    return NextResponse.json(
      { error: 'Produzent nicht gefunden' },
      { status: 404 },
    );
  }

  // Build update object
  const updateData: Record<string, unknown> = {};
  if (fields.displayName !== undefined) updateData.displayName = fields.displayName;
  if (fields.displayNameDe !== undefined) updateData.displayNameDe = fields.displayNameDe;
  if (fields.displayNameEn !== undefined) updateData.displayNameEn = fields.displayNameEn;
  if (fields.displayNameAr !== undefined) updateData.displayNameAr = fields.displayNameAr;
  if (fields.contactEmail !== undefined) updateData.contactEmail = fields.contactEmail;
  if (fields.mode !== undefined) updateData.mode = fields.mode;
  if (fields.apiUrl !== undefined) updateData.apiUrl = fields.apiUrl;
  if (fields.apiKey !== undefined) updateData.apiKeyEncrypted = fields.apiKey; // TODO: encrypt
  if (fields.airtableTableName !== undefined) updateData.airtableTableName = fields.airtableTableName;
  if (fields.commissionPercent !== undefined) updateData.commissionPercent = String(fields.commissionPercent);
  if (fields.logoUrl !== undefined) updateData.logoUrl = fields.logoUrl;
  if (fields.descriptionDe !== undefined) updateData.descriptionDe = fields.descriptionDe;
  if (fields.descriptionEn !== undefined) updateData.descriptionEn = fields.descriptionEn;
  if (fields.descriptionAr !== undefined) updateData.descriptionAr = fields.descriptionAr;
  if (fields.isActive !== undefined) updateData.isActive = fields.isActive;
  if (fields.sortOrder !== undefined) updateData.sortOrder = fields.sortOrder;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'Keine Felder zum Aktualisieren' }, { status: 400 });
  }

  updateData.updatedAt = new Date();

  await db
    .update(producers)
    .set(updateData)
    .where(eq(producers.id, id));

  // Audit log
  await db.insert(auditLog).values({
    entityType: 'producer',
    entityId: id,
    action: 'update',
    oldValues: {
      displayName: existing.displayName,
      mode: existing.mode,
      isActive: existing.isActive,
    },
    newValues: updateData,
    performedBy: session.email,
  });

  return NextResponse.json({ success: true });
}
