// Constants
const STORAGE_KEYS = {
	SEEDS: 'pearsSeeds',
	PEARS: 'pearsPears'
};

const MESSAGES = {
	SEED_EXISTS: 'Seed already exists!',
	INSUFFICIENT_SEEDS: 'Need at least 2 available seeds to create random pairs!',
	CONFIRM_CLEAR: 'Are you sure you want to clear all pears?',
	SHARE_SUCCESS: 'Copied!',
	URL_LOAD_ERROR: 'Failed to load from URL:'
};

const UI_TIMINGS = {
	SHARE_FEEDBACK_DURATION: 2000
};

// State Management
let seeds = [];
let pears = [];
let draggedSeed = null;
let assignedSeedIdsCache = null;

// DOM Elements
const seedNameInput = document.getElementById('seedNameInput');
const addSeedButton = document.getElementById('addSeedButton');
const seedList = document.getElementById('seedList');
const createPearButton = document.getElementById('createPearButton');
const randomPairButton = document.getElementById('randomPairButton');
const clearPearsButton = document.getElementById('clearPearsButton');
const shareUrlButton = document.getElementById('shareUrlButton');
const pearsDisplay = document.getElementById('pearsDisplay');

// Initialize App
function init() {
	// Try loading from URL first, then fall back to localStorage
	if (!loadFromUrl()) {
		loadFromStorage();
	}
	setupEventListeners();
	renderSeeds();
	renderPears();
	setupPearTreeDropZone();
	// Update URL whenever state changes
	window.addEventListener('hashchange', handleHashChange);
}

// Storage Functions
function saveToStorage() {
	localStorage.setItem(STORAGE_KEYS.SEEDS, JSON.stringify(seeds));
	localStorage.setItem(STORAGE_KEYS.PEARS, JSON.stringify(pears));
	localStorage.removeItem('pearsAuthenticated'); // Clean up old auth data
}

function safeJsonParse(item, fallback = []) {
	if (!item) return fallback;
	try {
		const parsed = JSON.parse(item);
		return Array.isArray(parsed) ? parsed : fallback;
	} catch (e) {
		return fallback;
	}
}

function loadFromStorage() {
	seeds = safeJsonParse(localStorage.getItem(STORAGE_KEYS.SEEDS));
	pears = safeJsonParse(localStorage.getItem(STORAGE_KEYS.PEARS));

	// Clean up invalid seed references in pears
	const validIds = new Set(seeds.map(e => e.id));
	pears = pears
		.map(pear => ({
			...pear,
			seeds: (pear.seeds || []).filter(id => validIds.has(id))
		}))
		.filter(b => b.seeds.length > 0);
}

// URL Sharing Functions
function encodeStateToUrl() {
	try {
		const state = { seeds, pears };
		const json = JSON.stringify(state);
		// Use btoa with proper UTF-8 encoding
		const encoded = btoa(String.fromCharCode(...new TextEncoder().encode(json)));
		return `#data=${encoded}`;
	} catch (error) {
		console.error('Failed to encode state:', error);
		return '#';
	}
}

function loadFromUrl() {
	const hash = window.location.hash;
	if (!hash.startsWith('#data=')) return false;

	try {
		const encoded = hash.substring(6); // Remove '#data='
		// Decode with proper UTF-8 support
		const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
		const json = new TextDecoder().decode(bytes);
		const state = JSON.parse(json);

		if (state.seeds && Array.isArray(state.seeds)) {
			seeds = state.seeds;
		}
		if (state.pears && Array.isArray(state.pears)) {
			pears = state.pears;
		}

		// Save to localStorage for persistence
		saveToStorage();
		return true;
	} catch (error) {
		console.warn(MESSAGES.URL_LOAD_ERROR, error);
		return false;
	}
}

function handleHashChange() {
	// Reload from URL when hash changes (e.g., user navigates back/forward)
	if (loadFromUrl()) {
		renderSeeds();
		renderPears();
	}
}

function shareUrl() {
	const url = window.location.origin + window.location.pathname + encodeStateToUrl();

	// Copy to clipboard
	navigator.clipboard.writeText(url).then(() => {
		// Show success feedback
		const originalText = shareUrlButton.textContent;
		shareUrlButton.textContent = MESSAGES.SHARE_SUCCESS;
		shareUrlButton.style.backgroundColor = '#28a745';

		setTimeout(() => {
			shareUrlButton.textContent = originalText;
			shareUrlButton.style.backgroundColor = '';
		}, UI_TIMINGS.SHARE_FEEDBACK_DURATION);
	}).catch((error) => {
		console.warn('Clipboard write failed:', error);
		// Fallback: show URL in alert for manual copy
		alert('Share this URL:\n\n' + url);
	});

	// Update browser URL without reload
	history.replaceState(null, '', url);
}

