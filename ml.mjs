export const pause = () => new Promise(resolve => setTimeout(resolve, 0));

export function predict(model, vector) {
  const scores = model.weights.map((weights, c) =>
    vector.reduce((sum, value, i) => sum + value * weights[i], model.bias[c]));
  const max = Math.max(...scores);
  const exp = scores.map(score => Math.exp(score - max));
  const total = exp.reduce((sum, value) => sum + value, 0);
  return exp.map(value => value / total);
}

export async function train(examples, classes, progress = () => {}) {
  const dimensions = examples[0].vector.length;
  const model = {
    weights: Array.from({length: classes}, () => new Float32Array(dimensions)),
    bias: new Float32Array(classes)
  };
  const gradient = model.weights.map(() => new Float32Array(dimensions));
  const biasGradient = new Float32Array(classes);
  for (let epoch = 1; epoch <= 90; epoch++) {
    gradient.forEach(row => row.fill(0));
    biasGradient.fill(0);
    for (const {vector, label} of examples) {
      predict(model, vector).forEach((value, c) => {
        const error = value - Number(c === label);
        biasGradient[c] += error;
        for (let i = 0; i < dimensions; i++) gradient[c][i] += error * vector[i];
      });
    }
    const step = 1.5 / examples.length;
    model.weights.forEach((weights, c) => {
      model.bias[c] -= step * biasGradient[c];
      for (let i = 0; i < dimensions; i++) weights[i] -= step * gradient[c][i];
    });
    if (epoch % 5 === 0) {
      progress(epoch, 90);
      await pause();
    }
  }
  return model;
}

function distance(a, b) {
  return a.reduce((sum, value, i) => sum + (value - b[i]) ** 2, 0);
}

export async function cluster(vectors, k, progress = () => {}) {
  const seeds = [0];
  while (seeds.length < k) {
    let farthest = -1;
    let next = 0;
    vectors.forEach((vector, i) => {
      if (seeds.includes(i)) return;
      const nearest = Math.min(...seeds.map(index => distance(vector, vectors[index])));
      if (nearest > farthest) [farthest, next] = [nearest, i];
    });
    seeds.push(next);
  }
  let centers = seeds.map(i => vectors[i]);
  let assignments = vectors.map((_, i) => seeds.indexOf(i));
  for (let iteration = 1; iteration <= 50; iteration++) {
    const next = vectors.map((vector, i) => {
      const distances = centers.map(center => distance(vector, center));
      const nearest = Math.min(...distances);
      return distances[assignments[i]] === nearest ? assignments[i] : distances.indexOf(nearest);
    });
    const groups = centers.map(() => []);
    next.forEach((group, i) => groups[group].push(i));
    // Move a poorly represented point from a populated group into any empty group.
    groups.forEach((group, c) => {
      if (group.length) return;
      let donor;
      let index;
      let farthest = -1;
      groups.forEach((members, d) => {
        if (members.length < 2) return;
        members.forEach((i, j) => {
          const error = distance(vectors[i], centers[d]);
          if (error > farthest) [farthest, donor, index] = [error, members, j];
        });
      });
      const [moved] = donor.splice(index, 1);
      group.push(moved);
      next[moved] = c;
    });
    const stable = next.every((value, i) => value === assignments[i]);
    assignments = next;
    centers = groups.map(group => {
      const mean = new Float32Array(vectors[0].length);
      group.forEach(i => vectors[i].forEach((value, j) => { mean[j] += value / group.length; }));
      return mean;
    });
    progress(iteration, 50);
    await pause();
    if (stable) break;
  }
  return assignments;
}
