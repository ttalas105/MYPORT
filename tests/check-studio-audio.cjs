// Focused behavior checks without a browser, network request, or project build.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/app/studio/studio-audio.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-12, `${actual} should equal ${expected}`);

function harness({ failGraph = false } = {}) {
  const media = [], contexts = [], timers = new Map();
  let timerId = 0;
  class Events {
    listeners = new Map();
    addEventListener(type, callback) {
      if (!this.listeners.has(type)) this.listeners.set(type, new Set());
      this.listeners.get(type).add(callback);
    }
    removeEventListener(type, callback) { this.listeners.get(type)?.delete(callback); }
    emit(type) { for (const callback of this.listeners.get(type) ?? []) callback(); }
    listenerCount() { return [...this.listeners.values()].reduce((sum, group) => sum + group.size, 0); }
  }
  class Param {
    value = 1;
    ramps = [];
    cancelScheduledValues() {}
    setValueAtTime(value) { this.value = value; }
    linearRampToValueAtTime(value, time) { this.value = value; this.ramps.push({ value, time }); }
  }
  class Node {
    connections = [];
    disconnectCalls = 0;
    gain = new Param();
    frequency = new Param();
    Q = new Param();
    connect(node) { this.connections.push(node); return node; }
    disconnect() { this.disconnectCalls++; this.connections = []; }
  }
  class FakeAudio extends Events {
    paused = true;
    readyState = 0;
    duration = NaN;
    playbackTime = 0;
    seeks = [];
    preloadAtPlay = [];
    plays = [];
    pauseCalls = 0;
    loadCalls = 0;
    removeCalls = 0;
    srcWrites = 0;
    sourceValue = '';
    inDocument = false;
    sourceAssigned = false;
    error = null;
    constructor() { super(); media.push(this); }
    get src() { return this.sourceValue; }
    set src(value) { this.sourceValue = value; this.srcWrites++; }
    getAttribute(name) { return name === 'src' ? this.sourceValue || null : null; }
    get currentTime() { return this.playbackTime; }
    set currentTime(value) { this.playbackTime = value; this.seeks.push(value); }
    metadata(duration) { this.duration = duration; this.readyState = Math.max(1, this.readyState); this.emit('loadedmetadata'); }
    play() { const request = deferred(); this.plays.push(request); this.preloadAtPlay.push(this.preload); this.paused = false; return request.promise; }
    pause() {
      this.pauseCalls++;
      if (!this.paused) { this.paused = true; this.emit('pause'); }
    }
    load() { this.loadCalls++; this.error = null; this.paused = true; this.readyState = 0; }
    removeAttribute(name) { if (name === 'src') this.sourceValue = ''; }
    remove() { this.removeCalls++; this.inDocument = false; }
    begin(index = this.plays.length - 1) {
      this.paused = false; this.readyState = 4; this.emit('playing'); this.plays[index].resolve();
    }
    block(index = this.plays.length - 1) {
      this.paused = true; this.plays[index].reject(new DOMException('Gesture required', 'NotAllowedError'));
    }
  }
  class FakeContext extends Events {
    state = 'suspended';
    currentTime = 1;
    sampleRate = 48000;
    destination = new Node();
    nodes = [];
    resumes = [];
    closeCalls = 0;
    constructor() { super(); contexts.push(this); }
    node() { const node = new Node(); this.nodes.push(node); return node; }
    createMediaElementSource(element) {
      if (failGraph) throw new Error('Graph unsupported');
      if (element.sourceAssigned) throw new DOMException('Media already has an audio source', 'InvalidStateError');
      element.sourceAssigned = true;
      return this.node();
    }
    createBiquadFilter() { return this.node(); }
    createGain() { return this.node(); }
    resume() { const request = deferred(); this.resumes.push(request); return request.promise; }
    run(index = this.resumes.length - 1) { this.state = 'running'; this.emit('statechange'); this.resumes[index].resolve(); }
    close() { this.closeCalls++; this.state = 'closed'; this.emit('statechange'); return Promise.resolve(); }
  }
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, Audio: FakeAudio, AudioContext: FakeContext, DOMException,
    setTimeout: (callback) => { const id = ++timerId; timers.set(id, callback); return id; },
    clearTimeout: (id) => timers.delete(id),
  });
  const states = [];
  return {
    ...exports, media, contexts, timers, states,
    preload: (file, readyState = 0, duration = NaN) => {
      const element = new FakeAudio();
      element.src = file;
      element.readyState = readyState;
      element.duration = duration;
      element.inDocument = true;
      return element;
    },
    create: (file = '/music.mp3', enabled = true, volume = 35, offset = 0, preloaded) => new exports.StudioAudio(file, state => states.push(state), enabled, volume, offset, preloaded),
    state: () => states.at(-1),
    flushTimers: () => { const pending = [...timers.values()]; timers.clear(); for (const callback of pending) callback(); },
  };
}

