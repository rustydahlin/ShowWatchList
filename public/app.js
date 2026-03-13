const STAR_LABELS = ['', 'Terrible 😬', 'Meh 😐', 'Good 👍', 'Great 🔥', 'Must Watch 🌟'];
const CONFETTI_COLORS = ['#6c6cff','#b89cff','#6fe0b0','#f5c518','#ff6b6b','#ffffff','#ffd700'];

let items = [];
let currentFilter = 'all';
let currentType   = 'movie';
let dragSrcId     = null;
let dragSrcType   = null;

// ── API helpers ──────────────────────────────────────────────────────────────
async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ── Name / config ─────────────────────────────────────────────────────────────
function applyName(name) {
  const display = name ? `${name}'s Watch List` : 'Watch List';
  document.getElementById('pageTitle').textContent = display;
  document.title = display;
}

async function loadConfig() {
  const { name } = await api('GET', '/api/config');
  applyName(name);
  if (!name) openNameModal();
}

function openNameModal() {
  const modal = document.getElementById('nameModal');
  modal.classList.remove('hidden');
  setTimeout(() => document.getElementById('nameInput').focus(), 50);
}

async function saveName() {
  const input = document.getElementById('nameInput');
  const name  = input.value.trim();
  if (!name) { input.classList.add('shake'); input.addEventListener('animationend', () => input.classList.remove('shake'), { once: true }); return; }
  await api('PUT', '/api/config', { name });
  applyName(name);
  document.getElementById('nameModal').classList.add('hidden');
}

document.getElementById('saveNameBtn').addEventListener('click', saveName);
document.getElementById('nameInput').addEventListener('keydown', e => { if (e.key === 'Enter') saveName(); });

// ── Load & render ────────────────────────────────────────────────────────────
async function loadItems() {
  items = await api('GET', '/api/items');
  render();
}

function itemsOfType(type) {
  const byRank = (a, b) => a.rank - b.rank;
  const all = items.filter(i => i.type === type);
  if (currentFilter === 'watched')   return all.filter(i =>  i.watched).sort(byRank);
  if (currentFilter === 'unwatched') return all.filter(i => !i.watched).sort(byRank);
  // Default: unwatched first, then watched, each group sorted by rank
  return [
    ...all.filter(i => !i.watched).sort(byRank),
    ...all.filter(i =>  i.watched).sort(byRank),
  ];
}

function starsDisplay(rating) {
  if (rating === null || rating === undefined) return '';
  return `<span class="item-rating">${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}<span class="rating-num">${rating}/5</span></span>`;
}

function updateStats() {
  const total   = items.length;
  const watched = items.filter(i => i.watched).length;
  const movies  = items.filter(i => i.type === 'movie').length;
  const shows   = items.filter(i => i.type === 'show').length;
  const bar = document.getElementById('statsBar');
  if (total === 0) { bar.innerHTML = ''; return; }
  bar.innerHTML = `
    <span class="stat-chip"><strong>${total}</strong> total</span>
    <span class="stat-chip"><strong>${watched}</strong> watched</span>
    <span class="stat-chip">🎥 <strong>${movies}</strong></span>
    <span class="stat-chip">📺 <strong>${shows}</strong></span>
  `;
}

function render() {
  updateStats();
  renderSection('movie');
  renderSection('show');
}

