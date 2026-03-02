# n8n Studien-Workflows — Austria Imperial Green Gold

## API Endpoint

```
POST https://austriaimperial.com/api/admin/studien/generate
Authorization: Bearer f1e71f1280006674522813be647f510207d15f76f9f02690bd802a07bf426026
Content-Type: application/json
```

## Workflows

### 1. AIGG_Wochenbericht (Weekly)
- **Trigger:** Jeden Montag 08:00 UTC (Cron: `0 8 * * 1`)
- **Body:** `{"type": "weekly"}`
- **Ergebnis:** Erstellt WB-YYYY-WXX (z.B. WB-2026-W09)

### 2. AIGG_Monatsbericht (Monthly)
- **Trigger:** Am 1. jeden Monats um 08:00 UTC (Cron: `0 8 1 * *`)
- **Body:** `{"type": "monthly"}`
- **Ergebnis:** Erstellt MB-YYYY-MM (z.B. MB-2026-02)

### 3. AIGG_Quartalsbericht (Quarterly)
- **Trigger:** Am 1. Jan/Apr/Jul/Okt um 08:00 UTC (Cron: `0 8 1 1,4,7,10 *`)
- **Body:** `{"type": "quarterly"}`
- **Ergebnis:** Erstellt QB-YYYY-QX (z.B. QB-2026-Q1)

## n8n Workflow-Konfiguration

Für jeden Workflow:

1. **Schedule Trigger** → Cron wie oben
2. **HTTP Request Node**:
   - Method: POST
   - URL: `https://austriaimperial.com/api/admin/studien/generate`
   - Headers: `Authorization: Bearer <STUDIEN_API_KEY>`
   - Body (JSON): `{"type": "weekly"}` (bzw. monthly/quarterly)
3. Optional: **Slack/Telegram Notification** bei Erfolg/Fehler

## Response

```json
{
  "success": true,
  "reportId": "WB-2026-W09",
  "report": {
    "id": 1,
    "type": "weekly",
    "periodFrom": "2026-02-23T00:00:00.000Z",
    "periodTo": "2026-03-01T23:59:59.999Z",
    "revenue": 13810,
    "orderCount": 3,
    "avgOrderValue": 4603,
    "topContent": "Steirischer Kren trocken — Scharfer Rudi",
    "aiSummary": "..."
  }
}
```

## Fehlerbehandlung

- **409 Conflict**: Bericht existiert bereits
- **401 Unauthorized**: Falscher API Key
- **400 Bad Request**: Ungültiger Typ

## Datenquellen

Der Bericht aggregiert automatisch:
- Umsatz aus `financial_ledger`
- Bestellungen aus `orders`
- Top-Produkt aus `order_items` → `product_variants` → `products`
