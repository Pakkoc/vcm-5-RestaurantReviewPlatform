const HTML_TAG_PATTERN = /<[^>]*>/g;
const WHITESPACE_PATTERN = /\s+/g;

export const stripHtmlTags = (value: string): string =>
  value.replace(HTML_TAG_PATTERN, " ");

export const normalizeWhitespace = (value: string): string =>
  value.replace(WHITESPACE_PATTERN, " ").trim();

export const toPlainText = (
  value: string | null | undefined,
): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  return normalizeWhitespace(stripHtmlTags(value));
};

export const sanitizeSearchKeyword = (value: string): string =>
  normalizeWhitespace(value);
