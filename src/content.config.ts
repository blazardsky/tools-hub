import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { defaultLocale } from '@i18n/config';
import { localeFromEntryId, parseLocalDate } from '@lib/time';

function createBlogLoader() {
	const baseLoader = glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' });

	return {
		name: 'blog-loader',
		load: async (context: Parameters<typeof baseLoader.load>[0]) => {
			const originalParseData = context.parseData.bind(context);

			context.parseData = async <TData extends Record<string, unknown>>(props: {
				id: string;
				data: TData;
				filePath: string;
			}) => {
				const locale = localeFromEntryId(props.id) ?? defaultLocale;
				const data = { ...props.data };
				const record = data as Record<string, unknown>;

				if (typeof record.pubDate === 'string') {
					record.pubDate = parseLocalDate(record.pubDate, locale);
				}

				if (typeof record.updatedDate === 'string') {
					record.updatedDate = parseLocalDate(record.updatedDate, locale);
				}

				return originalParseData({ ...props, data });
			};

			return baseLoader.load(context);
		},
	};
}

const blog = defineCollection({
	loader: createBlogLoader(),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			pubDate: z.date(),
			updatedDate: z.date().optional(),
			heroImage: z.optional(image()),
			author: z.string().optional().default('AUTHOR'),
			authorUrl: z.string().optional().default('https://tuosito.com'),
		}),
});

export const collections = { blog };
