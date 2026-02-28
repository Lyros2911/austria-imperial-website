/**
 * Admin Partner Management API
 *
 * GET  /api/admin/partners — List all partners with summary stats (admin only)
 * POST /api/admin/partners — Create user, upload doc, send message, manage prices (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/auth/admin';
import { hashPartnerPassword } from '@/lib/auth/partner';
import { db } from '@/lib/db/drizzle';
import { dbPool } from '@/lib/db/drizzle';
import {
  partnerConfig,
  partnerUsers,
  partnerDocuments,
  partnerMessages,
  partnerOrders,
  partnerPriceLists,
  productVariants,
  products,
  auditLog,
} from '@/lib/db/schema';
import { eq, sql, count, max, and, isNull } from 'drizzle-orm';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// ─── GET: List all partners with summary stats ────────────────

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
  }

  // Fetch all partner configs
  const partners = await db.query.partnerConfig.findMany({
    columns: {
      id: true,
      partnerCode: true,
      partnerName: true,
      commissionPercent: true,
      stripeConnectedAccountId: true,
      isPlatformOwner: true,
      active: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // For each partner, gather summary stats
  const partnersWithStats = await Promise.all(
    partners.map(async (partner) => {
      // User count
      const [userCountResult] = await db
        .select({ value: count() })
        .from(partnerUsers)
        .where(
          and(
            eq(partnerUsers.partnerConfigId, partner.id),
            isNull(partnerUsers.deletedAt)
          )
        );

      // Document count
      const [docCountResult] = await db
        .select({ value: count() })
        .from(partnerDocuments)
        .where(eq(partnerDocuments.partnerConfigId, partner.id));

      // Unread message count (from partner, unread by admin)
      const [msgCountResult] = await db
        .select({ value: count() })
        .from(partnerMessages)
        .where(
          and(
            eq(partnerMessages.partnerConfigId, partner.id),
            eq(partnerMessages.senderType, 'partner'),
            isNull(partnerMessages.readAt)
          )
        );

      // Order count
      const [orderCountResult] = await db
        .select({ value: count() })
        .from(partnerOrders)
        .where(eq(partnerOrders.partnerConfigId, partner.id));

      // Last activity: most recent message or order
      const [lastMsgResult] = await db
        .select({ value: max(partnerMessages.createdAt) })
        .from(partnerMessages)
        .where(eq(partnerMessages.partnerConfigId, partner.id));

      const [lastOrderResult] = await db
        .select({ value: max(partnerOrders.createdAt) })
        .from(partnerOrders)
        .where(eq(partnerOrders.partnerConfigId, partner.id));

      const lastMsg = lastMsgResult?.value;
      const lastOrder = lastOrderResult?.value;
      let lastActivity: Date | null = null;
      if (lastMsg && lastOrder) {
        lastActivity = lastMsg > lastOrder ? lastMsg : lastOrder;
      } else {
        lastActivity = lastMsg || lastOrder || null;
      }

      return {
        ...partner,
        userCount: userCountResult?.value ?? 0,
        documentCount: docCountResult?.value ?? 0,
        messageCount: msgCountResult?.value ?? 0,
        orderCount: orderCountResult?.value ?? 0,
        lastActivity,
      };
    })
  );

  // Also fetch all partner users for detail view
  const allUsers = await db.query.partnerUsers.findMany({
    columns: {
      id: true,
      email: true,
      name: true,
      companyName: true,
      partnerConfigId: true,
      locale: true,
      active: true,
      lastLoginAt: true,
      createdAt: true,
      deletedAt: true,
    },
  });

  // Fetch all documents
  const allDocuments = await db.query.partnerDocuments.findMany({
    columns: {
      id: true,
      partnerConfigId: true,
      title: true,
      category: true,
      fileName: true,
      fileSize: true,
      mimeType: true,
      uploadedBy: true,
      createdAt: true,
    },
  });

  // Fetch all messages (recent 100)
  const allMessages = await db
    .select({
      id: partnerMessages.id,
      partnerConfigId: partnerMessages.partnerConfigId,
      senderType: partnerMessages.senderType,
      senderName: partnerMessages.senderName,
      subject: partnerMessages.subject,
      body: partnerMessages.body,
      readAt: partnerMessages.readAt,
      createdAt: partnerMessages.createdAt,
    })
    .from(partnerMessages)
    .orderBy(sql`${partnerMessages.createdAt} DESC`)
    .limit(100);

  // Fetch all orders
  const allOrders = await db.query.partnerOrders.findMany({
    columns: {
      id: true,
      partnerConfigId: true,
      orderNumber: true,
      status: true,
      totalCents: true,
      currency: true,
      notes: true,
      submittedBy: true,
      confirmedBy: true,
      createdAt: true,
      submittedAt: true,
      confirmedAt: true,
      shippedAt: true,
      deliveredAt: true,
    },
  });

  // Fetch all price lists with product variant info
  const allPriceLists = await db
    .select({
      id: partnerPriceLists.id,
      partnerConfigId: partnerPriceLists.partnerConfigId,
      productVariantId: partnerPriceLists.productVariantId,
      exportPriceCents: partnerPriceLists.exportPriceCents,
      currency: partnerPriceLists.currency,
      minOrderQuantity: partnerPriceLists.minOrderQuantity,
      validFrom: partnerPriceLists.validFrom,
      validUntil: partnerPriceLists.validUntil,
      active: partnerPriceLists.active,
      createdAt: partnerPriceLists.createdAt,
      variantName: productVariants.nameEn,
      variantSku: productVariants.sku,
      productName: products.nameEn,
      productId: products.id,
    })
    .from(partnerPriceLists)
    .innerJoin(productVariants, eq(partnerPriceLists.productVariantId, productVariants.id))
    .innerJoin(products, eq(productVariants.productId, products.id));

  // Fetch all product variants for the add price form
  const allVariants = await db
    .select({
      id: productVariants.id,
      nameEn: productVariants.nameEn,
      sku: productVariants.sku,
      priceCents: productVariants.priceCents,
      productName: products.nameEn,
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(eq(productVariants.isActive, true));

  return NextResponse.json({
    partners: partnersWithStats,
    users: allUsers,
    documents: allDocuments,
    messages: allMessages,
    orders: allOrders,
    priceLists: allPriceLists,
    productVariants: allVariants,
  });
}

// ─── POST: Partner management actions ──────────────

const createUserSchema = z.object({
  action: z.literal('create_user'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  companyName: z.string().optional(),
  partnerConfigId: z.number().int().positive(),
  locale: z.enum(['de', 'en', 'ar']).optional().default('de'),
});

const uploadDocumentSchema = z.object({
  action: z.literal('upload_document'),
  partnerConfigId: z.number().int().positive(),
  title: z.string().min(1, 'Title is required'),
  category: z.enum(['customs', 'certificate', 'invoice', 'contract', 'other']),
  fileName: z.string().min(1, 'File name is required'),
  fileSize: z.number().int().optional(),
  mimeType: z.string().optional(),
});

const sendMessageSchema = z.object({
  action: z.literal('send_message'),
  partnerConfigId: z.number().int().positive(),
  subject: z.string().optional(),
  body: z.string().min(1, 'Message body is required'),
});

const addPriceSchema = z.object({
  action: z.literal('add_price'),
  partnerConfigId: z.number().int().positive(),
  productVariantId: z.number().int().positive(),
  exportPriceCents: z.number().int().positive(),
  currency: z.string().optional().default('EUR'),
  minOrderQuantity: z.number().int().positive().optional().default(1),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
});

const updatePriceSchema = z.object({
  action: z.literal('update_price'),
  id: z.number().int().positive(),
  exportPriceCents: z.number().int().positive().optional(),
  minOrderQuantity: z.number().int().positive().optional(),
  active: z.boolean().optional(),
  validUntil: z.string().nullable().optional(),
});

const deactivateUserSchema = z.object({
  action: z.literal('deactivate_user'),
  userId: z.number().int().positive(),
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
  const action = body?.action;

  // ─── Create Partner User ───────────────────────
  if (action === 'create_user') {
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await db.query.partnerUsers.findFirst({
      where: (u, { eq }) => eq(u.email, parsed.data.email),
    });
    if (existing) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 409 }
      );
    }

    // Verify partner config exists
    const partner = await db.query.partnerConfig.findFirst({
      where: (p, { eq }) => eq(p.id, parsed.data.partnerConfigId),
    });
    if (!partner) {
      return NextResponse.json(
        { error: 'Partner config not found' },
        { status: 404 }
      );
    }

    const passwordHash = await hashPartnerPassword(parsed.data.password);

    const [newUser] = await dbPool
      .insert(partnerUsers)
      .values({
        email: parsed.data.email,
        passwordHash,
        name: parsed.data.name,
        companyName: parsed.data.companyName || null,
        partnerConfigId: parsed.data.partnerConfigId,
        locale: parsed.data.locale,
      })
      .returning({ id: partnerUsers.id, email: partnerUsers.email });

    // Audit log
    await db.insert(auditLog).values({
      entityType: 'partner_user',
      entityId: newUser.id,
      action: 'create',
      newValues: {
        email: parsed.data.email,
        name: parsed.data.name,
        partnerConfigId: parsed.data.partnerConfigId,
      },
      performedBy: session.email,
    });

    return NextResponse.json({ success: true, user: newUser }, { status: 201 });
  }

  // ─── Upload Document ───────────────────────────
  if (action === 'upload_document') {
    const parsed = uploadDocumentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const storagePath = `/data/partner-docs/${Date.now()}-${parsed.data.fileName}`;

    const [newDoc] = await dbPool
      .insert(partnerDocuments)
      .values({
        partnerConfigId: parsed.data.partnerConfigId,
        title: parsed.data.title,
        category: parsed.data.category,
        fileName: parsed.data.fileName,
        fileSize: parsed.data.fileSize || null,
        mimeType: parsed.data.mimeType || null,
        storagePath,
        uploadedBy: session.email,
      })
      .returning({ id: partnerDocuments.id });

    // Audit log
    await db.insert(auditLog).values({
      entityType: 'partner_document',
      entityId: newDoc.id,
      action: 'create',
      newValues: {
        title: parsed.data.title,
        category: parsed.data.category,
        fileName: parsed.data.fileName,
        partnerConfigId: parsed.data.partnerConfigId,
      },
      performedBy: session.email,
    });

    return NextResponse.json({ success: true, document: newDoc }, { status: 201 });
  }

  // ─── Send Message ──────────────────────────────
  if (action === 'send_message') {
    const parsed = sendMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const [newMsg] = await dbPool
      .insert(partnerMessages)
      .values({
        partnerConfigId: parsed.data.partnerConfigId,
        senderType: 'admin',
        senderName: session.name || session.email,
        subject: parsed.data.subject || null,
        body: parsed.data.body,
      })
      .returning({ id: partnerMessages.id });

    return NextResponse.json({ success: true, message: newMsg }, { status: 201 });
  }

  // ─── Add Price ─────────────────────────────────
  if (action === 'add_price') {
    const parsed = addPriceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const [newPrice] = await dbPool
      .insert(partnerPriceLists)
      .values({
        partnerConfigId: parsed.data.partnerConfigId,
        productVariantId: parsed.data.productVariantId,
        exportPriceCents: parsed.data.exportPriceCents,
        currency: parsed.data.currency,
        minOrderQuantity: parsed.data.minOrderQuantity,
        validFrom: parsed.data.validFrom ? new Date(parsed.data.validFrom) : new Date(),
        validUntil: parsed.data.validUntil ? new Date(parsed.data.validUntil) : null,
      })
      .returning({ id: partnerPriceLists.id });

    // Audit log
    await db.insert(auditLog).values({
      entityType: 'partner_price_list',
      entityId: newPrice.id,
      action: 'create',
      newValues: {
        partnerConfigId: parsed.data.partnerConfigId,
        productVariantId: parsed.data.productVariantId,
        exportPriceCents: parsed.data.exportPriceCents,
      },
      performedBy: session.email,
    });

    return NextResponse.json({ success: true, priceList: newPrice }, { status: 201 });
  }

  // ─── Update Price ──────────────────────────────
  if (action === 'update_price') {
    const parsed = updatePriceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.exportPriceCents !== undefined) updateData.exportPriceCents = parsed.data.exportPriceCents;
    if (parsed.data.minOrderQuantity !== undefined) updateData.minOrderQuantity = parsed.data.minOrderQuantity;
    if (parsed.data.active !== undefined) updateData.active = parsed.data.active;
    if (parsed.data.validUntil !== undefined) {
      updateData.validUntil = parsed.data.validUntil ? new Date(parsed.data.validUntil) : null;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    await dbPool
      .update(partnerPriceLists)
      .set(updateData)
      .where(eq(partnerPriceLists.id, parsed.data.id));

    // Audit log
    await db.insert(auditLog).values({
      entityType: 'partner_price_list',
      entityId: parsed.data.id,
      action: 'update',
      newValues: updateData,
      performedBy: session.email,
    });

    return NextResponse.json({ success: true });
  }

  // ─── Deactivate/Reactivate User ───────────────
  if (action === 'deactivate_user') {
    const parsed = deactivateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const user = await db.query.partnerUsers.findFirst({
      where: (u, { eq }) => eq(u.id, parsed.data.userId),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isCurrentlyActive = user.active && !user.deletedAt;
    const now = new Date();

    await dbPool
      .update(partnerUsers)
      .set({
        active: !isCurrentlyActive,
        deletedAt: isCurrentlyActive ? now : null,
        updatedAt: now,
      })
      .where(eq(partnerUsers.id, parsed.data.userId));

    // Audit log
    await db.insert(auditLog).values({
      entityType: 'partner_user',
      entityId: parsed.data.userId,
      action: isCurrentlyActive ? 'deactivate' : 'reactivate',
      performedBy: session.email,
    });

    return NextResponse.json({
      success: true,
      active: !isCurrentlyActive,
    });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