async function running(h) {
  const engine = h.create();
  h.contexts[0].run();
  h.media[0].begin();
  await flush();
  assert.equal(h.state(), 'playing');
  return engine;
}

const checks = {
  'output rises by 10 dB and the engine defaults to 50 percent': () => {
    const h = harness();
    near(20 * Math.log10(h.STUDIO_MUSIC_OUTPUT_GAIN / .08), 10);
    assert.equal(h.STUDIO_MUSIC_DEFAULT_VOLUME, 50);
    const engine = new h.StudioAudio('/music.mp3', () => {});
    const master = h.contexts[0].nodes[4];
    near(master.gain.value, .4 * (.08 * Math.sqrt(10)));
    engine.setOpenness(1);
    near(master.gain.value, .5 * (.08 * Math.sqrt(10)));
    engine.dispose();
  },
  'acoustics are bounded, monotonic, and bypass the filter inside': async () => {
    const h = harness();
    assert.equal(h.studioOpenness(5.4), 0);
    assert.equal(h.studioOpenness(3.85), 1);
    assert.equal(h.studioOpenness(8), 0);
    assert.equal(h.studioOpenness(0), 1);
    let previous = { cutoffHz: 0, gain: 0, dryMix: 0 }, previousOpen = 0;
    for (let i = 0; i <= 1000; i++) {
      const openness = h.studioOpenness(5.4 - i * 1.55 / 1000);
      assert.ok(openness >= previousOpen && openness <= 1);
      previousOpen = openness;
      const acoustics = h.studioAcoustics(i / 1000);
      for (const key of Object.keys(acoustics)) assert.ok(Number.isFinite(acoustics[key]) && acoustics[key] >= previous[key]);
      assert.ok(acoustics.cutoffHz <= 18000 && acoustics.gain >= .8 && acoustics.gain <= 1 && acoustics.dryMix <= 1);
      previous = acoustics;
    }
    assert.equal(h.studioAcoustics(0).cutoffHz, 320);
    assert.equal(h.studioAcoustics(0).gain, .8);
    assert.equal(h.studioAcoustics(1).gain, 1);
    assert.ok(h.studioAcoustics(.5).cutoffHz >= 1500 && h.studioAcoustics(.5).cutoffHz <= 2200);
    near(h.studioAcoustics(.5).gain, .9);
    assert.equal(h.studioAcoustics(.9).dryMix, 0);
    near(h.studioAcoustics(.95).dryMix, .5);
    for (const value of [NaN, Infinity, -Infinity, -2, 2]) {
      assert.ok(Object.values(h.studioAcoustics(value)).every(Number.isFinite));
    }
    const engine = await running(h);
    const [source, filter, wet, dry, master] = h.contexts[0].nodes;
    assert.ok(source.connections.includes(filter) && source.connections.includes(dry));
    assert.equal(filter.type, 'lowpass');
    near(filter.Q.value, -3.01);
    assert.equal(filter.frequency.value, 320);
    assert.equal(wet.gain.value, 1);
    assert.equal(dry.gain.value, 0);
    near(master.gain.value, .28 * (.08 * Math.sqrt(10)));
    engine.setOpenness(1);
    assert.equal(filter.frequency.value, 18000);
    assert.equal(wet.gain.value, 0);
    assert.equal(dry.gain.value, 1);
    assert.equal(master.gain.value, .35 * (.08 * Math.sqrt(10)));
    assert.equal(master.gain.ramps.at(-1).time, 1.08);
    engine.dispose();
  },
  'startup buffers early and applies a bounded intro seek only once': async () => {
    const h = harness(), engine = h.create('/music.m4a', true, 35, 6.2);
    const media = h.media[0], context = h.contexts[0];
    assert.equal(media.src, '/music.m4a');
    assert.equal(media.preload, 'auto');
    assert.deepEqual(media.preloadAtPlay, ['auto']);
    assert.equal(media.plays.length, 1);
    assert.equal(context.resumes.length, 1);
    assert.equal(media.currentTime, 0);
    assert.deepEqual(media.seeks, []);
    media.metadata(NaN);
    assert.deepEqual(media.seeks, []);
    media.metadata(166.07);
    assert.equal(media.currentTime, 6.2);
    assert.deepEqual(media.seeks, [6.2]);
    context.run(); media.begin(); await flush();

    // Natural playback progression is distinct from an application seek.
    media.playbackTime = 42;
    media.metadata(166.07);
    engine.setVolume(70);
    engine.setOpenness(.7);
    engine.setEnabled(false); h.flushTimers();
    engine.setEnabled(true); media.begin(); await flush();
    engine.setHidden(true);
    engine.setHidden(false); media.begin(); await flush();
    engine.unlock();
    media.metadata(166.07);
    assert.equal(media.currentTime, 42);
    assert.deepEqual(media.seeks, [6.2]);
    engine.dispose();
    assert.equal(media.listenerCount(), 0);

    for (const [duration, expected] of [[2, 1.75], [.1, 0]]) {
      const short = harness(), shortEngine = short.create('/short.m4a', false, 35, 6.2);
      short.media[0].metadata(duration);
      assert.deepEqual(short.media[0].seeks, [expected]);
      assert.ok(short.media[0].currentTime >= 0 && short.media[0].currentTime < duration);
      shortEngine.dispose();
    }
    const late = harness(), disposed = late.create('/music.m4a', true, 35, 6.2);
    disposed.dispose();
    assert.equal(late.media[0].listenerCount(), 0);
    late.media[0].metadata(166.07);
    assert.deepEqual(late.media[0].seeks, []);
  },
  'adopts buffered media without another request or a missed metadata cue': async () => {
    for (const readyState of [0, 1, 4]) {
      const h = harness(), media = h.preload('/music.m4a', readyState, readyState ? 166.07 : NaN);
      const engine = h.create('/music.m4a', true, 35, 7.2, media);
      assert.equal(h.media.length, 1);
      assert.equal(media.srcWrites, 1);
      assert.equal(media.loadCalls, 0);
      assert.deepEqual(media.seeks, readyState ? [7.2] : []);
      if (!readyState) media.metadata(166.07);
      assert.deepEqual(media.seeks, [7.2]);
      h.contexts[0].run(); media.begin(); await flush();
      assert.equal(h.state(), 'playing');

      media.playbackTime = 38;
      engine.setEnabled(false); h.flushTimers();
      engine.setEnabled(true); media.begin(); await flush();
      engine.setHidden(true);
      engine.setHidden(false); media.begin(); await flush();
      media.metadata(166.07);
      assert.equal(media.currentTime, 38);
      assert.deepEqual(media.seeks, [7.2]);
      assert.equal(media.srcWrites, 1);
      assert.equal(media.loadCalls, 0);
      engine.dispose();
    }
  },
  'adopted media respects stored mute and is replaced after disposal': async () => {
    const h = harness(), media = h.preload('/music.m4a', 4, 166.07);
    const engine = h.create('/music.m4a', false, 35, 7.2, media);
    assert.equal(h.state(), 'off');
    assert.equal(media.srcWrites, 1);
    assert.equal(media.plays.length, 0);
    assert.equal(h.contexts.length, 0);
    engine.setEnabled(true);
    h.contexts[0].run(); media.begin(); await flush();
    assert.equal(h.state(), 'playing');
    engine.dispose();
    assert.equal(media.listenerCount(), 0);
    assert.equal(media.getAttribute('src'), null);
    assert.equal(media.loadCalls, 1);
    assert.equal(media.removeCalls, 1);
    assert.equal(media.paused, true);
    assert.equal(h.contexts[0].closeCalls, 1);
    assert.ok(h.contexts[0].nodes.every(node => node.disconnectCalls === 1));
    media.metadata(166.07);
    assert.deepEqual(media.seeks, [7.2]);

    // The parser element lived outside Angular. A remount must no longer find
    // it, since a media element can only have one Web Audio source association.
    const remainingElement = h.media.find(element => element.inDocument);
    assert.equal(remainingElement, undefined);
    const remounted = h.create('/music.m4a', true, 35, 7.2, remainingElement);
    assert.equal(h.media.length, 2);
    assert.notEqual(h.media[1], media);
    h.contexts[1].run(); h.media[1].begin(); await flush();
    assert.equal(h.state(), 'playing');
    remounted.dispose();
  },
  'stored mute never attempts playback or creates an audio graph': async () => {
    const h = harness(), engine = h.create('/music.mp3', false);
    assert.equal(h.state(), 'off');
    assert.equal(h.media[0].plays.length, 0);
    assert.equal(h.contexts.length, 0);
    engine.unlock();
    assert.equal(h.media[0].plays.length, 0);
    engine.setEnabled(true);
    assert.equal(h.media[0].plays.length, 1);
    assert.equal(h.contexts.length, 1);
    engine.dispose();
  },
  'user volume is clamped, retained through mute and visibility, and independent of room attenuation': async () => {
    const h = harness(), engine = h.create('/music.mp3', true, 62), context = h.contexts[0];
    const master = context.nodes[4];
    near(master.gain.value, .8 * .62 * (.08 * Math.sqrt(10)));
    context.run(); h.media[0].begin(); await flush();
    engine.setOpenness(1);
    assert.equal(master.gain.value, .62 * (.08 * Math.sqrt(10)));
    engine.setVolume(25);
    assert.equal(master.gain.value, .25 * (.08 * Math.sqrt(10)));
    engine.setEnabled(false);
    engine.setVolume(75);
    assert.equal(master.gain.value, 0);
    engine.setEnabled(true);
    assert.equal(master.gain.value, .75 * (.08 * Math.sqrt(10)));
    engine.setHidden(true);
    engine.setVolume(40);
    assert.equal(master.gain.value, 0);
    engine.setHidden(false);
    assert.equal(master.gain.value, .4 * (.08 * Math.sqrt(10)));
    engine.setVolume(-10);
    assert.equal(master.gain.value, 0);
    engine.setVolume(140);
    assert.equal(master.gain.value, .08 * Math.sqrt(10));
    engine.setVolume(NaN);
    assert.equal(master.gain.value, .5 * (.08 * Math.sqrt(10)));
    engine.setOpenness(0);
    near(master.gain.value, .4 * (.08 * Math.sqrt(10)));
    engine.dispose();
    const ramps = master.gain.ramps.length;
    engine.setVolume(90);
    assert.equal(master.gain.ramps.length, ramps);
    const muted = harness(), mutedEngine = muted.create('/music.mp3', false, 62);
    mutedEngine.setVolume(70);
    assert.equal(muted.media[0].plays.length, 0);
    mutedEngine.setEnabled(true);
    near(muted.contexts[0].nodes[4].gain.value, .56 * (.08 * Math.sqrt(10)));
    mutedEngine.dispose();
  },
  'blocked autoplay retries synchronously on a gesture and reports actual playing': async () => {
    const h = harness(), engine = h.create(), media = h.media[0], context = h.contexts[0];
    assert.equal(media.plays.length, 1);
    assert.equal(context.resumes.length, 1);
    assert.notEqual(h.state(), 'playing');
    media.block();
    context.resumes[0].reject(new DOMException('Gesture required', 'NotAllowedError'));
    await flush();
    assert.equal(h.state(), 'waiting');
    engine.unlock();
    assert.equal(media.plays.length, 2);
    assert.equal(context.resumes.length, 2);
    context.run();
    assert.equal(h.state(), 'loading');
    media.begin();
    await flush();
    assert.equal(h.state(), 'playing');
    engine.unlock();
    engine.setEnabled(true);
    assert.equal(media.plays.length, 2);
    context.state = 'suspended'; context.emit('statechange');
    assert.equal(h.state(), 'waiting');
    engine.unlock();
    assert.equal(context.resumes.length, 3);
    media.begin();
    assert.notEqual(h.state(), 'playing');
    context.run();
    await flush();
    assert.equal(h.state(), 'playing');
    engine.dispose();
  },
  'rapid toggles cancel stale promises and restore a currently playing fade': async () => {
    const h = harness(), engine = h.create(), media = h.media[0], context = h.contexts[0];
    engine.setEnabled(false);
    engine.setEnabled(true);
    media.plays[0].reject(new DOMException('Stale request', 'NotSupportedError'));
    context.run(0);
    await flush();
    assert.equal(h.state(), 'loading');
    media.begin(1); context.run(1);
    await flush();
    assert.equal(h.state(), 'playing');
    const playCalls = media.plays.length, master = context.nodes[4];
    engine.setEnabled(false);
    assert.equal(master.gain.value, 0);
    assert.equal(h.state(), 'off');
    engine.setEnabled(true);
    near(master.gain.value, .28 * (.08 * Math.sqrt(10)));
    assert.equal(media.plays.length, playCalls);
    assert.equal(h.timers.size, 0);
    h.flushTimers();
    assert.equal(media.paused, false);
    assert.equal(h.state(), 'playing');
    engine.setEnabled(false); h.flushTimers();
    assert.equal(media.paused, true);
    assert.equal(h.state(), 'off');
    engine.dispose();
  },
  'hidden pages pause immediately and visibility cannot override explicit mute': async () => {
    const h = harness(), engine = await running(h), media = h.media[0];
    engine.setHidden(true);
    assert.equal(media.paused, true);
    assert.equal(h.state(), 'off');
    engine.setHidden(false);
    assert.equal(media.plays.length, 2);
    assert.equal(h.state(), 'loading');
    media.begin(); await flush();
    assert.equal(h.state(), 'playing');
    engine.setHidden(true); engine.setEnabled(false); engine.setHidden(false);
    assert.equal(media.plays.length, 2);
    assert.equal(media.paused, true);
    engine.dispose();
  },
  'pending resumes cannot restart hidden or disposed media; disposal releases resources': async () => {
    const h = harness(), engine = h.create(), media = h.media[0], context = h.contexts[0];
    engine.setHidden(true);
    context.run(); media.plays[0].resolve(); await flush();
    assert.equal(media.paused, true);
    assert.equal(h.state(), 'off');
    engine.setHidden(false);
    engine.dispose();
    const stateCount = h.states.length, playCalls = media.plays.length;
    media.plays[1].resolve(); await flush();
    engine.unlock(); engine.setEnabled(true); engine.dispose();
    assert.equal(h.states.length, stateCount);
    assert.equal(media.plays.length, playCalls);
    assert.equal(media.paused, true);
    assert.equal(media.src, '');
    assert.equal(media.loadCalls, 1);
    assert.equal(media.listenerCount(), 0);
    assert.equal(context.listenerCount(), 0);
    assert.equal(context.closeCalls, 1);
    assert.ok(context.nodes.every(node => node.disconnectCalls === 1));
    assert.equal(h.timers.size, 0);
  },
  'media failures retry only on off to on; missing files and graph failures stay unavailable': async () => {
    const h = harness(), engine = await running(h), media = h.media[0];
    media.error = { code: 2 }; media.emit('error');
    assert.equal(h.state(), 'unavailable');
    engine.unlock(); engine.setEnabled(true);
    assert.equal(media.plays.length, 1);
    engine.setEnabled(false); engine.setEnabled(true);
    assert.equal(media.loadCalls, 1);
    assert.equal(media.error, null);
    assert.equal(media.plays.length, 2);
    media.begin(); await flush();
    assert.equal(h.state(), 'playing');
    engine.dispose();
    const missing = harness(), empty = missing.create(' ');
    empty.setEnabled(false); empty.setEnabled(true);
    assert.equal(missing.state(), 'unavailable');
    assert.equal(missing.media.length, 0);
    assert.equal(missing.contexts.length, 0);
    empty.dispose();
    const failed = harness({ failGraph: true }), unsupported = failed.create();
    failed.media[0].emit('error');
    unsupported.setEnabled(false); unsupported.setEnabled(true);
    assert.equal(failed.state(), 'unavailable');
    assert.equal(failed.media[0].loadCalls, 0);
    assert.equal(failed.media[0].plays.length, 0);
    assert.equal(failed.contexts.length, 1);
    unsupported.dispose();
  },
};

(async () => {
  for (const [name, check] of Object.entries(checks)) {
    await check();
    console.log(`PASS ${name}`);
  }
  console.log(`${Object.keys(checks).length} studio audio checks passed.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
