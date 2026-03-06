import { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getPostBySlug, getAllPosts, getLocalizedBlogField } from '@/lib/blog';
import { notFound } from 'next/navigation';
import { Calendar, ArrowLeft } from 'lucide-react';

interface Props {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: 'Not Found' };

  return {
    title: getLocalizedBlogField(post, 'title', locale),
    description: getLocalizedBlogField(post, 'excerpt', locale),
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const post = getPostBySlug(slug);
  if (!post) notFound();

  const t = await getTranslations({ locale, namespace: 'blog' });
  const title = getLocalizedBlogField(post, 'title', locale);
  const body = getLocalizedBlogField(post, 'body', locale);
  const paragraphs = body.split('\n\n').filter(Boolean);

  return (
    <div>
      <section className="py-24 px-6">
        <article className="max-w-3xl mx-auto">
          {/* Back link */}
          <Link
            href="/expedition/blog"
            className="inline-flex items-center gap-2 text-gold text-sm mb-10 hover:text-gold-light transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('backToList')}
          </Link>

          {/* Date */}
          <div className="flex items-center gap-2 text-gold/60 text-xs mb-4">
            <Calendar className="w-3.5 h-3.5" />
            <time dateTime={post.date}>
              {new Date(post.date).toLocaleDateString(locale, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </time>
          </div>

          {/* Title */}
          <h1 className="font-[var(--font-heading)] text-3xl sm:text-4xl md:text-5xl text-cream font-semibold leading-tight mb-10">
            {title}
          </h1>

          <div className="gold-line mb-10" />

          {/* Body */}
          <div className="space-y-6">
            {paragraphs.map((p, i) => (
              <p key={i} className="text-cream/80 text-base leading-relaxed">
                {p}
              </p>
            ))}
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-12 pt-8 border-t border-border-gold">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 text-xs border border-border-gold rounded-full text-cream/60"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