function renderSection(type) {
  const list     = document.getElementById(`list-${type}`);
  const empty    = document.getElementById(`empty-${type}`);
  const countEl  = document.getElementById(`count-${type}`);
  const visible  = itemsOfType(type);
  const total    = items.filter(i => i.type === type);

  // Count badge always shows total for that type (not filtered)
  countEl.textContent = total.length > 0 ? total.length : '';

  if (visible.length === 0) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  list.innerHTML = visible.map((item, idx) => `
    <li class="item ${item.watched ? 'watched' : ''}"
        data-id="${item.id}"
        data-type="${item.type}"
        draggable="${!item.watched}"
        style="animation-delay:${idx * 0.04}s"
    >
      <span class="drag-handle" title="Drag to reorder">⠿</span>
      <span class="rank">#${item.rank}</span>
      <span class="item-title" title="${escHtml(item.title)}">${escHtml(item.title)}</span>
      ${starsDisplay(item.rating)}
      <div class="item-actions">
        <button class="btn-icon rename-btn" data-id="${item.id}" title="Rename">✏️</button>
        ${item.watched
          ? `<button class="btn-icon unwatch-btn" data-id="${item.id}">↩ Unwatch</button>
             <button class="btn-icon rate-btn"    data-id="${item.id}">★ Rate</button>`
          : `<button class="btn-icon watch-btn"   data-id="${item.id}">✓ Watched</button>`
        }
        <button class="btn-icon delete-btn" data-id="${item.id}">✕</button>
      </div>
    </li>
  `).join('');

  attachItemListeners(list);
  attachDragListeners(list, type);
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Item listeners ───────────────────────────────────────────────────────────
function attachItemListeners(list) {
  list.querySelectorAll('.watch-btn').forEach(btn =>
    btn.addEventListener('click', () => markWatched(btn.dataset.id)));
  list.querySelectorAll('.unwatch-btn').forEach(btn =>
    btn.addEventListener('click', () => unwatch(btn.dataset.id)));
  list.querySelectorAll('.delete-btn').forEach(btn =>
    btn.addEventListener('click', () => deleteItem(btn.dataset.id)));
  list.querySelectorAll('.rate-btn').forEach(btn =>
    btn.addEventListener('click', () => openRatingModal(btn.dataset.id)));
  list.querySelectorAll('.rename-btn').forEach(btn =>
    btn.addEventListener('click', () => startRename(btn.dataset.id)));
}

async function markWatched(id) {
  await api('PUT', `/api/items/${id}`, { watched: true });
  await loadItems();
  const el = document.querySelector(`.item[data-id="${id}"]`);
  if (el) { el.classList.add('just-watched'); el.addEventListener('animationend', () => el.classList.remove('just-watched'), { once: true }); }
  launchConfetti();
  openRatingModal(id);
}

async function unwatch(id) {
  await api('PUT', `/api/items/${id}`, { watched: false, rating: null });
  await loadItems();
}

async function deleteItem(id) {
  const el = document.querySelector(`.item[data-id="${id}"]`);
  if (el) {
    el.classList.add('removing');
    await new Promise(r => setTimeout(r, 240));
  }
  await api('DELETE', `/api/items/${id}`);
  items = items.filter(i => i.id !== id);
  render();
}

// ── Rename (inline) ──────────────────────────────────────────────────────────
function startRename(id) {
  const el = document.querySelector(`.item[data-id="${id}"]`);
  if (!el) return;

  const titleEl  = el.querySelector('.item-title');
  const renameBtn = el.querySelector('.rename-btn');
  const currentTitle = items.find(i => i.id === id)?.title || '';

  // Swap title span for an input
  const input = document.createElement('input');
  input.type      = 'text';
  input.className = 'rename-input';
  input.value     = currentTitle;
  titleEl.replaceWith(input);
  renameBtn.style.display = 'none';
  input.focus();
  input.select();

  async function save() {
    const newTitle = input.value.trim();
    if (newTitle && newTitle !== currentTitle) {
      await api('PUT', `/api/items/${id}`, { title: newTitle });
    }
    await loadItems();
  }

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter')  { e.preventDefault(); save(); }
    if (e.key === 'Escape') { loadItems(); } // cancel
  });
  input.addEventListener('blur', save);
}

// ── Add item ─────────────────────────────────────────────────────────────────
document.getElementById('addBtn').addEventListener('click', addItem);
document.getElementById('titleInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') addItem();
});

async function addItem() {
  const titleEl = document.getElementById('titleInput');
  const title   = titleEl.value.trim();
  if (!title) {
    titleEl.classList.add('shake');
    titleEl.addEventListener('animationend', () => titleEl.classList.remove('shake'), { once: true });
    titleEl.focus();
    return;
  }

  const btn = document.getElementById('addBtn');
  btn.disabled = true;
  const added = await api('POST', '/api/items', { title, type: currentType });
  titleEl.value = '';
  titleEl.focus();
  btn.disabled = false;
  await loadItems();

  // Bounce the new item
  const el = document.querySelector(`.item[data-id="${added.id}"]`);
  if (el) { el.classList.add('just-added'); el.addEventListener('animationend', () => el.classList.remove('just-added'), { once: true }); }
}

// ── Type toggle ──────────────────────────────────────────────────────────────
function applyTypeVisibility() {
  document.getElementById('list-section-movie').style.display = currentType === 'movie' ? '' : 'none';
  document.getElementById('list-section-show').style.display  = currentType === 'show'  ? '' : 'none';
}

document.querySelectorAll('.type-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    document.querySelectorAll('.type-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    currentType = pill.dataset.type;
    applyTypeVisibility();
  });
});

// ── Filter tabs ──────────────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentFilter = tab.dataset.filter;
    render();
  });
});

// ── Rating modal ─────────────────────────────────────────────────────────────
let pendingRatingId = null;
let selectedRating  = null;

