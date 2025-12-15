# Theme Template

This is the complete reference theme with all 366 themeable CSS classes.

**⚠️ DO NOT USE DIRECTLY** — This template is for creating new themes, not for production use.

## How to Use This Template

### Creating a New Theme

1. **Copy to custom directory:**
   ```bash
   cp -r public/styles/_template custom/styles/themes/my-theme
   ```

2. **Edit manifest.json:**
   ```bash
   cd custom/styles/themes/my-theme
   nano manifest.json
   ```

   Example:
   ```json
   {
     "name": "my-theme",
     "title": "My Beautiful Theme",
     "icon": "ri:palette-line",
     "type": "dark",
     "description": "Custom theme for my project"
   }
   ```

3. **Customize CSS files:**
   - Start with `00-tokens.css` (CSS variables)
   - Modify component styles as needed
   - Keep the `[data-theme="..."]` selector structure

4. **Build and test:**
   ```bash
   cd @typus-core/frontend
   npm run build:themes
   docker compose restart
   ```

## File Structure

Each CSS file serves a specific purpose and loads in order:

| File | Purpose | Priority |
|------|---------|----------|
| `00-tokens.css` | CSS custom properties (colors, spacing, fonts) | Required |
| `01-base.css` | Base HTML element styles | Required |
| `02-typography.css` | Headings, paragraphs, text styles | Optional |
| `03-content.css` | Content blocks and rich text | Optional |
| `04-colors.css` | Color utility classes | Optional |
| `05-layout.css` | Layout components (containers, grids) | Optional |
| `06-components.css` | UI components (buttons, cards, modals) | Optional |
| `07-mixins.css` | Reusable CSS patterns | Optional |
| `08-icons.css` | Icon styles | Optional |
| `09-interactions.css` | Hover, focus, active states | Optional |
| `10-logo-print.css` | Logo and print-specific styles | Optional |
| `99-overrides.css` | Final tweaks and overrides | Optional |

## CSS Variables Reference

### Colors
```css
--color-primary
--color-primary-hover
--color-bg-base
--color-bg-elevated
--color-text-primary
--color-text-secondary
--color-border
```

### Button Accent Roles
- `--color-primary` / `accent` — базовый фон кнопки.
- `--color-primary-hover` / `accentSolid` — насыщённое состояние для hover/active.
- `--color-primary-light` / `accentLight` — светлый оттенок для outline/ghost и эффектов.

Убедитесь, что эти оттенки различимы, чтобы hover не сливался с текстом.

### Spacing
```css
--spacing-xs
--spacing-sm
--spacing-md
--spacing-lg
--spacing-xl
```

### Typography
```css
--font-family-base
--font-family-heading
--font-family-mono
--font-size-base
--line-height-base
```

### Border Radius
```css
--radius-sm
--radius-md
--radius-lg
--radius-full
```

See `00-tokens.css` for complete list of available variables.

## Theme Selector Pattern

All theme styles must use the `[data-theme="theme-name"]` selector:

```css
[data-theme="my-theme"] {
  --color-primary: #3b82f6;
}

[data-theme="my-theme"] .btn-primary {
  background: var(--color-primary);
}
```

## Best Practices

1. **Start minimal** — Only include files you need to customize
2. **Use CSS variables** — Reference `--color-primary` not hardcoded hex values
3. **Keep selectors scoped** — Always use `[data-theme="..."]` prefix
4. **Test both themes** — If supporting light/dark, create both variants
5. **Document changes** — Add comments explaining theme-specific decisions
6. **Выдерживайте палитру** — перед копированием значений убедитесь, что все `bg*/text*/border*` токены принадлежат одной температуре (тёплой или холодной). Генератор не коррелирует оттенки автоматически, поэтому смешанные цвета дадут непредсказуемые ховеры/selected состояния.

## Total Classes

This template includes **366 themeable classes** covering:
- Layout primitives
- Typography variants
- Component styles
- Color utilities
- Interactive states
- Print styles

## Examples

For working examples, see:
- `public/styles/themes/typus-dark/` — Production dark theme
- `public/styles/themes/typus-landing/` — Landing page theme

## Troubleshooting

### Theme not appearing
1. Check `manifest.json` is valid JSON
2. Ensure theme name matches directory name
3. Run `npm run build:themes`
4. Check generated `themes.json` includes your theme

### Styles not applying
1. Clear browser cache
2. Verify `data-theme` attribute in HTML
3. Check browser DevTools for CSS file 404s
4. Ensure CSS file paths are correct

## Related Documentation

- [Custom Themes Guide](../../../custom/styles/themes/README.md)
- [Theming Documentation](../../../docs/THEMING.md)
