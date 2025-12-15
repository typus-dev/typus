# Public Layout

Shared layout files for public pages. Used by both Vue SPA and Handlebars static generation.

## Files

| File | Purpose |
|------|---------|
| `template.html` | Handlebars layout template (full HTML page) |
| `index.vue` | Vue layout component |
| `_header.html` | Shared header partial |
| `_footer.html` | Shared footer partial |
| `_content-wrapper.html` | DXCE content wrapper partial |

## Sync Requirements

Keep structure in sync between `template.html` and `index.vue`:
- HTML structure (header, main, footer)
- CSS classes (theme-* classes)
- Navigation items
- Footer links

When modifying partials, both systems will pick up changes automatically.

## Cascade Resolution

Partials are resolved with priority:
1. `custom/frontend/layouts/public/_*.html` (highest)
2. `plugins/*/frontend/layouts/public/_*.html`
3. `@typus-core/frontend/src/layouts/public/_*.html` (fallback)

## Handlebars Variables

### template.html
- `{{language}}` - Page language
- `{{theme}}` - Theme name
- `{{title}}` - Page title
- `{{siteName}}` - Site name
- `{{{content}}}` - Main content
- `{{{themeLinks}}}` - Theme CSS links

### _header.html
- `{{siteName}}` - Site name
- `{{navItems}}` - Navigation array `[{href, label, active}]`
- `{{themesManifest}}` - Themes array `[{name, title}]`

### _footer.html
- `{{siteName}}` - Site name
- `{{footerLinks}}` - Links array `[{href, label}]`
- `{{currentYear}}` - Current year

### _content-wrapper.html
- `{{{content}}}` - Rendered DXCE content
