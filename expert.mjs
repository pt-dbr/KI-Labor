import {thumbnail} from './images.mjs';

const branches = [['yes', 'Ja'], ['no', 'Nein']];
const makeNode = kind => ({kind, text: '', yes: null, no: null, photo: ''});
let root = makeNode('root');

export function resetExpertTree() {
  for (const node of inspect(root).photos) URL.revokeObjectURL(node.photo);
  root = makeNode('root');
}

function el(tag, content, className) {
  const element = document.createElement(tag);
  if (content) element.textContent = content;
  if (className) element.className = className;
  return element;
}

function button(label, action, className) {
  const element = el('button', label, className);
  element.type = 'button';
  element.addEventListener('click', action);
  return element;
}

const nodeLabel = node => ({root: 'Wurzelknoten', question: 'Frageknoten', leaf: 'Lösungsblatt'})[node.kind];

function inspect(node, path = [], result = {missing: null, photos: []}) {
  if (!node?.text.trim()) result.missing ??= path;
  if (!node) return result;
  if (node.kind === 'leaf') {
    if (node.photo) result.photos.push(node);
    return result;
  }
  for (const [edge] of branches) inspect(node[edge], [...path, edge], result);
  return result;
}

export function mountExpertTree(container) {
  const byId = id => container.querySelector('#' + id);
  const tree = byId('tree');
  const properties = byId('properties');
  const runner = byId('runner');
  const status = byId('expert-status');
  let selection = [];
  const at = path => path.reduce((node, edge) => node?.[edge], root);

  function choose(path) {
    status.textContent = '';
    selection = path;
    renderEditor(true);
  }

  function renderTree() {
    function draw(node, path) {
      const item = el('div', '', 'branch-node');
      const label = node ? nodeLabel(node) : 'Freies Zweigende';
      const card = button('', () => choose(path), 'card ' + (node?.kind ?? ''));
      card.append(el('small', label), el('span', node?.text.trim() || (node ? 'Bearbeiten' : 'Hinzufügen')));
      if (path.join('/') === selection.join('/')) card.setAttribute('aria-current', 'true');
      item.append(card);
      if (node && node.kind !== 'leaf' && (node.text.trim() || node.yes || node.no)) {
        const children = el('div', '', 'children');
        for (const [edge, answer] of branches) {
          const connection = el('div', '', 'edge');
          connection.append(el('span', answer), draw(node[edge], [...path, edge]));
          children.append(connection);
        }
        item.append(children);
      }
      return item;
    }
    tree.replaceChildren(draw(root, []));
  }

  function photo(src, alt = '', className = 'photo') {
    const img = el('img', '', className);
    img.src = src;
    img.alt = alt;
    return img;
  }

  function photoControls(node) {
    const area = el('div');
    const actions = el('div', '', 'actions');
    for (const [label, capture] of [['Kamera', true], ['Bild auswählen', false]]) {
      const field = el('label', label, 'upload');
      const picker = el('input');
      picker.type = 'file';
      picker.accept = 'image/*';
      if (capture) picker.setAttribute('capture', 'environment');
      picker.addEventListener('change', async () => {
        const file = picker.files[0];
        picker.value = '';
        if (!file) return;
        try {
          const url = await thumbnail(file);
          if (!area.isConnected || byId('editor').hidden) {
            URL.revokeObjectURL(url);
            return;
          }
          if (node.photo) URL.revokeObjectURL(node.photo);
          node.photo = url;
          choose(selection);
        } catch (error) {
          if (area.isConnected) status.textContent = error.message;
        }
      });
      field.append(picker);
      actions.append(field);
    }
    if (node.photo) {
      area.append(photo(node.photo, 'Foto zum Lösungsblatt'));
      actions.append(button('Foto entfernen', () => {
        URL.revokeObjectURL(node.photo);
        node.photo = '';
        choose(selection);
      }));
    }
    area.append(actions);
    return area;
  }

  function renderEditor(focus = false) {
    renderTree();
    const node = at(selection);
    properties.replaceChildren(el('h2', node ? nodeLabel(node) : 'Zweigende ergänzen'));
    if (!node) {
      const actions = el('div', '', 'choices');
      for (const [kind, label] of [['question', 'Frageknoten hinzufügen'], ['leaf', 'Lösungsblatt hinzufügen']]) {
        actions.append(button(label, () => {
          at(selection.slice(0, -1))[selection.at(-1)] = makeNode(kind);
          choose(selection);
        }, kind));
      }
      properties.append(actions);
      if (focus) actions.querySelector('button').focus();
      return;
    }
    const field = el('label', node.kind === 'leaf' ? 'Lösung' : 'Frage', 'field');
    const input = el('input');
    input.value = node.text;
    input.addEventListener('input', () => {
      node.text = input.value;
      renderTree();
    });
    field.append(input);
    properties.append(field);
    if (node.kind === 'leaf') properties.append(photoControls(node));
    if (focus) input.focus();
  }

  function setMode(running) {
    status.textContent = '';
    byId('editor').hidden = running;
    runner.hidden = !running;
    byId('edit-mode').setAttribute('aria-pressed', String(!running));
    byId('run-mode').setAttribute('aria-pressed', String(running));
    if (running) startRun();
    else renderEditor();
  }

  function runNode(node, target) {
    const heading = el('h2', node.kind === 'leaf' ? 'Lösung' : 'Frage');
    heading.tabIndex = -1;
    runner.replaceChildren(heading, el('p', node.text));
    if (node.kind === 'leaf') {
      if (node.photo) runner.append(photo(node.photo, 'Foto zur Lösung'));
      if (target) runner.append(el('p', target === node ? 'Du bist bei deinem gewählten Bild angekommen.' : 'Der Baum hat dich zu einer anderen Lösung geführt.'));
      runner.append(button('Erneut testen', startRun));
    } else {
      const actions = el('div', '', 'choices');
      for (const [edge, answer] of branches) actions.append(button(answer, () => runNode(node[edge], target), 'primary'));
      runner.append(actions);
    }
    heading.focus();
  }

  function startRun() {
    const {missing, photos} = inspect(root);
    const heading = el('h2', 'Baum testen');
    heading.tabIndex = -1;
    runner.replaceChildren(heading);
    if (missing) {
      runner.append(el('p', 'Ergänze alle Fragen, Zweige und Lösungen, damit jeder Weg ein Ziel hat.'));
      runner.append(button('Offene Stelle bearbeiten', () => { setMode(false); choose(missing); }));
    } else if (photos.length) {
      runner.append(el('p', 'Wähle ein Bild aus und merk es dir. Danach beantwortest du die Fragen für dieses Bild.'));
      const gallery = el('div', '', 'gallery');
      photos.forEach((node, index) => {
        const target = button('Bild ' + (index + 1), () => runNode(root, node));
        target.prepend(photo(node.photo, '', ''));
        gallery.append(target);
      });
      runner.append(gallery);
    } else {
      runner.append(el('p', 'Beantworte die Fragen mit Ja oder Nein und prüfe, bei welcher Lösung du ankommst.'));
      runner.append(button('Test starten', () => runNode(root, null), 'primary'));
    }
    heading.focus();
  }

  byId('edit-mode').addEventListener('click', () => setMode(false));
  byId('run-mode').addEventListener('click', () => setMode(true));
  renderEditor();
}
