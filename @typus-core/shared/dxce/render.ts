const widthClassByValue: Record<string, string> = {
  '25': 'w-25',
  '33': 'w-33',
  '50': 'w-50',
  '66': 'w-66',
  '75': 'w-75',
  '100': 'w-100'
};

const alignClassByValue: Record<string, string> = {
  left: 'align-left',
  center: 'align-center',
  right: 'align-right'
};

const typeClassByValue: Record<string, string> = {
  text: 'text',
  heading: 'heading',
  image: 'image',
  'text-image': 'text-image',
  list: 'list',
  table: 'table',
  quote: 'quote',
  code: 'code'
};

const aspectRatioValue: Record<string, string> = {
  '16:9': '16 / 9',
  '4:3': '4 / 3',
  '1:1': '1 / 1'
};

const INLINE_WIDTH_PROPS = ['display', 'flex', 'flex-basis', 'max-width', 'min-width', 'width'];

const isDocument = (node: ParentNode | Document): node is Document => 'body' in node;

const ensureBody = (doc: Document): HTMLElement => {
  if (doc.body) return doc.body as HTMLElement;
  const body = doc.createElement('body');
  doc.appendChild(body);
  return body;
};

const defaultCreateDocument = (): ((html: string) => Document) | null => {
  if (typeof window === 'undefined' || typeof window.DOMParser === 'undefined') {
    return null;
  }
  return (html: string) => {
    return new window.DOMParser().parseFromString(html, 'text/html');
  };
};

const HTMLElementCtor: typeof HTMLElement | undefined =
  typeof HTMLElement === 'undefined' ? undefined : HTMLElement;

const isElementNode = (node: unknown): node is HTMLElement => {
  if (!node || typeof node !== 'object') return false;
  if (HTMLElementCtor) {
    return node instanceof HTMLElementCtor;
  }
  // Fallback for environments without global HTMLElement (e.g., linkedom)
  return typeof (node as { getAttribute?: unknown }).getAttribute === 'function';
};

const cleanLegacyInlineStyles = (el: HTMLElement) => {
  INLINE_WIDTH_PROPS.forEach((prop) => el.style.removeProperty(prop));
  if (!el.getAttribute('style')) return;
  if (el.getAttribute('style')?.trim() === '') {
    el.removeAttribute('style');
  }
};

const applyContentLayout = (el: HTMLElement) => {
  const align = el.getAttribute('data-dxce-content-align') || el.getAttribute('data-dxce-align-row') || '';
  if (align === 'center' || align === 'right' || align === 'justify') {
    el.style.textAlign = align;
  } else if (align === 'left') {
    el.style.removeProperty('text-align');
  }

  const fontSizeAttr = el.getAttribute('data-dxce-font-size');
  if (fontSizeAttr) {
    const size = Number.parseInt(fontSizeAttr, 10);
    if (Number.isFinite(size) && size > 0) {
      el.style.fontSize = `${size}px`;
    }
  }

  if (el.getAttribute('data-dxce-type') === 'image') {
    const img = el.querySelector('img') as HTMLImageElement | null;
    if (!img) return;

    img.style.display = 'block';
    img.style.width = '100%';

    const heightAttr = el.getAttribute('data-dxce-height');
    const aspectAttr = el.getAttribute('data-dxce-aspect-ratio');

    if (aspectAttr && aspectAttr !== 'free') {
      const ratio = aspectRatioValue[aspectAttr];
      if (ratio) {
        img.style.aspectRatio = ratio;
        img.style.height = 'auto';
        img.style.objectFit = 'cover';
      }
    } else if (heightAttr) {
      const height = Number.parseInt(heightAttr, 10);
      if (Number.isFinite(height) && height > 0) {
        img.style.height = `${height}px`;
        img.style.objectFit = 'cover';
      } else {
        img.style.height = 'auto';
      }
    } else {
      img.style.height = 'auto';
    }
  }
};

const addClassToNodeList = (nodes: NodeListOf<Element>, className: string) => {
  nodes.forEach((el) => {
    if (!isElementNode(el)) return;
    if (!el.classList.contains(className)) {
      el.classList.add(className);
    }
  });
};

