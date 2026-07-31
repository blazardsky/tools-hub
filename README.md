---
version: v0.1
---

# ASTRO Marketing Website Template

_Features:_

- mdx
- partytown
- rss
- seo
- i18n
- a/b testing
- cloudflare
- umami analytics
- sitemap
- custom font

Structure:

- pages (/)
- blog posts (/blog)
- landing pages (/offers)

## How to use automatic a/b testing

1. Create a folder inside `src/abtests`: it will be the landing page slug.
2. Add as many test pages as you want: for example `a.astro` and `b.astro` (page name is irrelevant)
3. Done

Landing pages are not localized as each landing page will probably differ to better align with the specific culture

**How to rename the "offers" folder**

1. rename the folder `offers/`
2. inside `offers/[slug].astro` rename ``path: `/offers/${slug}`,``