function openRatingModal(id) {
  pendingRatingId = id;
  selectedRating  = null;
  const item = items.find(i => i.id === id);

  document.getElementById('modalTitle').textContent = item ? item.title : '';
  document.getElementById('starLabel').textContent   = 'Tap a star to rate';
  document.getElementById('submitRating').disabled   = true;
  document.getElementById('modalEmoji').textContent  = item?.type === 'movie' ? '🎬' : '📺';

  document.querySelectorAll('#starPicker .star').forEach(s => s.classList.remove('selected', 'hovered'));

  if (item && item.rating) {
    selectedRating = item.rating;
    highlightStars(item.rating, 'selected');
    document.getElementById('starLabel').textContent = STAR_LABELS[item.rating];
    document.getElementById('submitRating').disabled = false;
  }

  document.getElementById('ratingModal').classList.remove('hidden');
}

function highlightStars(upTo, cls) {
  document.querySelectorAll('#starPicker .star').forEach(s => {
    s.classList.remove(cls);
    if (parseInt(s.dataset.value) <= upTo) s.classList.add(cls);
  });
}

document.querySelectorAll('#starPicker .star').forEach(star => {
  star.addEventListener('mouseenter', () => {
    const val = parseInt(star.dataset.value);
    highlightStars(val, 'hovered');
    document.getElementById('starLabel').textContent = STAR_LABELS[val];
  });
  star.addEventListener('mouseleave', () => {
    document.querySelectorAll('#starPicker .star').forEach(s => s.classList.remove('hovered'));
    document.getElementById('starLabel').textContent = selectedRating ? STAR_LABELS[selectedRating] : 'Tap a star to rate';
  });
  star.addEventListener('click', () => {
    selectedRating = parseInt(star.dataset.value);
    highlightStars(selectedRating, 'selected');
    document.getElementById('starLabel').textContent = STAR_LABELS[selectedRating];
    document.getElementById('submitRating').disabled = false;
  });
});

document.getElementById('submitRating').addEventListener('click', async () => {
  if (!selectedRating || !pendingRatingId) return;
  await api('PUT', `/api/items/${pendingRatingId}`, { rating: selectedRating });
  closeModal();
  await loadItems();
});

document.getElementById('skipRating').addEventListener('click', closeModal);
document.getElementById('ratingModal').addEventListener('click', e => {
  if (e.target === document.getElementById('ratingModal')) closeModal();
});

function closeModal() {
  document.getElementById('ratingModal').classList.add('hidden');
  pendingRatingId = null;
  selectedRating  = null;
}

// ── Confetti ─────────────────────────────────────────────────────────────────
function launchConfetti() {
  const container = document.getElementById('confetti');
  for (let i = 0; i < 55; i++) {
    const el    = document.createElement('div');
    el.className = 'confetti-piece';
    const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    const size  = 5 + Math.random() * 8;
    el.style.cssText = `
      left:${Math.random() * 100}%;
      background:${color};
      width:${size}px; height:${size}px;
      border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
      animation-duration:${1.2 + Math.random() * 1.4}s;
      animation-delay:${Math.random() * 0.5}s;
    `;
    container.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

// ── Drag-and-drop (per-type) ─────────────────────────────────────────────────
function attachDragListeners(list, type) {
  list.querySelectorAll('.item[draggable="true"]').forEach(el => {
    el.addEventListener('dragstart', e => onDragStart(e, el, type));
    el.addEventListener('dragover',  e => onDragOver(e, el));
    el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
    el.addEventListener('drop',      e => onDrop(e, el, type));
    el.addEventListener('dragend',   () => onDragEnd());
  });
}

function onDragStart(e, el, type) {
  dragSrcId   = el.dataset.id;
  dragSrcType = type;
  el.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function onDragOver(e, el) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  if (el.dataset.id !== dragSrcId) el.classList.add('drag-over');
}

async function onDrop(e, el, type) {
  e.preventDefault();
  el.classList.remove('drag-over');
  const targetId = el.dataset.id;
  if (!dragSrcId || dragSrcId === targetId || dragSrcType !== type) return;

  const visible = itemsOfType(type).map(i => i.id);
  const srcIdx  = visible.indexOf(dragSrcId);
  const tgtIdx  = visible.indexOf(targetId);
  visible.splice(srcIdx, 1);
  visible.splice(tgtIdx, 0, dragSrcId);

  // Include unwatched items not currently shown (if filter is active) to preserve their ranks
  const allOfType = items.filter(i => i.type === type).sort((a,b) => a.rank - b.rank).map(i => i.id);
  const hidden    = allOfType.filter(id => !visible.includes(id));
  const orderedIds = [...visible, ...hidden];

  await api('POST', '/api/items/reorder', { orderedIds, type });
  await loadItems();
}

function onDragEnd() {
  document.querySelectorAll('.item').forEach(el => el.classList.remove('dragging', 'drag-over'));
  dragSrcId   = null;
  dragSrcType = null;
}

// ── Init ─────────────────────────────────────────────────────────────────────
applyTypeVisibility();
loadConfig();
loadItems();
