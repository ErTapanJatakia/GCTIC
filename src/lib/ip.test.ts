import { describe, expect, it } from 'vitest';

import { classifyIpv4, isIpv4, isIpv6, isNonPublicIpv4 } from './ip';

describe('isIpv4', () => {
  it('accepts canonical dotted-quad addresses', () => {
    expect(isIpv4('192.168.1.10')).toBe(true);
    expect(isIpv4('0.0.0.0')).toBe(true);
    expect(isIpv4('255.255.255.255')).toBe(true);
  });

  it('rejects malformed or ambiguous forms', () => {
    expect(isIpv4('256.1.1.1')).toBe(false);
    expect(isIpv4('01.2.3.4')).toBe(false);
    expect(isIpv4('1.2.3')).toBe(false);
    expect(isIpv4('1.2.3.4.5')).toBe(false);
    expect(isIpv4('1.2.3.4 ')).toBe(true); // trimmed
    expect(isIpv4('1.2.3.-1')).toBe(false);
    expect(isIpv4(null)).toBe(false);
  });
});

describe('classifyIpv4', () => {
  it('classifies address space without asserting intent', () => {
    expect(classifyIpv4('8.8.8.8')).toBe('public');
    expect(classifyIpv4('10.0.0.1')).toBe('private');
    expect(classifyIpv4('172.20.0.1')).toBe('private');
    expect(classifyIpv4('192.168.0.1')).toBe('private');
    expect(classifyIpv4('127.0.0.1')).toBe('loopback');
    expect(classifyIpv4('169.254.10.5')).toBe('link-local');
    expect(classifyIpv4('100.64.0.1')).toBe('cgnat');
    expect(classifyIpv4('192.0.2.10')).toBe('documentation');
    expect(classifyIpv4('224.0.0.1')).toBe('multicast');
    expect(classifyIpv4('0.0.0.0')).toBe('unspecified');
    expect(classifyIpv4('255.255.255.255')).toBe('reserved');
  });

  it('returns null for invalid input', () => {
    expect(classifyIpv4('not-an-ip')).toBeNull();
  });

  it('flags non-public addresses for interpretation', () => {
    expect(isNonPublicIpv4('10.1.2.3')).toBe(true);
    expect(isNonPublicIpv4('8.8.4.4')).toBe(false);
    expect(isNonPublicIpv4('garbage')).toBe(false);
  });
});

describe('isIpv6', () => {
  it('accepts full, compressed and IPv4-embedded forms', () => {
    expect(isIpv6('2001:4860:4860:0000:0000:0000:0000:8888')).toBe(true);
    expect(isIpv6('2001:db8::1')).toBe(true);
    expect(isIpv6('::1')).toBe(true);
    expect(isIpv6('::ffff:192.168.1.1')).toBe(true);
  });

  it('rejects malformed forms and zone identifiers', () => {
    expect(isIpv6('2001:db8:::1')).toBe(false);
    expect(isIpv6('fe80::1%eth0')).toBe(false);
    expect(isIpv6('2001:db8:0:0:0:0:0:0:1')).toBe(false);
    expect(isIpv6('192.168.1.1')).toBe(false);
    expect(isIpv6(42)).toBe(false);
  });
});
