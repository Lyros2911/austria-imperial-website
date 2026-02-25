/**
 * Admin Login Layout — No sidebar, no header/footer.
 * Just the login form on a dark background.
 */

export const metadata = {
  title: 'Login | Admin',
};

export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
