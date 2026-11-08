const assert = require('node:assert/strict');
const vm = require('node:vm');
const esbuild = require('esbuild');

async function fixture(native, failOnce = false) {
  const calls = { initialize: 0, tokens: 0, native: 0 };
  let provider;
  const deps = {
    'firebase/app-check': {
      initializeAppCheck: (app, options) => { calls.initialize++; provider = options.provider; assert.equal(options.isTokenAutoRefreshEnabled, true); return {}; },
      ReCaptchaEnterpriseProvider: class { constructor(key) { this.key = key; } },
      CustomProvider: class { constructor(options) { this.getToken = options.getToken; } },
      getToken: async () => { calls.tokens++; if (failOnce) { failOnce = false; throw new Error('appCheck/token-error'); } if (provider.getToken) return provider.getToken(); return { token: 'verified-web' }; },
    },
    '@capacitor/core': { Capacitor: { isNativePlatform: () => native } },
    '@capacitor-firebase/app-check': { FirebaseAppCheck: {
      initialize: async options => { calls.native++; assert.equal(options.debug, undefined); assert.equal(options.debugToken, undefined); },
      getToken: async () => ({ token: 'verified-native', expireTimeMillis: Date.now() + 3600000 }),
    } },
    fb: { app: {} },
  };
  const built = await esbuild.build({ entryPoints: ['src/lib/aiClient.js'], bundle: true, platform: 'node', format: 'cjs', write: false,
    plugins: [{ name: 'mock-providers', setup(build) {
      build.onResolve({ filter: /^(firebase\/app-check|@capacitor\/core|@capacitor-firebase\/app-check)$|\.\/fb\.js$/ }, args => ({ path: args.path.endsWith('fb.js') ? 'fb' : args.path, namespace: 'mock' }));
      build.onLoad({ filter: /.*/, namespace: 'mock' }, args => ({ contents: `module.exports = deps[${JSON.stringify(args.path)}]` }));
    } }],
  });
  const context = { module: { exports: {} }, deps };
  vm.runInNewContext(built.outputFiles[0].text, context);
  return { api: context.module.exports, calls, provider: () => provider };
}

(async () => {
  for (const native of [false, true]) {
    const f = await fixture(native);
    await Promise.all([f.api.prepareAI(), f.api.prepareAI(), f.api.prepareAI()]);
    assert.equal(f.calls.initialize, 1, 'Concurrent menu/offer calls share App Check');
    assert.equal(f.calls.native, native ? 1 : 0);
    assert.equal(f.calls.tokens, 3);
    if (native) assert.equal((await f.provider().getToken()).token, 'verified-native');
    else assert(f.provider().key.startsWith('6L'));
    assert(f.api.isAIAccessError(new Error('[401] Firebase App Check token is invalid')));
    assert(!f.api.isAIAccessError(new Error('[404] model not found')));
  }
  const retry = await fixture(false, true);
  await assert.rejects(retry.api.prepareAI(), /App Check verification failed/);
  await retry.api.prepareAI();
  assert.equal(retry.calls.initialize, 1, 'Token retry must not initialize App Check twice');
  console.log('PASS: web verification, native token bridge, concurrent initialization, token retry and access-error handling');
})().catch(error => { console.error(error); process.exitCode = 1; });
