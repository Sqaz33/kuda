import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveApiBase } from '../src/api-config.js';

test('explicit backend origin takes precedence on every platform', () => {
  for (const platform of ['web', 'android', 'ios'])
    assert.equal(
      resolveApiBase({ configured: ' https://api.example.test/ ', platform }),
      'https://api.example.test',
    );
});

test('development defaults use the web host and emulator loopbacks', () => {
  assert.equal(resolveApiBase({ platform: 'android' }), 'http://10.0.2.2:8787');
  assert.equal(resolveApiBase({ platform: 'ios' }), 'http://localhost:8787');
  assert.equal(
    resolveApiBase({ platform: 'web', hostname: '192.168.1.5' }),
    'http://192.168.1.5:8787',
  );
  assert.equal(
    resolveApiBase({ platform: 'web', hostname: 'demo.test', protocol: 'https:' }),
    'https://demo.test:8787',
  );
  assert.equal(resolveApiBase({ platform: 'web', hostname: '::1' }), 'http://[::1]:8787');
});

test('misconfigured base URLs fail before sending credentials to an unintended path', () => {
  for (const configured of [
    'https://api.test/v1',
    'https://api.test?token=secret',
    'https://user:password@api.test',
    'file:///api',
  ])
    assert.throws(() => resolveApiBase({ configured, platform: 'web' }));
});
