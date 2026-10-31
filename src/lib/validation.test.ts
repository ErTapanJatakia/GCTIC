import { describe, expect, it } from 'vitest';

import {
  clampConfidence,
  detectIocType,
  isHttpUrl,
  isIsoTimestamp,
  parseHttpUrl,
  sanitisePlainText,
  validateIoc,
} from './validation';

describe('sanitisePlainText', () => {
  it('strips control characters and collapses whitespace', () => {
    expect(sanitisePlainText('  APT\u0000-29\u001f  report  ')).toBe('APT -29 report');
  });

  it('bounds the output to the requested length', () => {
    expect(sanitisePlainText('x'.repeat(100), 12)).toHaveLength(12);
  });

  it('returns an empty string for non-string input', () => {
    expect(sanitisePlainText(null)).toBe('');
    expect(sanitisePlainText(42)).toBe('');
    expect(sanitisePlainText({ value: 'x' })).toBe('');
  });
});

describe('parseHttpUrl', () => {
  it('accepts absolute http and https URLs', () => {
    expect(parseHttpUrl('https://example.org/report/2026')?.hostname).toBe('example.org');
    expect(parseHttpUrl('http://example.org')?.protocol).toBe('http:');
  });

  it('rejects non-web and credential-bearing URLs', () => {
    expect(parseHttpUrl('javascript:alert(1)')).toBeNull();
    expect(parseHttpUrl('data:text/html;base64,PHNjcmlwdD4=')).toBeNull();
    expect(parseHttpUrl('file:///etc/passwd')).toBeNull();
    expect(parseHttpUrl('https://user:secret@example.org')).toBeNull();
  });

  it('rejects oversized and relative values', () => {
    expect(parseHttpUrl(`https://example.org/${'a'.repeat(2_100)}`)).toBeNull();
    expect(isHttpUrl('/relative/path')).toBe(false);
  });
});

describe('detectIocType', () => {
  it('classifies supported observable types', () => {
    expect(detectIocType('8.8.8.8')).toBe('ipv4');
    expect(detectIocType('2001:4860:4860::8888')).toBe('ipv6');
    expect(detectIocType('Example.ORG')).toBe('domain');
    expect(detectIocType('https://example.org/beacon')).toBe('url');
    expect(detectIocType('d41d8cd98f00b204e9800998ecf8427e')).toBe('md5');
    expect(detectIocType('da39a3ee5e6b4b0d3255bfef95601890afd80709')).toBe('sha1');
    expect(
      detectIocType('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'),
    ).toBe('sha256');
  });

  it('returns null for unsupported values', () => {
    expect(detectIocType('not an observable')).toBeNull();
    expect(detectIocType('javascript:alert(1)')).toBeNull();
    expect(detectIocType('')).toBeNull();
    expect(detectIocType(null)).toBeNull();
  });
});

describe('validateIoc', () => {
  it('normalises domains and hashes', () => {
    const domain = validateIoc('Example.ORG.');
    expect(domain).toEqual({ ok: true, ioc: { type: 'domain', value: 'example.org' } });

    const hash = validateIoc('D41D8CD98F00B204E9800998ECF8427E');
    expect(hash).toEqual({
      ok: true,
      ioc: { type: 'md5', value: 'd41d8cd98f00b204e9800998ecf8427e' },
    });
  });

  it('rejects values containing whitespace or control characters', () => {
    const result = validateIoc('8.8.8.8 1.1.1.1');
    expect(result.ok).toBe(false);
  });

  it('reports a reason for unsupported observables', () => {
    const result = validateIoc('admin@example.org');
    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.reason).toContain('Unsupported observable type');
    }
  });

  it('never treats validation as an assessment of maliciousness', () => {
    const result = validateIoc('10.0.0.5');
    expect(result.ok).toBe(true);
    expect(result).not.toHaveProperty('malicious');
  });
});

describe('clampConfidence', () => {
  it('bounds values into the 0-100 range and rounds', () => {
    expect(clampConfidence(-42)).toBe(0);
    expect(clampConfidence(148)).toBe(100);
    expect(clampConfidence(72.6)).toBe(73);
    expect(clampConfidence(Number.NaN)).toBe(0);
    expect(clampConfidence('80')).toBe(0);
  });
});

describe('isIsoTimestamp', () => {
  it('accepts parseable timestamps only', () => {
    expect(isIsoTimestamp('2026-10-31T20:16:00.000Z')).toBe(true);
    expect(isIsoTimestamp('2026-10-31')).toBe(true);
    expect(isIsoTimestamp('not-a-date')).toBe(false);
    expect(isIsoTimestamp('2026-13-45')).toBe(false);
    expect(isIsoTimestamp(1_790_000_000)).toBe(false);
  });
});
