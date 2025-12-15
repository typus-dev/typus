# typus-dark-css (Reference Theme)

This directory hosts the reference CSS implementation of the Typus Dark theme. Files are ordered to match the structure defined in `src/core/theme/types.ts`:

```
00-tokens.css   → CSS variables / tokens
01-base.css     → base radius/spacing/shadow helpers
02-typography.css
03-content.css  → theme-content-* mapping
04-colors.css
05-layout.css
06-components.css
07-mixins.css
99-overrides.css (temporary patches only)
```

To enable the theme in SPA/static HTML:
1. Add `<link rel="stylesheet" href="/themes/typus-dark-css/<file>.css">` entries after the shared styles.
2. Use `data-theme="typus-dark-css"` on `<html>` or `<body>`.
3. Ensure DXCE/markdown renderers add `theme-content-*` classes to headings, paragraphs, and links (or keep using the shared selectors until migrated).

The folder can be copied to seed new themes. Update tokens, then override the classes you need.
