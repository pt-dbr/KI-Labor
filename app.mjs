import {pause, train, predict, cluster} from './ml.mjs';
import {thumbnail, extract, releaseEncoder} from './images.mjs';

const $ = id => document.getElementById(id);
const main = $('main');
const dialog = $('confirm');
const empty = () => ({
  categories: [{name: '', images: []}, {name: '', images: []}],
  collection: [], groups: null, k: 3, model: null, sample: null, scores: null,
  messages: {a: '', b: '', home: ''}
});
let state = empty();
let view = 'home';
let operation;
let controller;
let nextImage = 0;
let resetting = false;

const info = [
  ['Was sind Trainingsdaten?', 'Trainingsdaten sind Beispiele, aus denen ein Modell lernt. Im ersten Labor besteht jedes Beispiel aus einem Foto und deiner passenden Kategorie.'],
  ['Was bedeutet überwachtes Lernen?', 'Du zeigst der KI Fotos mit den richtigen Antworten. Aus diesen Beispielen lernt der Klassifikator, wie er neue Fotos deinen Kategorien zuordnen kann.'],
  ['Was bedeutet unüberwachtes Lernen?', 'Du gibst der KI eine Sammlung ohne richtige Antworten. Sie berechnet, welche Bilder sich in ihren Merkmalen ähneln und bildet Gruppen.'],
  ['Was ist ein Modell?', 'Ein Modell ist eine Rechenvorschrift mit gelernten Einstellungen. Ein vortrainiertes Bildmodell wandelt ein Foto in eine Zahlenliste um. Darin stecken Hinweise etwa auf Formen, Farben und Oberflächen.'],
  ['Warum macht KI Fehler?', 'Wenn deine Stifte immer auf demselben blauen Tisch liegen, kann der Hintergrund zum Hinweis für „Stift“ werden. Auf einem anderen Tisch kann die Zuordnung schiefgehen.'],
  ['Warum braucht eine KI unterschiedliche Trainingsbilder?', 'Fotografiere dasselbe Objekt mal von oben und mal von der Seite. Verschiedene Beispiele helfen dem Modell, auch bei anderem Licht oder Hintergrund passende Merkmale zu finden.']
];
const experiments = {
  a: [
    'Starte mit wenigen Bildern pro Kategorie. Teste mehrere neue Fotos. Ergänze dann bis zu 15 unterschiedliche Beispiele und vergleiche.',
    'Sammle von einer Kategorie deutlich mehr Bilder als von der anderen. Prüfe, welche Kategorie das Modell bei neuen Fotos öfter wählt.',
    'Trainiere mit gleichbleibenden Hintergründen pro Kategorie. Tausche die Hintergründe beim Testen. Welche Hinweise könnte das Modell gelernt haben?',
    'Teste ein völlig fremdes Objekt. Welche bekannte Kategorie erhält den größten Modellwert? Warum könnte diese Zuordnung irreführend sein?'
  ],
  b: [
    'Sortiere dieselben Fotos im Kopf. Welche Bilder fasst das Modell zusammen? Welche Gemeinsamkeiten erkennst du?',
    'Vergleiche zwei, drei und vier Gruppen. Welche Gruppierung überrascht dich?',
    'Fotografiere verschiedene Gegenstände vor demselben Hintergrund. Was fällt dir an den Gruppen auf?',
    'Ergänze mehrere neue Bilder und lasse die Gruppen erneut berechnen. Welche Bilder wechseln die Gruppe?'
  ]
};
const escape = value => String(value).replace(/[&<>"']/g, char =>
  ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[char]);
const count = n => n === 1 ? '1 Bild' : n + ' Bilder';


function uploads(target, multiple = true) {
  return '<fieldset class="actions"><label class="upload">Kamera<input type="file" accept="image/*" capture="environment" data-target="' + target + '" aria-label="Foto aufnehmen"></label>' +
    '<label class="upload">Bilder auswählen<input type="file" accept="image/*,.heic,.heif" ' + (multiple ? 'multiple ' : '') +
    'data-target="' + target + '" aria-label="' + (multiple ? 'Bilder' : 'Testbild') + ' auswählen"></label></fieldset>';
}

function gallery(images, target) {
  if (!images.length) return '<p>Noch keine Bilder.</p>';
  return '<div class="gallery">' + images.map(image =>
    '<div class="tile"><img src="' + image.url + '" alt="Foto ' + image.id + '" width="84" height="84">' +
    (target != null ? '<button type="button" data-remove="' + image.id + '" data-target="' + target +
      '" aria-label="Foto ' + image.id + ' entfernen">×</button>' : '') + '</div>').join('') + '</div>';
}
function panel(step, title, content) {
  return '<section class="panel"><h2><span class="step">' + step + '</span>' + title + '</h2>' + content + '</section>';
}

function supervised() {
  const categories = state.categories.map((category, i) =>
    '<section class="category"><label for="cat-' + i + '">Name für Kategorie ' + (i + 1) + '</label>' +
    '<input id="cat-' + i + '" data-category="' + i + '" maxlength="36" value="' + escape(category.name) +
    '" placeholder="z. B. ' + ['Stifte', 'Radiergummis', 'Scheren', 'Lineale'][i] + '">' +
    '<strong>' + count(category.images.length) + '</strong>' + gallery(category.images, i) + uploads(i) +
    (state.categories.length > 2 ? '<button type="button" data-drop="' + i + '">Kategorie entfernen</button>' : '') + '</section>');
  const scores = state.scores;
  const winner = scores?.indexOf(Math.max(...scores));
  const result = scores ? '<h3>Zuordnung der KI: ' + escape(state.model.names[winner]) + '</h3>' +
    '<p>Modellwerte für dieses Bild. Die Werte geben an, wie stark das Modell die Kategorien bevorzugt. Auch ein hoher Wert kann zu einer falschen Zuordnung führen.</p>' +
    scores.map((score, i) => '<div class="score"><label for="score-' + i + '"><span>' +
      escape(state.model.names[i]) + '</span><span>' + new Intl.NumberFormat('de-DE', {style: 'percent', maximumFractionDigits: 1}).format(score) +
      '</span></label><meter id="score-' + i + '" min="0" max="1" value="' + score + '"></meter></div>').join('') : '';
  return panel(1, 'Kategorien festlegen', '<p>Gib deinen zwei bis vier Kategorien eigene Namen. Die Namensfelder findest du direkt über den Fotos.</p>' +
    (categories.length < 4 ? '<button type="button" id="add">Kategorie hinzufügen</button>' : '<p>Vier Kategorien sind angelegt.</p>')) +
    panel(2, 'Trainingsbilder hinzufügen', '<p>Sammle möglichst 8–15 unterschiedliche Fotos je Kategorie. Pro Kategorie passen bis zu 20 Bilder ins Labor. Falls die Kamera gesperrt ist, wähle vorhandene Fotos aus.</p><div class="grid">' +
      categories.join('') + '</div>') +
    panel(3, 'KI trainieren', '<p>Der Klassifikator lernt aus deinen Beispielen, wie Bildmerkmale und Kategorien zusammenhängen.</p><button id="train" class="primary">KI trainieren</button>' +
      (state.model ? '<p>Training abgeschlossen. Deine KI ist bereit für einen Test.</p>' : '')) +
    panel(4, 'KI testen', '<p>Wähle ein neues Foto, das du bisher nicht fürs Training verwendet hast.</p>' +
      (state.model ? uploads('test', false) : '<p>Trainiere zuerst deine KI.</p>') +
      (state.sample ? '<img class="test-image" src="' + state.sample.url + '" alt="Dein Testbild">' : '') + result) +
    panel(5, 'KI verbessern', '<p>Ändere deine Beispiele und starte das Training erneut. Vergleiche die Ergebnisse am selben Testfoto.</p>' +
      (state.model && state.sample && !scores ? '<button id="retest">Testbild erneut auswerten</button>' : ''));
}

function unsupervised() {
  const groups = state.groups?.map((images, i) => '<section class="group"><h3>Gruppe ' + (i + 1) +
    ' · ' + count(images.length) + '</h3>' + gallery(images) + '</section>').join('');
  return panel(1, 'Bilder sammeln', '<p>Sammle möglichst 6–20 verschiedene Fotos in einer gemeinsamen Sammlung. Falls die Kamera gesperrt ist, wähle vorhandene Fotos aus.</p><strong>' +
    count(state.collection.length) + '</strong>' + gallery(state.collection, 'pool') + uploads('pool')) +
    panel(2, 'Gemeinsamkeiten erkennen', '<p>Ein vortrainiertes Bildmodell berechnet Merkmale. k-Means sucht anhand dieser Zahlen nach ähnlichen Bildern. Du gibst nur die gewünschte Zahl der Gruppen an.</p>' +
    '<div class="actions"><label for="k">Anzahl der Gruppen</label><select id="k">' + [2, 3, 4].map(k =>
      '<option ' + (k === state.k ? 'selected' : '') + '>' + k + '</option>').join('') +
    '</select><button class="primary" id="cluster">Gruppen entdecken</button></div>') +
    panel(3, 'Gruppen ansehen', groups ? '<div class="grid">' + groups + '</div>' : '<p>Hier erscheinen deine Gruppen nach der Berechnung.</p>') +
    panel(4, 'Über Ergebnisse nachdenken', '<p>Schau dir die Fotos in den Gruppen an. Überlege, ob etwa Farben, Formen oder Hintergründe eine Rolle gespielt haben könnten. Die Rechenmethode liefert Gruppen und Abstände zwischen Zahlenwerten.</p>');
}

function render() {
  const faq = '<section><h2>Wissen zum Nachschlagen</h2>' + info.map(([q, a]) =>
    '<details><summary>' + q + '</summary><p>' + a + '</p></details>').join('') + '</section>';
  const content = view === 'home'
    ? '<section class="hero"><h1>KI-Labor</h1><strong>Bring einer KI das Sehen bei!</strong><p>Trainiere deine eigene KI und entdecke, wie Maschinen lernen.</p></section>' +
      '<div class="grid"><button type="button" class="mode" data-view="a"><span class="badge">A</span><b>Überwachtes Lernen</b>' +
      'Ich zeige der KI, was richtig ist.<small>Gib deinen Fotos Kategorien und teste die KI mit einem neuen Bild.</small></button>' +
      '<button type="button" class="mode" data-view="b"><span class="badge">B</span><b>Unüberwachtes Lernen</b>' +
      'Die KI entdeckt Gemeinsamkeiten selbst.<small>Sammle Fotos und vergleiche, wie die KI sie gruppiert.</small></button></div>'
    : '<div class="mode-head"><button data-view="home">Zur Startseite</button><h1>' +
      (view === 'a' ? 'A · Überwachtes Lernen' : 'B · Unüberwachtes Lernen') + '</h1></div>' +
      '<div class="feedback"><p id="working" class="status" role="status">' + escape(state.messages[view]) + '</p><progress id="progress" aria-label="Fortschritt der Berechnung" hidden></progress></div>' +
      '<fieldset id="workspace">' + (view === 'a' ? supervised() : unsupervised()) + '</fieldset>' +
      '<section class="panel"><h2>Forscherauftrag</h2><ol>' + experiments[view].map(task => '<li>' + task + '</li>').join('') + '</ol></section>';
  main.innerHTML = content + (view === 'home' && state.messages.home ?
    '<p class="status" role="status">' + escape(state.messages.home) + '</p>' : '') + faq;
}

function go(destination) {
  if (operation || resetting) return;
  view = destination;
  render();
  const heading = main.querySelector('h1');
  heading.tabIndex = -1;
  heading.focus();
  window.scrollTo(0, 0);
}

function status(message, current, total) {
  const progress = $('progress');
  $('working').textContent = message;
  progress.hidden = false;
  if (total) {
    progress.max = total;
    progress.value = current;
  } else progress.removeAttribute('value');
}

function run(task) {
  if (operation || resetting) return;
  controller = new AbortController();
  const {signal} = controller;
  $('workspace').disabled = true;
  $('home').disabled = true;
  main.querySelector('[data-view="home"]').disabled = true;
  operation = (async () => {
    try { state.messages[view] = await task(signal); }
    catch (error) {
      if (!signal.aborted) {
        console.error(error);
        state.messages[view] =
          'Die Berechnung ist fehlgeschlagen. Prüfe die Verbindung zur Seite und versuche es mit weniger Bildern erneut.';
      }
    } finally {
      operation = null;
      if (!resetting) {
        $('home').disabled = false;
        render();
      }
    }
  })();
}

function invalidateA() {
  state.model = state.scores = null;
  state.messages.a = '';
}
function invalidateB() {
  state.groups = null;
  state.messages.b = '';
}

async function features(images, signal) {
  for (const [i, image] of images.entries()) {
    signal.throwIfAborted();
    status('Bildmerkmale berechnen · ' + (i + 1) + ' von ' + images.length, i, images.length);
    await pause();
    if (!image.vector) image.vector = await extract(image.url, signal);
  }
}

function evaluate(sample) {
  state.scores = predict(state.model, sample.vector);
}

function training() {
  const names = state.categories.map(category => category.name.trim());
  if (names.some(value => !value) || new Set(names.map(value => value.toLocaleLowerCase('de'))).size !== names.length) {
    $('working').textContent = 'Gib jeder Kategorie einen eigenen, eindeutigen Namen.';
    return;
  }
  if (state.categories.some(category => !category.images.length)) {
    $('working').textContent = 'Füge jeder Kategorie mindestens ein Trainingsbild hinzu. Für bessere Ergebnisse probiere 8–15 pro Kategorie.';
    return;
  }
  run(async signal => {
    await features(state.categories.flatMap(category => category.images), signal);
    const examples = state.categories.flatMap((category, label) => category.images.map(image => ({vector: image.vector, label})));
    const model = await train(examples, names.length, (epoch, total) => {
      signal.throwIfAborted();
      status('Klassifikator trainieren · Runde ' + epoch + ' von ' + total, epoch, total);
    });
    signal.throwIfAborted();
    state.model = {...model, names};
    if (state.sample?.vector) evaluate(state.sample);
    const small = state.categories.some(category => category.images.length < 8);
    return small ? 'Training fertig. Einige Kategorien haben wenige Beispiele. Teste, wie sich mehr Fotos auswirken.' : 'Training fertig.';
  });
}

function grouping() {
  if (state.collection.length < state.k) {
    $('working').textContent = 'Sammle mindestens so viele Fotos, wie du Gruppen suchst. Starte am besten mit 6–20 Fotos.';
    return;
  }
  run(async signal => {
    await features(state.collection, signal);
    const assignment = await cluster(state.collection.map(image => image.vector), state.k, iteration => {
      signal.throwIfAborted();
      status('Gruppen berechnen · Runde ' + iteration);
    });
    signal.throwIfAborted();
    state.groups = Array.from({length: state.k}, (_, group) => state.collection.filter((_, i) => assignment[i] === group));
    return state.k + ' Gruppen gefunden.' + (state.collection.length < 6 ? ' Ergänze weitere Bilder und vergleiche die Gruppen.' : '');
  });
}

function imageList(target) {
  return target === 'pool' ? state.collection : state.categories[Number(target)].images;
}

function importImages(files, target) {
  run(async signal => {
    const testing = target === 'test';
    const list = testing ? [] : imageList(target);
    const available = testing ? 1 : 20 - list.length;
    const problems = new Set();
    let added = 0;
    for (const file of files.slice(0, available)) {
      signal.throwIfAborted();
      status('Foto vorbereiten …');
      let url;
      try { url = await thumbnail(file); }
      catch (error) { problems.add(error.message); continue; }
      if (signal.aborted) {
        URL.revokeObjectURL(url);
        signal.throwIfAborted();
      }
      const image = {url, id: ++nextImage};
      if (testing) {
        if (state.sample) URL.revokeObjectURL(state.sample.url);
        state.sample = image;
        state.scores = null;
        await features([image], signal);
        evaluate(image);
      } else {
        list.push(image);
        if (target === 'pool') invalidateB();
        else invalidateA();
      }
      added++;
    }
    if (files.length > available) problems.add('Das Limit von 20 Bildern ist erreicht.');
    return [added ? (testing ? 'Testbild ausgewertet.' : count(added) + ' hinzugefügt.') : '', ...problems].filter(Boolean).join(' ');
  });
}

main.addEventListener('input', event => {
  const input = event.target;
  if (input.dataset.category === undefined) return;
  state.categories[Number(input.dataset.category)].name = input.value;
  if (state.model) {
    invalidateA();
    const refreshed = document.createElement('template');
    refreshed.innerHTML = supervised();
    const panels = Array.from(workspace.children).slice(2);
    const updates = Array.from(refreshed.content.children).slice(2);
    panels.forEach((panel, i) => panel.replaceWith(updates[i]));
    working.textContent = 'Kategorien geändert. Trainiere die KI erneut.';
  }
});
main.addEventListener('change', event => {
  const input = event.target;
  if (input.id === 'k') {
    state.k = Number(input.value);
    invalidateB();
    render();
  }
  if (input.type === 'file') {
    const files = Array.from(input.files);
    input.value = '';
    if (files.length) importImages(files, input.dataset.target);
  }
});
main.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || operation || resetting) return;
  const {view: destination, drop, remove, target} = button.dataset;
  if (destination) go(destination);
  if (button.id === 'add') {
    state.categories.push({name: '', images: []});
    invalidateA();
    render();
    $('cat-' + (state.categories.length - 1)).focus();
  }
  if (drop !== undefined) {
    const [category] = state.categories.splice(Number(drop), 1);
    category.images.forEach(image => URL.revokeObjectURL(image.url));
    invalidateA();
    render();
  }
  if (remove !== undefined) {
    const list = imageList(target);
    const [image] = list.splice(list.findIndex(item => item.id === Number(remove)), 1);
    URL.revokeObjectURL(image.url);
    if (target === 'pool') invalidateB();
    else invalidateA();
    render();
  }
  if (button.id === 'train') training();
  if (button.id === 'cluster') grouping();
  if (button.id === 'retest') run(async signal => {
    await features([state.sample], signal);
    evaluate(state.sample);
    return 'Testbild ausgewertet.';
  });
});

$('home').onclick = () => go('home');
$('reset').onclick = () => dialog.showModal();
$('cancel').onclick = () => dialog.close();
$('delete').onclick = async () => {
  if (resetting) return;
  resetting = true;
  $('delete').disabled = true;
  $('cancel').disabled = true;
  controller?.abort();
  await operation;
  for (const image of [...state.categories.flatMap(category => category.images), ...state.collection, state.sample]) {
    if (image) URL.revokeObjectURL(image.url);
  }
  releaseEncoder();
  state = empty();
  controller = undefined;
  nextImage = 0;
  state.messages.home = 'Lernprojekt gelöscht. Du kannst neu starten.';
  resetting = false;
  $('delete').disabled = false;
  $('cancel').disabled = false;
  $('home').disabled = false;
  dialog.close();
  go('home');
};
dialog.addEventListener('cancel', event => { if (resetting) event.preventDefault(); });
render();


