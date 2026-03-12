import { ShopShell } from '@/components/layout/shop-shell';
import { OrganizationJsonLd, WebSiteJsonLd } from '@/components/seo/json-ld';

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <OrganizationJsonLd />
      <WebSiteJsonLd />
      <ShopShell>{children}</ShopShell>
    </>
  );
}
