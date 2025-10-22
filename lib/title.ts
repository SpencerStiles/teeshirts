const SMALL_WORDS = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'but',
  'by',
  'for',
  'in',
  'nor',
  'of',
  'on',
  'or',
  'per',
  'the',
  'to',
  'vs',
  'via',
]);

const DEFAULT_ACRONYMS = new Set(['usa', 'us', 'usmc', 'usaf', 'ptsd', 'sgt', 'nco']);
const SLUG_PATTERN = /^[a-z0-9]+(?:[-_][a-z0-9]+)+$/i;
const WORD_DELIMITER = /[-_]+/g;

export function humanizeSlugTitle(rawTitle: string, fallback?: string): string {
  const trimmed = (rawTitle ?? '').trim();
  const fallbackTrimmed = (fallback ?? '').trim();
  const source = trimmed || fallbackTrimmed;
  if (!source) return '';

  if (!SLUG_PATTERN.test(source)) {
    return trimmed || source;
  }

  const words = source.split(WORD_DELIMITER).filter(Boolean);
  if (words.length === 0) {
    return trimmed || source;
  }

  const humanized = words
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (DEFAULT_ACRONYMS.has(lower)) {
        return lower.toUpperCase();
      }
      const noVowels = !/[aeiou]/i.test(lower);
      if (noVowels && lower.length <= 4) {
        return lower.toUpperCase();
      }
      if (index !== 0 && index !== words.length - 1 && SMALL_WORDS.has(lower)) {
        return lower;
      }
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');

  return humanized.trim();
}
