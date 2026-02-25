/**
 * One-time script: Create Airtable tables for AIGG order tracking.
 *
 * Usage: npx tsx scripts/create-airtable-tables.ts
 *
 * Creates 4 tables in the "Kernöl CRM" base:
 * - Shop Bestellungen (main orders)
 * - Shop Kürbiskernöl (Kiendler fulfillment)
 * - Shop Kren (Hernach fulfillment)
 * - Shop Kommunikation (email log)
 */

const AIRTABLE_PAT = process.env.AIRTABLE_PAT || '';
const BASE_ID = process.env.AIRTABLE_BASE_ID || 'app7KX8W2LQGs8gWx';
const META_API = 'https://api.airtable.com/v0/meta/bases';

// ─── Helpers ───────────────────────────────────────────────

async function listTables(): Promise<string[]> {
  const res = await fetch(`${META_API}/${BASE_ID}/tables`, {
    headers: { Authorization: `Bearer ${AIRTABLE_PAT}` },
  });
  if (!res.ok) throw new Error(`Failed to list tables: ${res.status} ${await res.text()}`);
  const data = await res.json() as { tables: Array<{ name: string }> };
  return data.tables.map((t) => t.name);
}

async function createTable(name: string, fields: unknown[]): Promise<string> {
  const res = await fetch(`${META_API}/${BASE_ID}/tables`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AIRTABLE_PAT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, fields }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to create table "${name}": ${res.status} ${body}`);
  }

  const data = await res.json() as { id: string; name: string };
  console.log(`✅ Created table: "${data.name}" (${data.id})`);
  return data.id;
}

// ─── Table Definitions ─────────────────────────────────────

const SHOP_BESTELLUNGEN_FIELDS = [
  { name: 'Bestellnummer', type: 'singleLineText' },
  { name: 'Kunde', type: 'singleLineText' },
  { name: 'E-Mail', type: 'email' },
  {
    name: 'Status',
    type: 'singleSelect',
    options: {
      choices: [
        { name: 'Bezahlt', color: 'greenLight2' },
        { name: 'In Bearbeitung', color: 'yellowLight2' },
        { name: 'Teilweise versendet', color: 'orangeLight2' },
        { name: 'Versendet', color: 'blueLight2' },
        { name: 'Zugestellt', color: 'cyanLight2' },
        { name: 'Storniert', color: 'redLight2' },
        { name: 'Erstattet', color: 'purpleLight2' },
      ],
    },
  },
  { name: 'Gesamtbetrag', type: 'currency', options: { precision: 2, symbol: '€' } },
  { name: 'Versandkosten', type: 'currency', options: { precision: 2, symbol: '€' } },
  { name: 'Lieferadresse', type: 'multilineText' },
  { name: 'Bestelldatum', type: 'dateTime', options: { timeZone: 'Europe/Vienna', dateFormat: { name: 'european', format: 'D/M/YYYY' }, timeFormat: { name: '24hour', format: 'HH:mm' } } },
  { name: 'DB Order ID', type: 'number', options: { precision: 0 } },
];

function makeProductFields(producerName: string) {
  return [
    { name: 'Auftrag', type: 'singleLineText' },
    { name: 'Produkte', type: 'multilineText' },
    { name: 'Menge gesamt', type: 'number', options: { precision: 0 } },
    { name: 'Betrag', type: 'currency', options: { precision: 2, symbol: '€' } },
    { name: 'Produzent', type: 'singleLineText' },
    {
      name: 'Status',
      type: 'singleSelect',
      options: {
        choices: [
          { name: 'Ausstehend', color: 'redLight2' },
          { name: 'An Produzent gesendet', color: 'yellowLight2' },
          { name: 'Bestätigt', color: 'orangeLight2' },
          { name: 'Versendet', color: 'blueLight2' },
          { name: 'Zugestellt', color: 'greenLight2' },
          { name: 'Fehlgeschlagen', color: 'redDark1' },
          { name: 'Storniert', color: 'purpleLight2' },
        ],
      },
    },
    { name: 'Trackingnummer', type: 'singleLineText' },
    { name: 'Tracking-Link', type: 'url' },
    {
      name: 'Versandmethode',
      type: 'singleSelect',
      options: {
        choices: [
          { name: 'API', color: 'blueLight2' },
          { name: 'E-Mail', color: 'yellowLight2' },
        ],
      },
    },
    { name: 'Bestellung gesendet am', type: 'dateTime', options: { timeZone: 'Europe/Vienna', dateFormat: { name: 'european', format: 'D/M/YYYY' }, timeFormat: { name: '24hour', format: 'HH:mm' } } },
    { name: 'Bestätigt am', type: 'dateTime', options: { timeZone: 'Europe/Vienna', dateFormat: { name: 'european', format: 'D/M/YYYY' }, timeFormat: { name: '24hour', format: 'HH:mm' } } },
    { name: 'Versendet am', type: 'dateTime', options: { timeZone: 'Europe/Vienna', dateFormat: { name: 'european', format: 'D/M/YYYY' }, timeFormat: { name: '24hour', format: 'HH:mm' } } },
    { name: 'Zugestellt am', type: 'dateTime', options: { timeZone: 'Europe/Vienna', dateFormat: { name: 'european', format: 'D/M/YYYY' }, timeFormat: { name: '24hour', format: 'HH:mm' } } },
    { name: 'Fehler', type: 'multilineText' },
    { name: 'DB Fulfillment ID', type: 'number', options: { precision: 0 } },
  ];
}

const SHOP_KOMMUNIKATION_FIELDS = [
  { name: 'Betreff', type: 'singleLineText' },
  {
    name: 'Typ',
    type: 'singleSelect',
    options: {
      choices: [
        { name: 'Kundenbestätigung', color: 'greenLight2' },
        { name: 'Office-Benachrichtigung', color: 'blueLight2' },
        { name: 'Produzenten-Bestellung', color: 'yellowLight2' },
        { name: 'Statusänderung', color: 'cyanLight2' },
      ],
    },
  },
  { name: 'Empfänger', type: 'email' },
  {
    name: 'Status',
    type: 'singleSelect',
    options: {
      choices: [
        { name: 'Gesendet', color: 'greenLight2' },
        { name: 'Fehlgeschlagen', color: 'redLight2' },
      ],
    },
  },
  { name: 'Zeitpunkt', type: 'dateTime', options: { timeZone: 'Europe/Vienna', dateFormat: { name: 'european', format: 'D/M/YYYY' }, timeFormat: { name: '24hour', format: 'HH:mm' } } },
  { name: 'Details', type: 'multilineText' },
];

// ─── Main ──────────────────────────────────────────────────

async function main() {
  console.log(`\n📦 Erstelle Airtable-Tabellen in Base: ${BASE_ID}\n`);

  // Check existing tables
  const existingTables = await listTables();
  console.log(`Bestehende Tabellen: ${existingTables.join(', ')}\n`);

  const tablesToCreate: Array<{ name: string; fields: unknown[] }> = [
    { name: 'Shop Bestellungen', fields: SHOP_BESTELLUNGEN_FIELDS },
    { name: 'Shop Kürbiskernöl', fields: makeProductFields('Kiendler') },
    { name: 'Shop Kren', fields: makeProductFields('Hernach') },
    { name: 'Shop Kommunikation', fields: SHOP_KOMMUNIKATION_FIELDS },
  ];

  const createdTableIds: Record<string, string> = {};

  for (const table of tablesToCreate) {
    if (existingTables.includes(table.name)) {
      console.log(`⏭️  Tabelle "${table.name}" existiert bereits — übersprungen`);
      continue;
    }

    const tableId = await createTable(table.name, table.fields);
    createdTableIds[table.name] = tableId;

    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 300));
  }

  // ─── Add Linked Record Fields ──────────────────────────
  // Linked record fields must reference existing tables by ID,
  // so we add them after all tables are created.

  console.log('\n🔗 Erstelle Verknüpfungen zwischen Tabellen...\n');

  // We need table IDs for linking. If tables already existed, fetch them.
  if (Object.keys(createdTableIds).length < 4) {
    const res = await fetch(`${META_API}/${BASE_ID}/tables`, {
      headers: { Authorization: `Bearer ${AIRTABLE_PAT}` },
    });
    const data = await res.json() as { tables: Array<{ id: string; name: string }> };
    for (const t of data.tables) {
      if (!createdTableIds[t.name]) {
        createdTableIds[t.name] = t.id;
      }
    }
  }

  const bestellungenId = createdTableIds['Shop Bestellungen'];
  const kuerbisId = createdTableIds['Shop Kürbiskernöl'];
  const krenId = createdTableIds['Shop Kren'];
  const kommId = createdTableIds['Shop Kommunikation'];

  if (!bestellungenId) {
    console.error('❌ "Shop Bestellungen" Tabelle nicht gefunden');
    return;
  }

  // Add linked fields to Shop Bestellungen
  const linkedFields = [
    { tableId: bestellungenId, name: 'Shop Kürbiskernöl', linkedTableId: kuerbisId },
    { tableId: bestellungenId, name: 'Shop Kren', linkedTableId: krenId },
    { tableId: bestellungenId, name: 'Shop Kommunikation', linkedTableId: kommId },
  ];

  for (const link of linkedFields) {
    if (!link.linkedTableId) {
      console.warn(`⚠️  Überspringe Verknüpfung "${link.name}" — Ziel-Tabelle nicht gefunden`);
      continue;
    }

    try {
      const res = await fetch(`${META_API}/${BASE_ID}/tables/${link.tableId}/fields`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${AIRTABLE_PAT}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: link.name,
          type: 'multipleRecordLinks',
          options: {
            linkedTableId: link.linkedTableId,
            prefersSingleRecordLink: false,
          },
        }),
      });

      if (res.ok) {
        console.log(`✅ Verknüpfung erstellt: Shop Bestellungen → ${link.name}`);
      } else {
        const body = await res.text();
        // Field may already exist
        if (body.includes('DUPLICATE_OR_EMPTY_FIELD_NAME')) {
          console.log(`⏭️  Verknüpfung "${link.name}" existiert bereits`);
        } else {
          console.error(`❌ Fehler bei Verknüpfung "${link.name}": ${body}`);
        }
      }
    } catch (err) {
      console.error(`❌ Fehler bei Verknüpfung "${link.name}": ${err}`);
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  // Add "Bestellung" linked field to product tables + communication table
  const reverseLinks = [
    { tableId: kuerbisId, name: 'Bestellung', linkedTableId: bestellungenId },
    { tableId: krenId, name: 'Bestellung', linkedTableId: bestellungenId },
    { tableId: kommId, name: 'Bestellung', linkedTableId: bestellungenId },
  ];

  for (const link of reverseLinks) {
    if (!link.tableId || !link.linkedTableId) continue;

    try {
      const res = await fetch(`${META_API}/${BASE_ID}/tables/${link.tableId}/fields`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${AIRTABLE_PAT}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: link.name,
          type: 'multipleRecordLinks',
          options: {
            linkedTableId: link.linkedTableId,
            prefersSingleRecordLink: false,
          },
        }),
      });

      if (res.ok) {
        console.log(`✅ Verknüpfung erstellt: ${link.name} ← Shop Bestellungen`);
      } else {
        const body = await res.text();
        if (body.includes('DUPLICATE_OR_EMPTY_FIELD_NAME')) {
          console.log(`⏭️  Verknüpfung "${link.name}" existiert bereits`);
        } else {
          console.error(`❌ Fehler: ${body}`);
        }
      }
    } catch (err) {
      console.error(`❌ Fehler: ${err}`);
    }

    await new Promise((r) => setTimeout(r, 300));
  }

  console.log('\n✅ Fertig! Prüfe die Tabellen in Airtable.\n');
}

main().catch((err) => {
  console.error('❌ Script fehlgeschlagen:', err);
  process.exit(1);
});