// Setup drop zone for the entire Pear Tree area
function setupPearTreeDropZone() {
	pearsDisplay.addEventListener('dragover', handlePearTreeDragOver);
	pearsDisplay.addEventListener('dragleave', handlePearTreeDragLeave);
	pearsDisplay.addEventListener('drop', handlePearTreeDrop);
}

// Event Listeners
function setupEventListeners() {
	addSeedButton.addEventListener('click', addSeed);
	seedNameInput.addEventListener('keypress', (e) => {
		if (e.key === 'Enter') addSeed();
	});

	createPearButton.addEventListener('click', createPear);
	randomPairButton.addEventListener('click', createRandomPairs);
	clearPearsButton.addEventListener('click', clearAllPears);
	shareUrlButton.addEventListener('click', shareUrl);
}

// Seed Management
function addSeed() {
	const name = seedNameInput.value.trim();
	if (name === '' || name.length > 100) return;

	if (!Array.isArray(seeds)) {
		seeds = [];
	}

	if (seeds.some(e => e.name.toLowerCase() === name.toLowerCase())) {
		alert(MESSAGES.SEED_EXISTS);
		return;
	}
	const seed = { id: Date.now(), name };
	seeds.push(seed);
	seedNameInput.value = '';
	updateUI();
}

function getAssignedSeedIds() {
	if (assignedSeedIdsCache === null) {
		assignedSeedIdsCache = new Set(pears.flatMap(b => b.seeds || []));
	}
	return assignedSeedIdsCache;
}

function invalidateAssignedIdsCache() {
	assignedSeedIdsCache = null;
}

function renderSeeds() {
	const assignedIds = getAssignedSeedIds();
	const fragment = document.createDocumentFragment();

	if (seeds.length === 0) {
		seedList.innerHTML = '<li class="placeholder-text" style="list-style: none; text-align: center; padding: 20px; font-size: 0.85rem;">No seeds yet.</li>';
		return;
	}

	seeds.forEach(seed => {
		const isInPear = assignedIds.has(seed.id);
		const li = document.createElement('li');
		li.className = 'seed-item';
		li.dataset.seedId = seed.id;
		li.setAttribute('role', 'listitem');
		li.setAttribute('aria-label', `Seed: ${seed.name}`);
		if (isInPear) {
			li.classList.add('in-pear');
			// Do NOT set draggable; seed is unavailable once in pear tree
		} else {
			li.draggable = true;
			li.addEventListener('dragstart', e => {
				draggedSeed = seed.id;
				li.classList.add('dragging');
				e.dataTransfer.effectAllowed = 'move';
				e.dataTransfer.setData('text/plain', seed.id.toString());
			});
			li.addEventListener('dragend', () => {
				li.classList.remove('dragging');
				draggedSeed = null;
			});
		}
		const nameSpan = document.createElement('span');
		nameSpan.className = 'seed-name';
		nameSpan.textContent = seed.name;
		const actionsDiv = document.createElement('div');
		actionsDiv.className = 'seed-actions';
		const removeBtn = document.createElement('button');
		removeBtn.className = 'remove-seed';
		removeBtn.textContent = '×';
		removeBtn.title = 'Remove seed';
		removeBtn.setAttribute('aria-label', `Remove ${seed.name}`);
		removeBtn.onclick = e => {
			e.stopPropagation();
			removeSeed(seed.id);
		};
		actionsDiv.appendChild(removeBtn);
		li.appendChild(nameSpan);
		li.appendChild(actionsDiv);
		fragment.appendChild(li);
	});

	seedList.innerHTML = '';
	seedList.appendChild(fragment);
}

// Fully remove a seed from all pears and seed list
function updateUI(skipSave = false) {
	invalidateAssignedIdsCache();
	if (!skipSave) {
		saveToStorage();
	}
	renderSeeds();
	renderPears();
}

function removeSeed(id) {
	pears.forEach(pear => {
		pear.seeds = pear.seeds.filter(seedId => seedId !== id);
	});
	seeds = seeds.filter(e => e.id !== id);
	updateUI();
}

// Pear Functions
function createNewPear(seedIds = []) {
	const seedArray = Array.isArray(seedIds)
		? seedIds.filter(id => typeof id === 'number')
		: (typeof seedIds === 'number' ? [seedIds] : []);

	return {
		id: Date.now(),
		seeds: seedArray,
		locked: false,
		ooo: false
	};
}

function createPear() {
	pears.push(createNewPear());
	saveToStorage();
	renderPears();
}

