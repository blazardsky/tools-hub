import type { Locale } from './config';
import { defaultLocale, locales } from './config';
import { ui, type UiKey } from './ui';

type TranslationValues = Record<string, string | number>;

function interpolate(template: string, values?: TranslationValues) {
	if (!values) {
		return template;
	}

	return template.replace(/\{(\w+)\}/g, (match, key: string) => {
		const value = values[key];
		return value === undefined ? match : String(value);
	});
}

export function useTranslations(locale: string) {
	const lang = isLocale(locale) ? locale : defaultLocale;

	return function t(key: UiKey, values?: TranslationValues) {
		const template = ui[lang][key] ?? ui[defaultLocale][key];
		return interpolate(template, values);
	};
}

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function getRoutePath(pathname: string, locale: Locale): string {
  const path = pathname.replace(/\/$/, '').replace(/^\//, '');

  if (path === locale) {
    return '';
  }

  if (path.startsWith(`${locale}/`)) {
    return path.slice(3);
  }

  return path;
}
