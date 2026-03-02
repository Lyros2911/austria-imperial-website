import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { vereinsfinanzen, auditLog } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getAdminSession } from '@/lib/auth/admin';

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { transactionId, countersignedBy } = body;

    if (!transactionId || !countersignedBy) {
      return NextResponse.json(
        { error: 'Missing required fields: transactionId, countersignedBy' },
        { status: 400 }
      );
    }

    // Find the transaction
    const [transaction] = await db
      .select()
      .from(vereinsfinanzen)
      .where(eq(vereinsfinanzen.id, parseInt(transactionId)));

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    if (!transaction.countersignatureRequired) {
      return NextResponse.json(
        { error: 'Transaction does not require countersignature' },
        { status: 400 }
      );
    }

    if (transaction.countersignedBy) {
      return NextResponse.json(
        { error: 'Transaction already countersigned' },
        { status: 400 }
      );
    }

    // Countersigner must be different from executor
    if (transaction.executedBy === countersignedBy) {
      return NextResponse.json(
        { error: 'Countersigner must be different from executor' },
        { status: 400 }
      );
    }

    // Apply countersignature
    const [updated] = await db
      .update(vereinsfinanzen)
      .set({
        countersignedBy,
        countersignedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(vereinsfinanzen.id, parseInt(transactionId)))
      .returning();

    // Audit log
    await db.insert(auditLog).values({
      action: 'verein_tx_signed',
      entityType: 'vereinsfinanzen',
      entityId: updated.id,
      performedBy: session.email,
      newValues: { transactionId: updated.transactionId, countersignedBy },
    });

    return NextResponse.json({
      success: true,
      transaction: updated,
    });
  } catch (error: any) {
    console.error('Failed to countersign transaction:', error);
    return NextResponse.json(
      { error: 'Failed to countersign', details: error.message },
      { status: 500 }
    );
  }
}
