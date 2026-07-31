import { getCollection, type CollectionEntry } from 'astro:content';
import { defaultLocale, type Locale } from '../i18n/config';

async function getPostsForLocale(locale: Locale) {
	const localizedPosts = await getCollection('blog', ({ id }) => id.startsWith(`${locale}/`));

	if (localizedPosts.length > 0 || locale === defaultLocale) {
		return localizedPosts;
	}

	return getCollection('blog', ({ id }) => id.startsWith(`${defaultLocale}/`));
}

export async function getBlogStaticPaths(locale: Locale) {
	const posts = await getPostsForLocale(locale);

	return posts.map((post) => ({
		params: { slug: post.id.replace(/^(en|es)\//, '') },
		props: post,
	}));
}

export type BlogPostEntry = CollectionEntry<'blog'>;
