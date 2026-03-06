'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { AB_COOKIE, parseABCookie, type ABAssignment } from '@/lib/ab-testing';

interface MascotContextValue {
  /** Die zugewiesene A/B-Variante ('A' = Avatar, 'B' = Kontrolle) */
  variant: 'A' | 'B' | null;
  /** Soll der Avatar auf Produktseiten angezeigt werden? */
  isAvatarVisible: boolean;
  /** Die volle Assignment-Info (fuer Tracking) */
  assignment: ABAssignment | null;
}

const MascotContext = createContext<MascotContextValue>({
  variant: null,
  isAvatarVisible: false,
  assignment: null,
});

/**
 * MascotProvider — Liest den A/B-Cookie und stellt die Variante bereit.
 *
 * Kinder-Komponenten koennen per useMascot() pruefen ob der Avatar
 * angezeigt werden soll (Variante A) oder nicht (Variante B).
 */
export function MascotProvider({ children }: { children: ReactNode }) {
  const [assignment, setAssignment] = useState<ABAssignment | null>(null);

  useEffect(() => {
    const cookieMatch = document.cookie
      .split('; ')
      .find((c) => c.startsWith(`${AB_COOKIE}=`));

    if (cookieMatch) {
      const value = decodeURIComponent(cookieMatch.split('=')[1]);
      const parsed = parseABCookie(value);
      if (parsed) {
        setAssignment(parsed);
      }
    }
  }, []);

  const variant = assignment?.variant ?? null;

  return (
    <MascotContext.Provider
      value={{
        variant,
        isAvatarVisible: variant === 'A',
        assignment,
      }}
    >
      {children}
    </MascotContext.Provider>
  );
}

/**
 * Hook: Zugriff auf die aktuelle A/B-Variante und Avatar-Sichtbarkeit.
 */
export function useMascot(): MascotContextValue {
  return useContext(MascotContext);
}
