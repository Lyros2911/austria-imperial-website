-- Attribution Tracking: Woher kam die Bestellung?
-- Erfasst UTM-Parameter aus Content-Engine-Links

ALTER TABLE orders
  ADD COLUMN attribution_source VARCHAR(50) DEFAULT 'direct',
  ADD COLUMN utm_source VARCHAR(100),
  ADD COLUMN utm_medium VARCHAR(100),
  ADD COLUMN utm_campaign VARCHAR(100),
  ADD COLUMN utm_content VARCHAR(255),
  ADD COLUMN referrer_url VARCHAR(500);

-- Index fuer schnelle Abfragen nach Quelle/Kampagne
CREATE INDEX idx_orders_attribution ON orders (attribution_source);
CREATE INDEX idx_orders_utm_campaign ON orders (utm_campaign);
