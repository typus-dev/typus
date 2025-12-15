export class SeoGenerationRequestDto {
  cmsItemId: number;
  type: 'seo-generation';
  options?: {
    includeKeywords?: boolean;
    maxTitleLength?: number;
    maxDescriptionLength?: number;
  };

  constructor(data: any) {
    this.cmsItemId = data.cmsItemId;
    this.type = data.type;
    this.options = data.options || {};
  }
}

export class SeoGenerationResponseDto {
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  ogTitle: string;
  ogDescription: string;

  constructor(data: any) {
    this.metaTitle = data.metaTitle;
    this.metaDescription = data.metaDescription;
    this.metaKeywords = data.metaKeywords;
    this.ogTitle = data.ogTitle;
    this.ogDescription = data.ogDescription;
  }
}
