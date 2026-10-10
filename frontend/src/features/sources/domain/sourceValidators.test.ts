import { describe, expect, it } from 'vitest';
import {
  isValidHttpUrl,
  validateCreateBatch,
  validateReplaceSource,
} from '../domain/sourceValidators';

describe('sourceValidators', () => {
  describe('isValidHttpUrl', () => {
    it('accepts valid http and https URLs', () => {
      expect(isValidHttpUrl('https://elpais.com/rss/portada.xml')).toBe(true);
      expect(isValidHttpUrl('http://example.com/feed')).toBe(true);
    });

    it('rejects invalid or missing URLs', () => {
      expect(isValidHttpUrl('')).toBe(false);
      expect(isValidHttpUrl('not-a-url')).toBe(false);
      expect(isValidHttpUrl('ftp://example.com')).toBe(false);
    });
  });

  describe('validateCreateBatch', () => {
    it('returns errors when channel name is missing', () => {
      const errors = validateCreateBatch({
        channel: { name: '', continent: 'Europa' },
        sources: [
          {
            name: 'Portada',
            feedUrl: 'https://example.com/rss',
            iptcCategory: 'politics',
            language: 'es',
          },
        ],
      });
      expect(errors.channelName).toBe('El nombre del medio/canal es obligatorio');
    });

    it('returns errors when feeds list is empty or feeds have invalid URLs', () => {
      const errors = validateCreateBatch({
        channel: { name: 'El País', continent: 'Europa' },
        sources: [
          {
            name: 'Portada',
            feedUrl: 'invalid-url',
            iptcCategory: 'politics',
            language: 'es',
          },
        ],
      });
      expect(errors.sources?.[0]?.feedUrl).toBeDefined();
    });

    it('passes for valid input', () => {
      const errors = validateCreateBatch({
        channel: { name: 'BBC', continent: 'Europa' },
        sources: [
          {
            name: 'Mundo',
            feedUrl: 'https://feeds.bbci.co.uk/news/rss.xml',
            iptcCategory: 'politics',
            language: 'es',
          },
        ],
      });
      expect(Object.keys(errors).length).toBe(0);
    });
  });

  describe('validateReplaceSource', () => {
    it('validates single source replace input', () => {
      const err = validateReplaceSource({
        name: 'Nuevo feed',
        feedUrl: 'https://valid.com/rss',
        iptcCategory: 'sport',
        language: 'en',
        active: true,
      });
      expect(Object.keys(err).length).toBe(0);
    });
  });
});
