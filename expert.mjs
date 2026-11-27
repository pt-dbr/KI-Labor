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

function treeViewport(tree) {
  const toolbar = el('div', '', 'tree-toolbar');
  const percentage = el('output', '100 %');
  percentage.setAttribute('aria-label', 'Zoomstufe');
  percentage.setAttribute('aria-live', 'off');
  const frame = el('div', '', 'tree-frame');
  const content = el('div', '', 'tree-content');
  frame.append(content);
  tree.append(frame);
  tree.tabIndex = 0;
  tree.setAttribute('role', 'region');
  tree.setAttribute('aria-label', 'Verschiebbare Baumansicht');

  let scale = 1;
  let fitMode = false;
  let gesture;
  let suppressClickUntil = 0;
  const pointers = new Map();
  const inset = 12;
  const floor = () => Math.min(0.1, fitScale());
  const width = () => content.offsetWidth;
  const height = () => content.offsetHeight;

  function fitScale() {
    return Math.min(1, Math.max(1, tree.clientWidth - inset * 2) / Math.max(1, width()),
      Math.max(1, tree.clientHeight - inset * 2) / Math.max(1, height()));
  }

  function layout() {
    const scaledWidth = Math.ceil(width() * scale);
    const scaledHeight = Math.ceil(height() * scale);
    frame.style.width = Math.max(tree.clientWidth, scaledWidth + inset * 2) + 'px';
    frame.style.height = Math.max(tree.clientHeight, scaledHeight + inset * 2) + 'px';
    content.style.left = Math.max(inset, (tree.clientWidth - scaledWidth) / 2) + 'px';
    content.style.transform = 'scale(' + scale + ')';
    percentage.textContent = Math.max(1, Math.round(scale * 100)) + ' %';
    smaller.disabled = scale <= floor() + 1e-6;
    larger.disabled = scale >= 2;
  }

  function fit() {
    if (!tree.clientWidth) return;
    fitMode = true;
    scale = fitScale();
    layout();
    tree.scrollTo(0, 0);
  }

  function zoom(next, x = tree.clientWidth / 2, y = tree.clientHeight / 2, oldX = x, oldY = y) {
    fitMode = false;
    const anchorX = (tree.scrollLeft + oldX - content.offsetLeft) / scale;
    const anchorY = (tree.scrollTop + oldY - inset) / scale;
    scale = Math.min(2, Math.max(floor(), next));
    layout();
    tree.scrollTo(anchorX * scale + content.offsetLeft - x, anchorY * scale + inset - y);
  }

  const smaller = button('−', () => zoom(scale / 1.25));
  const larger = button('+', () => zoom(scale * 1.25));
  smaller.setAttribute('aria-label', 'Baum verkleinern');
  larger.setAttribute('aria-label', 'Baum vergrößern');
  toolbar.append(button('Ganzen Baum anzeigen', fit), smaller, percentage, larger);
  const hint = el('p', 'Ziehe den Baum zum Verschieben. Zoome mit zwei Fingern oder mit + und −.', 'tree-hint');
  tree.before(toolbar, hint);

  function measureGesture() {
    const [first, second] = pointers.values();
    if (!first) return undefined;
    if (!second) return {...first, distance: 0};
    return {x: (first.x + second.x) / 2, y: (first.y + second.y) / 2,
      distance: Math.max(1, Math.hypot(first.x - second.x, first.y - second.y))};
  }
  let moved = false;
  tree.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    if (pointers.size === 0) {
      moved = false;
      suppressClickUntil = 0;
    }
    pointers.set(event.pointerId, {x:event.clientX, y:event.clientY});
    gesture = measureGesture();
    if (pointers.size >= 2) {
      moved = true;
      for (const id of pointers.keys()) tree.setPointerCapture(id);
    }
  });
  tree.addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, {x:event.clientX, y:event.clientY});
    const next = measureGesture();
    const dx = next.x - gesture.x;
    const dy = next.y - gesture.y;
    if (!moved && Math.hypot(dx,dy) < 5) return;
    if (!moved) tree.setPointerCapture(event.pointerId);
    moved = true;
    if (next.distance) {
      const bounds = tree.getBoundingClientRect();
      zoom(scale * next.distance / gesture.distance, next.x - bounds.left, next.y - bounds.top,
        gesture.x - bounds.left, gesture.y - bounds.top);
    } else {
      tree.scrollBy(-dx, -dy);
    }
    gesture = next;
  });
  function end(event) {
    if (!pointers.delete(event.pointerId)) return;
    if (moved) suppressClickUntil = performance.now() + 400;
    gesture = measureGesture();
  }
  for (const name of ['pointerup','pointercancel','lostpointercapture']) tree.addEventListener(name,end);
  tree.addEventListener('pointerleave', event => {
    if (!tree.hasPointerCapture(event.pointerId)) end(event);
  });
  tree.addEventListener('click', event => {
    if (event.detail && performance.now() < suppressClickUntil) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  function refresh() {
    if (!tree.clientWidth) return;
    if (fitMode) fit();
    else layout();
  }
  const observer = new ResizeObserver(refresh);
  observer.observe(tree);
  return {
    draw(node) {
      content.replaceChildren(node);
      refresh();
    },
    dispose() { observer.disconnect(); }
  };
}
export function mountExpertTree(container) {
  const byId = id => container.querySelector('#' + id);
  const viewport = treeViewport(byId('tree'));
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
    viewport.draw(draw(root, []));
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
  return viewport.dispose;
}