const applyThemeContentClasses = (node: HTMLElement) => {
  const typeAttr = node.getAttribute('data-dxce-type') || '';

  addClassToNodeList(node.querySelectorAll('h1'), 'theme-typography-content-h1');
  addClassToNodeList(node.querySelectorAll('h2'), 'theme-typography-content-h2');
  addClassToNodeList(node.querySelectorAll('h3'), 'theme-typography-content-h3');
  addClassToNodeList(node.querySelectorAll('h4'), 'theme-typography-content-h4');
  addClassToNodeList(node.querySelectorAll('h5'), 'theme-typography-content-h5');
  addClassToNodeList(node.querySelectorAll('h6'), 'theme-typography-content-h6');

  addClassToNodeList(node.querySelectorAll('p'), 'theme-typography-content-p');
  addClassToNodeList(node.querySelectorAll('a'), 'theme-typography-content-a');
  addClassToNodeList(node.querySelectorAll('ul'), 'theme-typography-content-ul');
  addClassToNodeList(node.querySelectorAll('ol'), 'theme-typography-content-ol');
  addClassToNodeList(node.querySelectorAll('li'), 'theme-typography-content-li');
  addClassToNodeList(node.querySelectorAll('blockquote'), 'theme-typography-content-blockquote');
  addClassToNodeList(node.querySelectorAll('code'), 'theme-typography-content-code');
  addClassToNodeList(node.querySelectorAll('pre'), 'theme-typography-content-pre');
};

const wrapBlock = (node: HTMLElement) => {
  const doc = node.ownerDocument;
  if (!doc) return;

  const wrapper = doc.createElement('div');
  wrapper.classList.add('block', 'block-item');

  const widthAttr = node.getAttribute('data-dxce-width') || '';
  wrapper.classList.add(widthClassByValue[widthAttr] ?? 'w-100');

  const alignAttr = node.getAttribute('data-dxce-align-row') || '';
  wrapper.classList.add(alignClassByValue[alignAttr] ?? 'align-left');

  if (node.getAttribute('data-dxce-type') === 'heading') {
    wrapper.classList.add('full-row');
  }

  const inner = doc.createElement('div');
  inner.classList.add('inner');
  const content = doc.createElement('div');
  content.classList.add('content');

  const parent = node.parentElement;
  if (!parent) return;

  parent.replaceChild(wrapper, node);
  content.appendChild(node);
  inner.appendChild(content);
  wrapper.appendChild(inner);
};

export const applyDxceStaticLayout = (rootNode: ParentNode | Document): void => {
  const scope = (isDocument(rootNode) ? ensureBody(rootNode) : rootNode) as ParentNode & Element;
  if (!scope || typeof scope.querySelectorAll !== 'function') return;

  const blocks = Array.from(scope.querySelectorAll('[data-dxce-type]'));
  if (!blocks.length) return;

  blocks.forEach((node) => {
    if (!isElementNode(node)) return;
    if (!node.closest('.block')) {
      wrapBlock(node);
    }
    const typeAttr = node.getAttribute('data-dxce-type') || '';
    const typeClass = typeClassByValue[typeAttr];
    if (typeClass) {
      node.classList.add(typeClass);
    }
    cleanLegacyInlineStyles(node);
    applyContentLayout(node);
    applyThemeContentClasses(node);
  });
};

export interface RenderDxceHtmlOptions {
  createDocument?: (html: string) => Document;
}

export const renderDxceHtml = (html: string, options?: RenderDxceHtmlOptions): string => {
  if (!html?.trim()) return html || '';

  const createDoc = options?.createDocument ?? defaultCreateDocument();
  if (!createDoc) {
    throw new Error('[renderDxceHtml] No DOM implementation available. Provide createDocument().');
  }

  const doc = createDoc(`<!DOCTYPE html><html><body>${html}</body></html>`);
  const body = isDocument(doc) ? ensureBody(doc) : (doc as unknown as HTMLElement);
  applyDxceStaticLayout(body);
  return body.innerHTML;
};
