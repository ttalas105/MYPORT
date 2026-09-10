import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as THREE from 'three';
import * as geometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

function load(name, dependencies = {}) {
  const source = fs.readFileSync(new URL(`../src/app/studio/${name}.ts`, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, console, require: name => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  } });
  return exports;
}
const { StudioQuality, StudioFrameBudget, studioPixelRatio } = load('studio-quality');
const { batchStaticStudio, freezeStudioTransforms } = load('studio-batching', {
  three: THREE, 'three/examples/jsm/utils/BufferGeometryUtils.js': geometryUtils,
});
let passed = 0;
function check(name, run) { run(); passed++; console.log(`PASS ${name}`); }
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-5, `${actual} ≈ ${expected}`);

check('quality adapts to sustained slow movement, not idle cadence or isolated stalls', () => {
  const quality = new StudioQuality(false);
  let now = 0;
  for (let i = 0; i < 180; i++) quality.observe(i % 60 === 0 ? 200 : 16.7, true, now += 16.7);
  assert.equal(quality.level, 'high');
  for (let i = 0; i < 100; i++) quality.observe(33.3, false, now += 33.3);
  assert.equal(quality.level, 'high');
  for (let i = 0; i < 60; i++) quality.observe(40, true, now += 40);
  assert.equal(quality.level, 'balanced');
  for (let i = 0; i < 60; i++) quality.observe(40, true, now += 40);
  assert.equal(quality.level, 'balanced', 'Cooldown prevents repeated reallocations');
  now += 5000;
  for (let i = 0; i < 60; i++) quality.observe(300, true, now += 300);
  assert.equal(quality.level, 'low', 'Very slow machines can still step down');
  for (let i = 0; i < 180; i++) quality.observe(5, true, now += 5);
  assert.equal(quality.level, 'low', 'A short fast section must not cause quality pumping');
  assert.equal(new StudioQuality(true).level, 'balanced');
});

check('pixel budgets stop forced supersampling and bound high-DPI rendering', () => {
  assert.equal(studioPixelRatio(1440, 900, 1, 'high'), 1);
  assert.equal(studioPixelRatio(1440, 900, 2, 'high'), 1.5);
  for (const [level, limit] of [['high', 3_000_000], ['balanced', 2_000_000], ['low', 1_250_000]]) {
    for (const [w, h] of [[390, 844], [1920, 1080], [3840, 2160]]) {
      const ratio = studioPixelRatio(w, h, 3, level);
      assert.ok(ratio >= .5);
      assert.ok(w * h * ratio * ratio <= Math.max(limit, w * h * .25) + 1);
    }
  }
});

check('render pacing respects 60 fps movement and 30 fps ambience on high-refresh displays', () => {
  for (const refresh of [60, 120, 144, 180]) {
    for (const [moving, expected] of [[true, 60], [false, 30]]) {
      const budget = new StudioFrameBudget();
      let frames = 0;
      for (let tick = 0; tick < refresh * 3; tick++) if (budget.shouldRender(tick * 1000 / refresh, moving)) frames++;
      assert.ok(Math.abs(frames / 3 - expected) <= 1, `${refresh}Hz produced ${frames / 3}fps`);
    }
  }
});

check('batching preserves world bounds, UVs and triangle counts while reducing meshes', () => {
  const scene = new THREE.Scene(), root = new THREE.Group();
  scene.add(root); root.position.set(2, 1, -3); root.rotation.y = .4;
  const material = new THREE.MeshStandardMaterial();
  for (let i = 0; i < 4; i++) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(.1, .2, .1), material);
    box.position.set(.2 * i, .3, .2); box.castShadow = true; root.add(box);
  }
  const before = new THREE.Box3().setFromObject(root);
  batchStaticStudio(root, new Set());
  const meshes = []; root.traverse(o => { if (o.isMesh) meshes.push(o); });
  assert.equal(meshes.length, 1);
  assert.equal(meshes[0].geometry.attributes.position.count / 3, 48);
  assert.equal(meshes[0].geometry.attributes.uv.count, meshes[0].geometry.attributes.position.count);
  assert.equal(meshes[0].castShadow, true);
  const after = new THREE.Box3().setFromObject(root);
  for (const axis of ['x', 'y', 'z']) { near(after.min[axis], before.min[axis]); near(after.max[axis], before.max[axis]); }
});

check('batching retains dynamic trees, album targets, transparent surfaces and spatial culling', () => {
  const root = new THREE.Group(), door = new THREE.Group(), material = new THREE.MeshStandardMaterial();
  const box = () => new THREE.Mesh(new THREE.BoxGeometry(.2, .2, .2), material);
  const moving = box(), album = box(), glass = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true }));
  const hidden = box(); hidden.visible = false;
  door.add(moving); root.add(door, album, glass, hidden);
  for (const x of [.1, .3, 5, 5.2]) { const mesh = box(); mesh.position.x = x; root.add(mesh); }
  batchStaticStudio(root, new Set([door, album]));
  assert.equal(moving.parent, door); assert.equal(album.parent, root); assert.equal(glass.parent, root); assert.equal(hidden.parent, root);
  assert.equal(root.children.filter(o => o.name === 'Static studio batch').length, 2);
  const scene = new THREE.Scene(); scene.add(root); freezeStudioTransforms(scene, new Set([door]));
  assert.equal(root.matrixAutoUpdate, false); assert.equal(door.matrixAutoUpdate, true); assert.equal(moving.matrixAutoUpdate, true);
  door.position.y = 2; scene.updateMatrixWorld(); near(moving.getWorldPosition(new THREE.Vector3()).y, 2);
});
console.log(`${passed} studio performance checks passed.`);
