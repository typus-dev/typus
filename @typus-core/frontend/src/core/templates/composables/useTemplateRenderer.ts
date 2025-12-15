/**
 * useTemplateRenderer - renders HTML templates in Vue components
 *
 * Concept:
 * - HTML templates are the source of truth
 * - Vue layouts read and render HTML dynamically
 * - Handlebars syntax support
 * - Priority: custom > plugin > core
 */

import { ref, computed, h, onMounted, watch } from "vue";
import Handlebars from "handlebars";

interface TemplateContext {
  [key: string]: any;
}

interface TemplateSection {
  header?: string;
  main?: string;
  footer?: string;
  sidebar?: string;
}

/**
 * Loads HTML template with priority custom > plugin > core
 */
async function loadTemplate(
  path: string,
  pluginName?: string,
): Promise<string | null> {
  const paths = [
    `/custom/frontend/templates/${path}`, // Priority 1: Custom
    pluginName ? `/plugins/${pluginName}/templates/${path}` : null, // Priority 2: Plugin
    `/@typus-core/frontend/src/templates/${path}`, // Priority 3: Core
  ].filter(Boolean) as string[];

  for (const templatePath of paths) {
    try {
      const response = await fetch(templatePath);
      if (response.ok) {
        const html = await response.text();
        console.log(`✅ Loaded template from: ${templatePath}`);
        return html;
      }
    } catch (error) {
      // Try next path
      continue;
    }
  }

  console.error(`❌ Template not found: ${path}`);
  return null;
}

/**
 * Extracts sections from HTML by markers
 */
function extractSections(html: string): TemplateSection {
  const sections: TemplateSection = {};

  const sectionNames = ["HEADER", "MAIN", "FOOTER", "SIDEBAR"];

  for (const name of sectionNames) {
    const startMarker = `<!-- ${name}_START -->`;
    const endMarker = `<!-- ${name}_END -->`;

    const startIdx = html.indexOf(startMarker);
    const endIdx = html.indexOf(endMarker);

    if (startIdx !== -1 && endIdx !== -1) {
      const content = html
        .substring(startIdx + startMarker.length, endIdx)
        .trim();

      sections[name.toLowerCase() as keyof TemplateSection] = content;
    }
  }

  return sections;
}

/**
 * Renders Handlebars template with context
 */
function renderHandlebars(template: string, context: TemplateContext): string {
  try {
    const compiled = Handlebars.compile(template);
    return compiled(context);
  } catch (error) {
    console.error("Handlebars render error:", error);
    return template;
  }
}

/**
 * Converts HTML to Vue VNode (simplified)
 * For full support, HTML -> VNode parser is needed
 */
function htmlToVNode(html: string) {
  // Simple render via v-html
  // TODO: for production use full HTML parser
  return h("div", { innerHTML: html });
}

/**
 * Main composable
 */
export function useTemplateRenderer(templatePath: string, pluginName?: string) {
  const templateHTML = ref<string | null>(null);
  const sections = ref<TemplateSection>({});
  const isLoading = ref(true);
  const error = ref<string | null>(null);

  // Load template
  async function loadTemplateFile() {
    isLoading.value = true;
    error.value = null;

    try {
      const html = await loadTemplate(templatePath, pluginName);

      if (!html) {
        error.value = `Template not found: ${templatePath}`;
        return;
      }

      templateHTML.value = html;
      sections.value = extractSections(html);
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err);
      console.error("Template load error:", err);
    } finally {
      isLoading.value = false;
    }
  }

  onMounted(() => {
    loadTemplateFile();
  });

  /**
   * Renders section with context
   */
  function renderSection(
    sectionName: keyof TemplateSection,
    context: TemplateContext,
  ) {
    const sectionHTML = sections.value[sectionName];
    if (!sectionHTML) {
      return null;
    }

    const rendered = renderHandlebars(sectionHTML, context);
    return htmlToVNode(rendered);
  }

  /**
   * Renders entire template
   */
  function render(context: TemplateContext) {
    if (!templateHTML.value) {
      return null;
    }

    const rendered = renderHandlebars(templateHTML.value, context);
    return htmlToVNode(rendered);
  }

  return {
    templateHTML,
    sections,
    isLoading,
    error,
    renderSection,
    render,
    reload: loadTemplateFile,
  };
}

/**
 * Helper for use in components
 */
export function createTemplateComponent(
  templatePath: string,
  pluginName?: string,
) {
  return {
    setup(props: any, { slots }: any) {
      const { renderSection, isLoading, error } = useTemplateRenderer(
        templatePath,
        pluginName,
      );

      return () => {
        if (isLoading.value) {
          return h("div", { class: "loading" }, "Loading template...");
        }

        if (error.value) {
          return h("div", { class: "error" }, error.value);
        }

        // Render sections
        return h("div", { class: "template-layout" }, [
          renderSection("header", props),
          h("main", [
            slots.default?.(), // Vue slot for content
          ]),
          renderSection("footer", props),
        ]);
      };
    },
  };
}
