import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import 'dayjs/locale/it';
import 'dayjs/locale/en';
import { defaultLocale, locales, type Locale } from '@i18n/config';

dayjs.extend(customParseFormat);
dayjs.extend(utc);

const LOCALE_FORMATS: Record<Locale, string[]> = {
	en: ['YYYY-MM-DD', 'MMM D YYYY', 'MMM, D YYYY', 'MMMM D YYYY', 'MMMM, D YYYY', 'MM-DD-YYYY', 'MM/DD/YYYY'],
	it: ['YYYY-MM-DD', 'D MMM YYYY', 'D MMMM YYYY', 'DD-MM-YYYY', 'DD/MM/YYYY'],
};

export function localeFromEntryId(entryId: string): Locale | undefined {
	const [prefix] = entryId.split('/');

	if (locales.includes(prefix as Locale)) {
		return prefix as Locale;
	}

	return undefined;
}

/**
 * Parses a human-readable local date string and returns an ISO 8601 date string.
 *
 * Supported formats (per locale):
 * - English: "Jun 12 2026", "Jun, 12 2026", "MM-DD-YYYY", "MM/DD/YYYY"
 * - Italian: "12 Giugno 2026", "DD-MM-YYYY", "DD/MM/YYYY"
 * - ISO dates ("YYYY-MM-DD") are supported for every locale.
 */
export function localDateToISO(localDate: string, locale: Locale = defaultLocale): string {
	const trimmed = localDate.trim();
	const formats = LOCALE_FORMATS[locale];

	const parsed = [trimmed, trimmed.toLowerCase()]
		.map((candidate) => dayjs(candidate, formats, locale, true))
		.find((result) => result.isValid());

	if (!parsed) {
		throw new Error(`Unrecognized date format: ${localDate}`);
	}

	return dayjs.utc(parsed.format('YYYY-MM-DD')).toISOString();
}

export function parseLocalDate(localDate: string, locale: Locale = defaultLocale): Date {
	return new Date(localDateToISO(localDate, locale));
}
