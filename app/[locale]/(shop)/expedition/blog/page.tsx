import { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getAllPosts, getLocalizedBlogField } from '@/lib/blog';
import { Calendar, ArrowRight } from 'lucide-react';

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'blog' });
  return {
    title: t('title'),
    description: t('subtitle'),
  };
}

export default async function BlogListPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: 'blog' });
  const posts = getAllPosts();

  return (
    <div>
      {/* Hero */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-gold/60 text-xs tracking-[0.4em] uppercase mb-6">
            {t('tagline')}
          </p>
          <h1 className="font-[var(--font-heading)] text-4xl sm:text-5xl text-cream font-semibold mb-4">
            {t('title')}
          </h1>
          <p className="text-muted text-base max-w-2xl mx-auto leading-relaxed">
            {t('subtitle')}
          </p>
        </div>
      </section>

      <div className="gold-line" />

      {/* Posts */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          {posts.length === 0 ? (
            <p className="text-center text-muted py-16">{t('noPosts')}</p>
          ) : (
            <div className="space-y-8">
              {posts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/expedition/blog/${post.slug}`}
                  className="block p-6 border border-border-gold rounded bg-surface hover:border-gold/40 transition-colors duration-300 group"
                >
                  <div className="flex items-center gap-2 text-gold/60 text-xs mb-3">
                    <Calendar className="w-3.5 h-3.5" />
                    <time dateTime={post.date}>
                      {new Date(post.date).toLocaleDateString(locale, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </time>
                  </div>

                  <h2 className="font-[var(--font-heading)] text-cream text-xl mb-3 group-hover:text-gold transition-colors">
                    {getLocalizedBlogField(post, 'title', locale)}
                  </h2>

                  <p className="text-muted text-sm leading-relaxed mb-4">
                    {getLocalizedBlogField(post, 'excerpt', locale)}
                  </p>

                  <span className="inline-flex items-center gap-1.5 text-gold text-sm group-hover:gap-3 transition-all">
                    {t('readMore')} <ArrowRight className="w-4 h-4" />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
