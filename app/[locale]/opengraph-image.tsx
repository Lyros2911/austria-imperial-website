import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Austria Imperial — Green Gold';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 50%, #1a1a1a 100%)',
          fontFamily: 'serif',
          position: 'relative',
        }}
      >
        {/* Gold border accent */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, transparent 0%, #C8A951 30%, #E8D48B 50%, #C8A951 70%, transparent 100%)',
            display: 'flex',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, transparent 0%, #C8A951 30%, #E8D48B 50%, #C8A951 70%, transparent 100%)',
            display: 'flex',
          }}
        />

        {/* Crown / Decorative element */}
        <div
          style={{
            display: 'flex',
            fontSize: 48,
            marginBottom: 8,
            color: '#C8A951',
          }}
        >
          ✦
        </div>

        {/* Brand name */}
        <div
          style={{
            display: 'flex',
            fontSize: 64,
            fontWeight: 700,
            color: '#C8A951',
            letterSpacing: '4px',
            textTransform: 'uppercase' as const,
            marginBottom: 8,
          }}
        >
          AUSTRIA IMPERIAL
        </div>

        {/* Divider line */}
        <div
          style={{
            display: 'flex',
            width: 200,
            height: 2,
            background: 'linear-gradient(90deg, transparent, #C8A951, transparent)',
            marginBottom: 16,
            marginTop: 8,
          }}
        />

        {/* Subtitle */}
        <div
          style={{
            display: 'flex',
            fontSize: 28,
            color: '#E8D48B',
            letterSpacing: '8px',
            textTransform: 'uppercase' as const,
            marginBottom: 24,
          }}
        >
          GREEN GOLD
        </div>

        {/* Tagline */}
        <div
          style={{
            display: 'flex',
            fontSize: 20,
            color: '#999999',
            maxWidth: 700,
            textAlign: 'center',
            lineHeight: 1.5,
          }}
        >
          Premium Steirisches Kürbiskernöl g.g.A. — Direkt vom Erzeuger
        </div>

        {/* Bottom accent */}
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            bottom: 24,
            fontSize: 14,
            color: '#666666',
            letterSpacing: '3px',
            textTransform: 'uppercase' as const,
          }}
        >
          austriaimperial.com
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
