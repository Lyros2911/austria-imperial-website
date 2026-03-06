import fs from 'fs';
import path from 'path';

export interface BlogPost {
  slug: string;
  date: string;
  titleDe: string;
  titleEn: string;
  titleAr?: string;
  excerptDe: string;
  excerptEn: string;
  excerptAr?: string;
  bodyDe: string;
  bodyEn: string;
  bodyAr?: string;
  imageUrl?: string;
  tags?: string[];
}

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');

export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return [];

  const files = fs.readdirSync(BLOG_DIR).filter((f) => f.endsWith('.json'));

  const posts = files
    .map((file) => {
      const raw = fs.readFileSync(path.join(BLOG_DIR, file), 'utf-8');
      return JSON.parse(raw) as BlogPost;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return posts;
}

export function getPostBySlug(slug: string): BlogPost | null {
  const filePath = path.join(BLOG_DIR, `${slug}.json`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as BlogPost;
}

/** Get localised field with fallback: locale → en → de */
export function getLocalizedBlogField(
  post: BlogPost,
  field: 'title' | 'excerpt' | 'body',
  locale: string,
): string {
  const localeKey = `${field}${locale.charAt(0).toUpperCase()}${locale.slice(1)}` as keyof BlogPost;
  const enKey = `${field}En` as keyof BlogPost;
  const deKey = `${field}De` as keyof BlogPost;

  return (post[localeKey] as string) || (post[enKey] as string) || (post[deKey] as string) || '';
}
