import type { Locale } from './config';

export const ui = {
  en: {
    'nav.home': 'Home',
    'nav.openbadgeVerifier': 'OpenBadge Verifier',
    'nav.markdownNotes': 'Markdown Notes',
    'nav.recipeConverter': 'Recipe Converter',
    'footer.rights': 'Your name here. All rights reserved.',
    'home.title': 'Tools Hub',
    'home.welcome': 'Small client-side tools. Pick one to get started.',
    'home.openbadgeVerifier.description': 'Verify Open Badges locally in your browser.',
    'home.markdownNotes.description': 'Take and preview markdown notes.',
    'home.recipeConverter.description': 'Convert recipe quantities and units.',
    'tool.comingSoon': 'Coming soon',
    'languagePicker.label': 'Choose language',
    'skipLinks.toContent': 'Skip to content',
    'skipLinks.beforeLabel': 'Skip to: {label}',
  },
  it: {
    'nav.home': 'Home',
    'nav.openbadgeVerifier': 'Verifica OpenBadge',
    'nav.markdownNotes': 'Note Markdown',
    'nav.recipeConverter': 'Convertitore ricette',
    'footer.rights': 'Il tuo nome qui. Tutti i diritti riservati.',
    'home.title': 'Tools Hub',
    'home.welcome': 'Piccoli strumenti lato client. Scegline uno per iniziare.',
    'home.openbadgeVerifier.description': 'Verifica Open Badges localmente nel browser.',
    'home.markdownNotes.description': 'Scrivi e anteprima note in markdown.',
    'home.recipeConverter.description': 'Converti quantità e unità delle ricette.',
    'tool.comingSoon': 'Prossimamente',
    'languagePicker.label': 'Scegli la lingua',
    'skipLinks.toContent': 'Salta al contenuto',
    'skipLinks.beforeLabel': 'Vai a: {label}',
  },
  
} as const;

export type UiKey = keyof (typeof ui)[Locale];
