import { describe, expect, it } from 'vitest';
import { toProductSlug } from '../src/utils/product';

describe('toProductSlug', () => {
  it('creates a URL-safe product slug', () => {
    expect(toProductSlug('  Men’s Classic Blazer  ')).toBe('men-s-classic-blazer');
  });

  it('normalizes accented characters and trims separators', () => {
    expect(toProductSlug('  Café linen  ')).toBe('cafe-linen');
  });
});