// Fisher-Yates shuffle algorithm for unbiased randomization
function shuffle(array) {
	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

function createRandomPairs() {
	// Get seeds from locked pears (they stay put)
	const lockedPearSeeds = new Set(pears
		.filter(b => b.locked)
		.flatMap(b => b.seeds));

	// Get all seeds that are either unassigned or in unlocked pears
	const available = seeds.filter(e => !lockedPearSeeds.has(e.id));

	if (available.length < 2) {
		alert(MESSAGES.INSUFFICIENT_SEEDS);
		return;
	}

	// Remove all unlocked pears before reshuffling
	pears = pears.filter(b => b.locked);

	// Shuffle all available seeds and create new pairs
	const shuffled = shuffle(available);
	for (let i = 0; i < shuffled.length; i += 2) {
		const pair = i + 1 < shuffled.length
			? [shuffled[i].id, shuffled[i + 1].id]
			: [shuffled[i].id];
		pears.push({ ...createNewPear(pair), id: Date.now() + i });
	}
	updateUI();
}

function deletePear(pearId) {
	pears = pears.filter(b => b.id !== pearId);
	updateUI();
}

function togglePearLock(pearId) {
	const pear = pears.find(b => b.id === pearId);
	if (!pear) return;

	pear.locked = !pear.locked;
	saveToStorage();
	renderPears();
}

function removeSeedFromPear(pearId, seedId) {
	const pear = pears.find(b => b.id === pearId);
	if (!pear || pear.locked || !Array.isArray(pear.seeds)) return;

	pear.seeds = pear.seeds.filter(id => id !== seedId);
	updateUI();
}

function clearAllPears() {
	if (pears.length === 0) return;
	if (!confirm(MESSAGES.CONFIRM_CLEAR)) return;

	pears = pears.filter(b => b.locked);
	updateUI();
}

function togglePearOOO(pearId) {
	const pear = pears.find(b => b.id === pearId);
	if (!pear) return;
	pear.ooo = !pear.ooo;
	saveToStorage();
	renderPears();
}

function renderPears() {
	const fragment = document.createDocumentFragment();
	const newZone = document.createElement('div');
	newZone.className = 'new-pear-zone';
	newZone.setAttribute('role', 'group');
	newZone.setAttribute('aria-label', 'Create new pear drop zone');
	newZone.innerHTML = '<p>Drag seed here to create a new pear</p>';

	newZone.addEventListener('dragover', e => {
		e.preventDefault();
		newZone.classList.add('drag-over');
		e.dataTransfer.dropEffect = 'move';
	});
	newZone.addEventListener('dragleave', () => {
		newZone.classList.remove('drag-over');
	});
	newZone.addEventListener('drop', e => {
		e.preventDefault();
		e.stopPropagation();
		newZone.classList.remove('drag-over');
		if (!draggedSeed) return;
		pears.push(createNewPear(draggedSeed));
		updateUI();
	});

	fragment.appendChild(newZone);

	pears.forEach((pear, index) => {
		const pearDiv = document.createElement('div');
		pearDiv.className = 'pear';
		pearDiv.dataset.pearId = pear.id;
		pearDiv.setAttribute('role', 'region');
		pearDiv.setAttribute('aria-label', `Pear ${index + 1}`);

		if (pear.locked) pearDiv.classList.add('locked');

		// Drag events for pear
		pearDiv.addEventListener('dragover', handlePearDragOver);
		pearDiv.addEventListener('dragleave', handlePearDragLeave);
		pearDiv.addEventListener('drop', handlePearDrop);

		// Header
		const header = document.createElement('div');
		header.className = 'pear-header';

		const title = document.createElement('div');
		title.className = 'pear-title';
		title.textContent = pear.ooo ? `OOO Pear` : `Pear ${index + 1}`;
		if (pear.ooo) pearDiv.classList.add('ooo');

		const actions = document.createElement('div');
		actions.className = 'pear-actions';

		const lockBtn = document.createElement('button');
		lockBtn.className = 'lock-pear-btn';
		lockBtn.textContent = pear.locked ? '🔒' : '🔓';
		lockBtn.title = pear.locked ? 'Unlock pear' : 'Lock pear';
		lockBtn.setAttribute('aria-label', pear.locked ? 'Unlock pear' : 'Lock pear');
		lockBtn.onclick = () => togglePearLock(pear.id);
		const oooBtn = document.createElement('button');
		oooBtn.className = 'ooo-pear-btn';
		oooBtn.textContent = pear.ooo ? 'OOO' : 'Active';
		oooBtn.title = pear.ooo ? 'Mark pear active' : 'Mark pear out of office';
		oooBtn.setAttribute('aria-label', pear.ooo ? 'Mark pear active' : 'Mark pear out of office');
		oooBtn.onclick = () => togglePearOOO(pear.id);

		const deleteBtn = document.createElement('button');
		deleteBtn.className = 'delete-pear-btn';
		deleteBtn.textContent = '×';
		deleteBtn.title = 'Delete pear';
		deleteBtn.setAttribute('aria-label', `Delete pear ${index + 1}`);
		deleteBtn.onclick = () => deletePear(pear.id);

		actions.appendChild(lockBtn);
		actions.appendChild(oooBtn);
		actions.appendChild(deleteBtn);

		header.appendChild(title);
		header.appendChild(actions);

		// Seeds in pear
		const seedsDiv = document.createElement('div');
		seedsDiv.className = 'pear-seeds';

		pear.seeds.forEach(seedId => {
			const seed = seeds.find(e => e.id === seedId);
			if (!seed) return;

			const seedDiv = document.createElement('div');
			seedDiv.className = 'pear-seed';
			seedDiv.draggable = !pear.locked;
			seedDiv.dataset.seedId = seedId;

			if (!pear.locked) {
				seedDiv.addEventListener('dragstart', handlePearSeedDragStart);
				seedDiv.addEventListener('dragend', () => {
					seedDiv.classList.remove('dragging');
					draggedSeed = null;
				});
			}

			const nameSpan = document.createElement('span');
			nameSpan.textContent = seed.name;

			const removeBtn = document.createElement('button');
			removeBtn.className = 'remove-from-pear';
			removeBtn.textContent = '×';
			removeBtn.setAttribute('aria-label', `Remove ${seed.name} from pear`);
			removeBtn.onclick = () => removeSeedFromPear(pear.id, seedId);

			if (pear.locked) {
				removeBtn.style.display = 'none';
			}

			seedDiv.appendChild(nameSpan);
			seedDiv.appendChild(removeBtn);
			seedsDiv.appendChild(seedDiv);
		});

		// Count
		const count = document.createElement('div');
		count.className = 'pear-count';
		const seedCount = pear.seeds.length;
		count.textContent = seedCount === 1 ? '1 seed' : `${seedCount} seeds`;

		pearDiv.appendChild(header);
		pearDiv.appendChild(seedsDiv);
		pearDiv.appendChild(count);
		fragment.appendChild(pearDiv);
	});

	pearsDisplay.innerHTML = '';
	pearsDisplay.appendChild(fragment);
}

function handlePearSeedDragStart(e) {
	const seedId = parseInt(e.target.dataset.seedId);
	const pearId = parseInt(e.target.closest('.pear').dataset.pearId);
	const pear = pears.find(b => b.id === pearId);

	if (pear && pear.locked) {
		e.preventDefault();
		return;
	}

	draggedSeed = seedId;
	e.target.classList.add('dragging');
	e.dataTransfer.effectAllowed = 'move';

	// Remove from current pear (save will happen on drop)
	pear.seeds = pear.seeds.filter(id => id !== seedId);
}

function handlePearDragOver(e) {
	e.preventDefault();
	const pearDiv = e.currentTarget;
	const pearId = parseInt(pearDiv.dataset.pearId);
	const pear = pears.find(b => b.id === pearId);

	if (pear && !pear.locked) {
		e.dataTransfer.dropEffect = 'move';
		pearDiv.classList.add('drag-over');
	}
}

function handlePearDragLeave(e) {
	e.currentTarget.classList.remove('drag-over');
}

function handlePearDrop(e) {
	e.preventDefault();
	e.stopPropagation(); // Prevent event from bubbling to pear tree
	const pearDiv = e.currentTarget;
	pearDiv.classList.remove('drag-over');

	const pearId = parseInt(pearDiv.dataset.pearId);
	if (isNaN(pearId)) return;

	const pear = pears.find(b => b.id === pearId);

	if (!pear || pear.locked || !draggedSeed) return;

	// Add seed to pear if not already there (avoid duplicates within same pear)
	if (!pear.seeds.includes(draggedSeed)) {
		pear.seeds.push(draggedSeed);
		updateUI();
	} else {
		// If already exists, still need to re-render to restore drag source
		updateUI();
	}
}

// Pear Tree drop zone handlers
function handlePearTreeDragOver(e) {
	// Only handle if not over a specific pear
	if (e.target.closest('.pear')) {
		pearsDisplay.classList.remove('drag-over-empty');
		return;
	}

	e.preventDefault();
	e.dataTransfer.dropEffect = 'move';
	pearsDisplay.classList.add('drag-over-empty');
}

function handlePearTreeDragLeave(e) {
	// Only remove highlight if leaving the entire pear tree area
	if (e.target === pearsDisplay) {
		pearsDisplay.classList.remove('drag-over-empty');
	}
}

function handlePearTreeDrop(e) {
	// Only handle if not over a specific pear
	if (e.target.closest('.pear')) {
		return;
	}

	e.preventDefault();
	pearsDisplay.classList.remove('drag-over-empty');

	if (!draggedSeed || typeof draggedSeed !== 'number') return;

	pears.push(createNewPear(draggedSeed));
	updateUI();
}

// Initialize on page load
init();
