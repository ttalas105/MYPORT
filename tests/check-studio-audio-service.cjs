const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/app/studio/studio-audio.service.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true },
}).outputText;

function harness({ stored = {}, hidden = false, storageFails = false, hasWindow = true } = {}) {
  const preferences = new Map(Object.entries(stored));
  const listeners = [];
  const media = { id: 'studio-soundtrack-media' };
  const engines = [];
  const document = {
    hidden,
    defaultView: hasWindow ? { localStorage: {
      getItem(key) { if (storageFails) throw new Error('Storage blocked'); return preferences.get(key) ?? null; },
      setItem(key, value) { if (storageFails) throw new Error('Storage blocked'); preferences.set(key, value); },
    } } : null,
    querySelector(selector) { assert.equal(selector, '#studio-soundtrack-media'); return media; },
    addEventListener(type, callback, capture = false) { listeners.push({ type, callback, capture }); },
    removeEventListener(type, callback, capture = false) {
      const index = listeners.findIndex(item => item.type === type && item.callback === callback && item.capture === capture);
      assert.notEqual(index, -1, `Listener ${type} removed with the same capture setting`);
      listeners.splice(index, 1);
    },
  };
  class FakeStudioAudio {
    constructor(file, onState, enabled, volume, startAt, preloadedMedia) {
      Object.assign(this, { file, onState, enabled, volume, startAt, preloadedMedia, unlocks: 0, disposed: 0, hidden: [] });
      engines.push(this);
    }
    setEnabled(value) { this.enabled = value; }
    setVolume(value) { this.volume = value; }
    setOpenness(value) { this.openness = value; }
    setHidden(value) { this.hidden.push(value); }
    unlock() { this.unlocks++; }
    dispose() { this.disposed++; }
  }
  const signal = initial => {
    let value = initial;
    const read = () => value;
    read.set = next => { value = next; };
    read.asReadonly = () => () => value;
    return read;
  };
  const DOCUMENT = Symbol('DOCUMENT');
  const module = { exports: {} };
  const context = vm.createContext({
    module, exports: module.exports,
    require(name) {
      if (name === '@angular/common') return { DOCUMENT };
      if (name === '@angular/core') return {
        Injectable: () => target => target,
        inject(token) { assert.equal(token, DOCUMENT); return document; },
        signal,
      };
      if (name === './studio-audio') return { StudioAudio: FakeStudioAudio, STUDIO_MUSIC_DEFAULT_VOLUME: 50 };
      if (name === './studio-soundtrack') return { STUDIO_SOUNDTRACK: { file: '/fixture.m4a', startAtSeconds: 7.2 } };
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  vm.runInContext(compiled, context, { filename: 'studio-audio.service.js' });
  const service = new module.exports.StudioAudioService();
  assert.equal(engines.length, 1, 'Each service owns one engine');
  return {
    service, engine: engines[0], document, preferences, listeners, media,
    emit(type, options = {}) {
      const event = { isTrusted: true, target: { closest: () => null }, ...options };
      for (const listener of [...listeners]) if (listener.type === type) listener.callback(event);
    },
  };
}

let passed = 0;
function check(name, run) { run(); passed++; console.log(`PASS ${name}`); }

check('saved mute and volume initialize the engine before any interaction', () => {
  const h = harness({ stored: { 'studio-music-enabled': 'false', 'studio-music-volume': '62' } });
  assert.equal(h.service.enabled(), false);
  assert.equal(h.service.volume(), 62);
  assert.equal(h.engine.enabled, false);
  assert.equal(h.engine.volume, 62);
  assert.equal(h.engine.file, '/fixture.m4a');
  assert.equal(h.engine.startAt, 7.2);
  assert.equal(h.engine.preloadedMedia, h.media);
  h.emit('pointerdown');
  h.emit('click');
  h.emit('keydown');
  assert.equal(h.engine.unlocks, 0, 'Ordinary interactions respect saved mute');
  h.service.setEnabled(true);
  assert.equal(h.preferences.get('studio-music-enabled'), 'true');
  assert.equal(h.engine.enabled, true);
  h.emit('click');
  assert.equal(h.engine.unlocks, 1);
});

check('the first ordinary trusted interaction retries without requiring Music', () => {
  const h = harness();
  assert.equal(h.service.enabled(), true);
  assert.equal(h.engine.volume, 50);
  h.emit('pointerdown');
  assert.equal(h.engine.unlocks, 1, 'Retry occurs synchronously in the gesture handler');
  h.emit('click');
  h.emit('keydown');
  assert.equal(h.engine.unlocks, 3);
  h.emit('click', { isTrusted: false });
  h.emit('pointerdown', { target: { closest: selector => selector === '[data-audio-control]' ? {} : null } });
  assert.equal(h.engine.unlocks, 3, 'Synthetic events and audio controls do not duplicate retries');
});

check('volume is bounded, rounded and persisted; playback and room state stay observable', () => {
  for (const [stored, expected] of [['bad', 50], ['Infinity', 50], ['-4', 0], ['203', 100], ['42.7', 43]]) {
    const h = harness({ stored: { 'studio-music-volume': stored } });
    assert.equal(h.service.volume(), expected);
    assert.equal(h.engine.volume, expected);
  }
  const h = harness();
  for (const [value, expected] of [[-1, 0], [150, 100], [42.7, 43], [NaN, 50], [Infinity, 50]]) {
    h.service.setVolume(value);
    assert.equal(h.service.volume(), expected);
    assert.equal(h.engine.volume, expected);
    assert.equal(h.preferences.get('studio-music-volume'), String(expected));
  }
  assert.equal(h.service.state(), 'loading');
  h.engine.onState('waiting');
  assert.equal(h.service.state(), 'waiting');
  h.engine.onState('playing');
  assert.equal(h.service.state(), 'playing');
  h.service.setOpenness(0.62);
  assert.equal(h.service.openness(), 0.62);
  assert.equal(h.engine.openness, 0.62);
});

check('blocked or absent storage still allows preferences for this visit', () => {
  for (const options of [{ storageFails: true }, { hasWindow: false }]) {
    const h = harness(options);
    assert.equal(h.service.enabled(), true);
    assert.equal(h.service.volume(), 50);
    h.service.setEnabled(false);
    h.service.setVolume(17);
    assert.equal(h.service.enabled(), false);
    assert.equal(h.engine.enabled, false);
    assert.equal(h.service.volume(), 17);
    assert.equal(h.engine.volume, 17);
  }
});

check('visibility is forwarded and destruction releases every listener and engine', () => {
  const h = harness({ hidden: true });
  assert.deepEqual(h.engine.hidden, [true]);
  h.document.hidden = false;
  h.emit('visibilitychange');
  h.document.hidden = true;
  h.emit('visibilitychange');
  assert.deepEqual(h.engine.hidden, [true, false, true]);
  assert.equal(h.listeners.length, 4);
  h.service.ngOnDestroy();
  assert.equal(h.engine.disposed, 1);
  assert.equal(h.listeners.length, 0);
  h.emit('click');
  h.emit('visibilitychange');
  assert.equal(h.engine.unlocks, 0);
  assert.deepEqual(h.engine.hidden, [true, false, true]);
});

console.log(`${passed} studio audio service checks passed.`);
