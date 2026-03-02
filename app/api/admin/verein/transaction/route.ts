import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { vereinsfinanzen, auditLog } from '@/lib/db/schema';
import { getAdminSession } from '@/lib/auth/admin';

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      date,
      amount, // in Cent, already signed (positive=Einnahme, negative=Ausgabe)
      category,
      description,
      executedBy,
      paymentMethod,
      receiptUrl,
      receiptReference,
    } = body;

    // Validation
    if (!date || !amount || !category || !description || !executedBy) {
      return NextResponse.json(
        { error: 'Missing required fields: date, amount, category, description, executedBy' },
        { status: 400 }
      );
    }

    const amountCents = parseInt(amount);
    if (isNaN(amountCents) || amountCents === 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Generate transaction ID: TXN-2026-0042
    const yearStr = new Date(date).getFullYear();
    const countResult = await db.execute(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(transaction_id FROM 10) AS INTEGER)), 0) + 1 AS next_num
       FROM vereinsfinanzen WHERE transaction_id LIKE 'TXN-${yearStr}-%'`
    );
    const nextNum = (countResult as any)[0]?.next_num || 1;
    const transactionId = `TXN-${yearStr}-${String(nextNum).padStart(4, '0')}`;

    // 1.000€ logic: |amount| > 100000 Cent = 1.000€
    const isOver1000 = Math.abs(amountCents) > 100000;
    const countersignatureRequired = isOver1000;

    const [created] = await db
      .insert(vereinsfinanzen)
      .values({
        transactionId,
        date: new Date(date),
        amount: amountCents,
        category,
        description,
        executedBy,
        isOver1000,
        countersignatureRequired,
        paymentMethod: paymentMethod || null,
        receiptUrl: receiptUrl || null,
        receiptReference: receiptReference || null,
        createdByAdminId: session.userId,
      })
      .returning();

    // Audit log
    await db.insert(auditLog).values({
      action: 'verein_tx_created',
      entityType: 'vereinsfinanzen',
      entityId: created.id,
      performedBy: session.email,
      newValues: { transactionId, description, amountCents, executedBy },
    });

    return NextResponse.json({
      success: true,
      transaction: created,
    });
  } catch (error: any) {
    console.error('Failed to create transaction:', error);
    return NextResponse.json(
      { error: 'Failed to create transaction', details: error.message },
      { status: 500 }
    );
  }
}
