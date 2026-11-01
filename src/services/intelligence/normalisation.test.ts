import { describe, expect, it } from 'vitest';

import { canonicaliseIpv6, normaliseObservable, observableKey } from './normalisation';

describe('normaliseObservable', () => {
  it('preserves the original value while normalising IPv4', () => {
    const result = normaliseObservable('  192.0.2.14  ');

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.observable.ioc).toEqual({ type: 'ipv4', value: '192.0.2.14' });
    expect(result.observable.original).toBe('192.0.2.14');
  });

  it('canonicalises IPv6 to a single RFC 5952 form', () => {
    const canonical = canonicaliseIpv6('2001:0DB8:0000:0000:0000:0000:0000:0019');

    expect(canonical).toBe('2001:db8::19');
    expect(canonicaliseIpv6('2001:DB8:4::19')).toBe('2001:db8:4::19');
    expect(canonicaliseIpv6('::FFFF:192.0.2.1')).toBe('::ffff:c000:201');

    const result = normaliseObservable('2001:0DB8:0000:0000:0000:0000:0000:0019');

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.observable.ioc.value).toBe('2001:db8::19');
    }
  });

  it('lowercases domains and removes a single trailing dot', () => {
    const result = normaliseObservable('UPDATE.Example.ORG.');

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.observable.ioc).toEqual({ type: 'domain', value: 'update.example.org' });
    expect(result.observable.original).toBe('UPDATE.Example.ORG.');
  });

  it('collapses equivalent case and trailing-dot domain variants onto one key', () => {
    const upper = normaliseObservable('Update.Example.org.');
    const lower = normaliseObservable('update.example.org');

    expect(upper.ok && lower.ok).toBe(true);

    if (upper.ok && lower.ok) {
      expect(observableKey(upper.observable.ioc)).toBe(observableKey(lower.observable.ioc));
    }
  });

  it('canonicalises URLs without dereferencing them', () => {
    const result = normaliseObservable('HTTPS://Portal.Example.NET:443/verify/account#fragment');

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.observable.ioc.type).toBe('url');
    expect(result.observable.ioc.value).toBe('https://portal.example.net/verify/account');
    expect(result.observable.original).toBe(
      'HTTPS://Portal.Example.NET:443/verify/account#fragment',
    );
  });

  it('lowercases file hashes and keeps their algorithm', () => {
    const md5 = normaliseObservable('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
    const sha1 = normaliseObservable('BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB');
    const sha256 = normaliseObservable(
      'CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC',
    );

    expect(md5.ok && md5.observable.ioc.type === 'md5').toBe(true);
    expect(sha1.ok && sha1.observable.ioc.type === 'sha1').toBe(true);
    expect(sha256.ok && sha256.observable.ioc.type === 'sha256').toBe(true);

    if (md5.ok) {
      expect(md5.observable.ioc.value).toBe('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
    }
  });

  it('rejects malformed and unsupported values', () => {
    const rejected = [
      '',
      '   ',
      'not an observable',
      '1.2.3.4 5.6.7.8',
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      '256.0.0.1',
      'example',
      'a'.repeat(31),
      42,
      null,
      undefined,
      { value: '192.0.2.1' },
    ];

    for (const candidate of rejected) {
      const result = normaliseObservable(candidate);

      expect(result.ok, `expected rejection for ${String(candidate)}`).toBe(false);
    }
  });

  it('never returns the rejected value inside the reason', () => {
    const result = normaliseObservable('192.0.2.999');

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.reason.length).toBeGreaterThan(0);
      expect(result.reason).not.toContain('192.0.2.999');
    }
  });
});
