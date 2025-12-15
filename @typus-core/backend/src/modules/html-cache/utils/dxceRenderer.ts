import { parseHTML } from 'linkedom';
import { renderDxceHtml } from '@typus-core/shared/dxce/render';

const createDocument = (html: string): Document => {
  return parseHTML(html).document;
};

export const renderDxceContentForStaticCache = (html: string): string => {
  if (!html?.trim()) return html || '';
  const rendered = renderDxceHtml(html, { createDocument }) || '';
  return rendered.replace(/data-dxce-[^=]+="[^"]*"/g, '');
};
