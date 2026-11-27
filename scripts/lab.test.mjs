import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {train, predict, cluster} from '../ml.mjs';

const require = createRequire(import.meta.url);
const tf = require('../vendor/tf.min.js');

test('MobileNet-Embeddings treiben Training, Vorhersage und Clustering an', async () => {
  const {modelTopology, weightsManifest} = JSON.parse(await readFile(new URL('../model/model.json', import.meta.url)));
  const binary = await readFile(new URL('../model/weights.bin', import.meta.url));
  const model = await tf.loadLayersModel(tf.io.fromMemory({
    modelTopology, weightSpecs: weightsManifest[0].weights,
    weightData: binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.byteLength)
  }));
  const baseline = tf.memory().numTensors;
  function pattern(vertical, offset) {
    const pixels = new Float32Array(224 * 224 * 3);
    for (let y = 0; y < 224; y++) {
      for (let x = 0; x < 224; x++) {
        const position = (y * 224 + x) * 3;
        const stripe = Math.floor(((vertical ? x : y) + offset) / 14) % 2;
        pixels.set(vertical ? [stripe, -0.8, -0.9] : [-0.9, stripe, 0.7], position);
      }
    }
    return tf.tidy(() => {
      const output = model.predict(tf.tensor4d(pixels, [1, 224, 224, 3]));
      const values = Float32Array.from(output.dataSync());
      const length = Math.hypot(...values);
      assert.ok(length > 0);
      return values.map(value => value / length);
    });
  }
  try {
    const vectors = [pattern(true, 0), pattern(true, 2), pattern(false, 0), pattern(false, 2)];
    const red = pattern(true, 4);
    const blue = pattern(false, 4);
    assert.equal(red.length, 256);
    assert.notDeepEqual(red, blue);
    const modelA = await train(vectors.map((vector, i) => ({vector, label: Number(i >= 2)})), 2);
    const modelB = await train(vectors.map((vector, i) => ({vector, label: Number(i < 2)})), 2);
    const redScores = predict(modelA, red);
    assert.ok(redScores[0] > 0.5);
    assert.ok(predict(modelA, blue)[1] > 0.5);
    assert.ok(predict(modelB, red)[1] > 0.5);
    assert.ok(Math.abs(redScores[0] + redScores[1] - 1) < 1e-9);
    assert.deepEqual(await cluster(vectors, 2), [0, 0, 1, 1]);
    assert.equal(tf.memory().numTensors, baseline);
  } finally {
    model.dispose();
  }
  assert.equal(tf.memory().numTensors, 0);
});

test('k-Means behält alle Bilder bei identischen Merkmalen', async () => {
  const assignments = await cluster(Array.from({length: 8}, () => [1, 0]), 4);
  assert.equal(assignments.length, 8);
  assert.equal(new Set(assignments).size, 4);
});
