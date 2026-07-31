import type { Locale } from './config';

export const ui = {
  en: {
    'nav.home': 'Home',
    'nav.blog': 'Blog',
    'nav.about': 'About',
    'footer.rights': 'Your name here. All rights reserved.',
    'home.title': 'Hello, Astronaut!',
    'home.welcome':
      'Welcome to the Marketing Website Template.',
    'about.title': 'About Me',
    'about.description': 'Lorem ipsum dolor sit amet',
    'blog.lastUpdated': 'Last updated on',
    'languagePicker.label': 'Choose language',
    'skipLinks.toContent': 'Skip to content',
    'skipLinks.beforeLabel': 'Skip to: {label}',
  },
  it: {
    'nav.home': 'Home',
    'nav.blog': 'Blog',
    'nav.about': 'About',
    'footer.rights': 'Il tuo nome qui. Tutti i diritti riservati.',
    'home.title': 'Ciao, Astronauta!',
    'home.welcome': 'Benvenuti nel Template Marketing Website.',
    'about.title': 'Chi sono',
    'about.description': 'Lorem ipsum dolor sit amet',
    'blog.lastUpdated': 'Ultimo aggiornamento il',
    'languagePicker.label': 'Scegli la lingua',
    'skipLinks.toContent': 'Salta al contenuto',
    'skipLinks.beforeLabel': 'Vai a: {label}',
  },
  
} as const;

export type UiKey = keyof (typeof ui)[Locale];
