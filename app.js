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
let dragContext = null; // { seedId: number, fromPearId: number | null }
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

function init() {
	if (!loadFromUrl()) {
		loadFromStorage();
	}
	setupEventListeners();
	renderSeeds();
	renderPears();
	setupPearTreeDropZone();
	window.addEventListener('hashchange', handleHashChange);
}

// Storage Functions
function saveToStorage() {
	localStorage.setItem(STORAGE_KEYS.SEEDS, JSON.stringify(seeds));
	localStorage.setItem(STORAGE_KEYS.PEARS, JSON.stringify(pears));
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
	pears = pears.map(pear => ({
		...pear,
		seeds: (pear.seeds || []).filter(id => validIds.has(id))
	}));
}

function encodeStateToUrl() {
	try {
		const state = { seeds, pears };
		const json = JSON.stringify(state);
		const encoded = compressToEncodedURIComponent(json);
		return `#data=lz:${encoded}`;
	} catch (error) {
		console.error('Failed to encode state:', error);
		return '#';
	}
}

function loadFromUrl() {
	const hash = window.location.hash;
	if (!hash.startsWith('#data=')) return false;

	try {
		const encoded = hash.substring(6);
		let json;

		if (encoded.startsWith('lz:')) {
			const decompressed = decompressFromEncodedURIComponent(encoded.substring(3));
			if (!decompressed) return false;
			json = decompressed;
		} else {
			// Legacy (pre-compression) format: base64 of UTF-8 JSON
			const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
			json = new TextDecoder().decode(bytes);
		}

		const state = JSON.parse(json);

		if (state.seeds && Array.isArray(state.seeds)) {
			seeds = state.seeds;
		}
		if (state.pears && Array.isArray(state.pears)) {
			pears = state.pears;
		}

		saveToStorage();
		return true;
	} catch (error) {
		console.warn(MESSAGES.URL_LOAD_ERROR, error);
		return false;
	}
}

function handleHashChange() {
	if (loadFromUrl()) {
		renderSeeds();
		renderPears();
	}
}

function shareUrl() {
	const url = window.location.origin + window.location.pathname + encodeStateToUrl();

	navigator.clipboard.writeText(url).then(() => {
		const originalText = shareUrlButton.textContent;
		shareUrlButton.textContent = MESSAGES.SHARE_SUCCESS;
		shareUrlButton.style.backgroundColor = '#28a745';

		setTimeout(() => {
			shareUrlButton.textContent = originalText;
			shareUrlButton.style.backgroundColor = '';
		}, UI_TIMINGS.SHARE_FEEDBACK_DURATION);
	}).catch((error) => {
		console.warn('Clipboard write failed:', error);
		alert('Share this URL:\n\n' + url);
	});

	history.replaceState(null, '', url);
}

function setupPearTreeDropZone() {
	pearsDisplay.addEventListener('dragover', handlePearTreeDragOver);
	pearsDisplay.addEventListener('dragleave', handlePearTreeDragLeave);
	pearsDisplay.addEventListener('drop', handlePearTreeDrop);
}

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
		} else {
			li.draggable = true;
			li.addEventListener('dragstart', e => {
				dragContext = { seedId: seed.id, fromPearId: null };
				li.classList.add('dragging');
				e.dataTransfer.effectAllowed = 'move';
				e.dataTransfer.setData('text/plain', seed.id.toString());
			});
			li.addEventListener('dragend', () => {
				li.classList.remove('dragging');
				dragContext = null;
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
	const seedById = new Map(seeds.map(seed => [seed.id, seed]));
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
		if (!dragContext) return;

		if (dragContext.fromPearId !== null) {
			const fromPear = pears.find(b => b.id === dragContext.fromPearId);
			if (fromPear && Array.isArray(fromPear.seeds)) {
				fromPear.seeds = fromPear.seeds.filter(id => id !== dragContext.seedId);
			}
		}

		pears.push(createNewPear(dragContext.seedId));
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

		pearDiv.addEventListener('dragover', handlePearDragOver);
		pearDiv.addEventListener('dragleave', handlePearDragLeave);
		pearDiv.addEventListener('drop', handlePearDrop);

		const header = document.createElement('div');
		header.className = 'pear-header';

		const title = document.createElement('div');
		title.className = 'pear-title';
		const numberBadge = document.createElement('span');
		numberBadge.className = 'pear-number';
		numberBadge.textContent = String(index + 1);
		title.appendChild(numberBadge);
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

		const seedsDiv = document.createElement('div');
		seedsDiv.className = 'pear-seeds';

		pear.seeds.forEach(seedId => {
			const seed = seedById.get(seedId);
			if (!seed) return;

			const seedDiv = document.createElement('div');
			seedDiv.className = 'pear-seed';
			seedDiv.draggable = !pear.locked;
			seedDiv.dataset.seedId = seedId;

			if (!pear.locked) {
				seedDiv.addEventListener('dragstart', handlePearSeedDragStart);
				seedDiv.addEventListener('dragend', () => {
					seedDiv.classList.remove('dragging');
					dragContext = null;
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
	const seedId = Number(e.currentTarget.dataset.seedId);
	const pearId = Number(e.currentTarget.closest('.pear').dataset.pearId);
	const pear = pears.find(b => b.id === pearId);

	if (pear && pear.locked) {
		e.preventDefault();
		return;
	}

	dragContext = { seedId, fromPearId: pearId };
	e.currentTarget.classList.add('dragging');
	e.dataTransfer.effectAllowed = 'move';
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
	e.stopPropagation();
	const pearDiv = e.currentTarget;
	pearDiv.classList.remove('drag-over');

	const pearId = Number(pearDiv.dataset.pearId);
	if (isNaN(pearId)) return;

	const pear = pears.find(b => b.id === pearId);

	if (!pear || pear.locked || !dragContext) return;

	if (dragContext.fromPearId !== null && dragContext.fromPearId !== pearId) {
		const fromPear = pears.find(b => b.id === dragContext.fromPearId);
		if (fromPear && Array.isArray(fromPear.seeds)) {
			fromPear.seeds = fromPear.seeds.filter(id => id !== dragContext.seedId);
		}
	}

	if (!pear.seeds.includes(dragContext.seedId)) {
		pear.seeds.push(dragContext.seedId);
	}
	updateUI();
}

function handlePearTreeDragOver(e) {
	if (e.target.closest('.pear')) {
		pearsDisplay.classList.remove('drag-over-empty');
		return;
	}

	e.preventDefault();
	e.dataTransfer.dropEffect = 'move';
	pearsDisplay.classList.add('drag-over-empty');
}

function handlePearTreeDragLeave(e) {
	if (e.target === pearsDisplay) {
		pearsDisplay.classList.remove('drag-over-empty');
	}
}

function handlePearTreeDrop(e) {
	if (e.target.closest('.pear')) {
		return;
	}

	e.preventDefault();
	pearsDisplay.classList.remove('drag-over-empty');

	if (!dragContext || typeof dragContext.seedId !== 'number') return;

	if (dragContext.fromPearId !== null) {
		const fromPear = pears.find(b => b.id === dragContext.fromPearId);
		if (fromPear && Array.isArray(fromPear.seeds)) {
			fromPear.seeds = fromPear.seeds.filter(id => id !== dragContext.seedId);
		}
	}

	pears.push(createNewPear(dragContext.seedId));
	updateUI();
}

// URL-safe string compression (no dependencies)
// Uses an LZ-based algorithm compatible with "lz-string"-style encodedURIComponent payloads.
const URL_SAFE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";

function compressToEncodedURIComponent(input) {
	if (input == null) return '';
	return _compress(input, 6, a => URL_SAFE_ALPHABET.charAt(a));
}

function decompressFromEncodedURIComponent(input) {
	if (input == null) return '';
	if (input === '') return null;
	input = input.replace(/ /g, '+');
	return _decompress(input.length, 32, index => URL_SAFE_ALPHABET.indexOf(input.charAt(index)));
}

function _compress(uncompressed, bitsPerChar, getCharFromInt) {
	if (uncompressed == null) return '';

	let i;
	let value;
	const contextDictionary = new Map();
	const contextDictionaryToCreate = new Set();
	let contextC = '';
	let contextW = '';
	let contextWC = '';
	let contextEnlargeIn = 2;
	let contextDictSize = 3;
	let contextNumBits = 2;
	const contextData = [];
	let contextDataVal = 0;
	let contextDataPosition = 0;

	for (let ii = 0; ii < uncompressed.length; ii += 1) {
		contextC = uncompressed.charAt(ii);
		if (!contextDictionary.has(contextC)) {
			contextDictionary.set(contextC, contextDictSize++);
			contextDictionaryToCreate.add(contextC);
		}

		contextWC = contextW + contextC;
		if (contextDictionary.has(contextWC)) {
			contextW = contextWC;
		} else {
			if (contextDictionaryToCreate.has(contextW)) {
				if (contextW.charCodeAt(0) < 256) {
					for (i = 0; i < contextNumBits; i++) {
						contextDataVal = (contextDataVal << 1);
						if (contextDataPosition === bitsPerChar - 1) {
							contextDataPosition = 0;
							contextData.push(getCharFromInt(contextDataVal));
							contextDataVal = 0;
						} else {
							contextDataPosition++;
						}
					}
					value = contextW.charCodeAt(0);
					for (i = 0; i < 8; i++) {
						contextDataVal = (contextDataVal << 1) | (value & 1);
						if (contextDataPosition === bitsPerChar - 1) {
							contextDataPosition = 0;
							contextData.push(getCharFromInt(contextDataVal));
							contextDataVal = 0;
						} else {
							contextDataPosition++;
						}
						value >>= 1;
					}
				} else {
					value = 1;
					for (i = 0; i < contextNumBits; i++) {
						contextDataVal = (contextDataVal << 1) | value;
						if (contextDataPosition === bitsPerChar - 1) {
							contextDataPosition = 0;
							contextData.push(getCharFromInt(contextDataVal));
							contextDataVal = 0;
						} else {
							contextDataPosition++;
						}
						value = 0;
					}
					value = contextW.charCodeAt(0);
					for (i = 0; i < 16; i++) {
						contextDataVal = (contextDataVal << 1) | (value & 1);
						if (contextDataPosition === bitsPerChar - 1) {
							contextDataPosition = 0;
							contextData.push(getCharFromInt(contextDataVal));
							contextDataVal = 0;
						} else {
							contextDataPosition++;
						}
						value >>= 1;
					}
				}
				contextEnlargeIn--;
				if (contextEnlargeIn === 0) {
					contextEnlargeIn = Math.pow(2, contextNumBits);
					contextNumBits++;
				}
				contextDictionaryToCreate.delete(contextW);
			} else {
				value = contextDictionary.get(contextW);
				for (i = 0; i < contextNumBits; i++) {
					contextDataVal = (contextDataVal << 1) | (value & 1);
					if (contextDataPosition === bitsPerChar - 1) {
						contextDataPosition = 0;
						contextData.push(getCharFromInt(contextDataVal));
						contextDataVal = 0;
					} else {
						contextDataPosition++;
					}
					value >>= 1;
				}
			}
			contextEnlargeIn--;
			if (contextEnlargeIn === 0) {
				contextEnlargeIn = Math.pow(2, contextNumBits);
				contextNumBits++;
			}
			contextDictionary.set(contextWC, contextDictSize++);
			contextW = String(contextC);
		}
	}

	if (contextW !== '') {
		if (contextDictionaryToCreate.has(contextW)) {
			if (contextW.charCodeAt(0) < 256) {
				for (i = 0; i < contextNumBits; i++) {
					contextDataVal = (contextDataVal << 1);
					if (contextDataPosition === bitsPerChar - 1) {
						contextDataPosition = 0;
						contextData.push(getCharFromInt(contextDataVal));
						contextDataVal = 0;
					} else {
						contextDataPosition++;
					}
				}
				value = contextW.charCodeAt(0);
				for (i = 0; i < 8; i++) {
					contextDataVal = (contextDataVal << 1) | (value & 1);
					if (contextDataPosition === bitsPerChar - 1) {
						contextDataPosition = 0;
						contextData.push(getCharFromInt(contextDataVal));
						contextDataVal = 0;
					} else {
						contextDataPosition++;
					}
					value >>= 1;
				}
			} else {
				value = 1;
				for (i = 0; i < contextNumBits; i++) {
					contextDataVal = (contextDataVal << 1) | value;
					if (contextDataPosition === bitsPerChar - 1) {
						contextDataPosition = 0;
						contextData.push(getCharFromInt(contextDataVal));
						contextDataVal = 0;
					} else {
						contextDataPosition++;
					}
					value = 0;
				}
				value = contextW.charCodeAt(0);
				for (i = 0; i < 16; i++) {
					contextDataVal = (contextDataVal << 1) | (value & 1);
					if (contextDataPosition === bitsPerChar - 1) {
						contextDataPosition = 0;
						contextData.push(getCharFromInt(contextDataVal));
						contextDataVal = 0;
					} else {
						contextDataPosition++;
					}
					value >>= 1;
				}
			}
			contextEnlargeIn--;
			if (contextEnlargeIn === 0) {
				contextEnlargeIn = Math.pow(2, contextNumBits);
				contextNumBits++;
			}
			contextDictionaryToCreate.delete(contextW);
		} else {
			value = contextDictionary.get(contextW);
			for (i = 0; i < contextNumBits; i++) {
				contextDataVal = (contextDataVal << 1) | (value & 1);
				if (contextDataPosition === bitsPerChar - 1) {
					contextDataPosition = 0;
					contextData.push(getCharFromInt(contextDataVal));
					contextDataVal = 0;
				} else {
					contextDataPosition++;
				}
				value >>= 1;
			}
		}
		contextEnlargeIn--;
		if (contextEnlargeIn === 0) {
			contextEnlargeIn = Math.pow(2, contextNumBits);
			contextNumBits++;
		}
	}

	value = 2;
	for (i = 0; i < contextNumBits; i++) {
		contextDataVal = (contextDataVal << 1) | (value & 1);
		if (contextDataPosition === bitsPerChar - 1) {
			contextDataPosition = 0;
			contextData.push(getCharFromInt(contextDataVal));
			contextDataVal = 0;
		} else {
			contextDataPosition++;
		}
		value >>= 1;
	}

	while (true) {
		contextDataVal = (contextDataVal << 1);
		if (contextDataPosition === bitsPerChar - 1) {
			contextData.push(getCharFromInt(contextDataVal));
			break;
		}
		contextDataPosition++;
	}
	return contextData.join('');
}

function _decompress(length, resetValue, getNextValue) {
	const dictionary = [];
	let next;
	let enlargeIn = 4;
	let dictSize = 4;
	let numBits = 3;
	let entry = '';
	const result = [];
	let i;
	let w;
	let bits;
	let resb;
	let maxpower;
	let power;
	let c;

	const data = { val: getNextValue(0), position: resetValue, index: 1 };

	for (i = 0; i < 3; i += 1) {
		dictionary[i] = i;
	}

	bits = 0;
	maxpower = Math.pow(2, 2);
	power = 1;
	while (power !== maxpower) {
		resb = data.val & data.position;
		data.position >>= 1;
		if (data.position === 0) {
			data.position = resetValue;
			data.val = getNextValue(data.index++);
		}
		bits |= (resb > 0 ? 1 : 0) * power;
		power <<= 1;
	}

	switch (next = bits) {
		case 0:
			bits = 0;
			maxpower = Math.pow(2, 8);
			power = 1;
			while (power !== maxpower) {
				resb = data.val & data.position;
				data.position >>= 1;
				if (data.position === 0) {
					data.position = resetValue;
					data.val = getNextValue(data.index++);
				}
				bits |= (resb > 0 ? 1 : 0) * power;
				power <<= 1;
			}
			c = String.fromCharCode(bits);
			break;
		case 1:
			bits = 0;
			maxpower = Math.pow(2, 16);
			power = 1;
			while (power !== maxpower) {
				resb = data.val & data.position;
				data.position >>= 1;
				if (data.position === 0) {
					data.position = resetValue;
					data.val = getNextValue(data.index++);
				}
				bits |= (resb > 0 ? 1 : 0) * power;
				power <<= 1;
			}
			c = String.fromCharCode(bits);
			break;
		case 2:
			return '';
		default:
			return null;
	}

	dictionary[3] = c;
	w = c;
	result.push(c);

	while (true) {
		if (data.index > length) {
			return '';
		}

		bits = 0;
		maxpower = Math.pow(2, numBits);
		power = 1;
		while (power !== maxpower) {
			resb = data.val & data.position;
			data.position >>= 1;
			if (data.position === 0) {
				data.position = resetValue;
				data.val = getNextValue(data.index++);
			}
			bits |= (resb > 0 ? 1 : 0) * power;
			power <<= 1;
		}

		switch (c = bits) {
			case 0:
				bits = 0;
				maxpower = Math.pow(2, 8);
				power = 1;
				while (power !== maxpower) {
					resb = data.val & data.position;
					data.position >>= 1;
					if (data.position === 0) {
						data.position = resetValue;
						data.val = getNextValue(data.index++);
					}
					bits |= (resb > 0 ? 1 : 0) * power;
					power <<= 1;
				}

				dictionary[dictSize++] = String.fromCharCode(bits);
				c = dictSize - 1;
				enlargeIn--;
				break;
			case 1:
				bits = 0;
				maxpower = Math.pow(2, 16);
				power = 1;
				while (power !== maxpower) {
					resb = data.val & data.position;
					data.position >>= 1;
					if (data.position === 0) {
						data.position = resetValue;
						data.val = getNextValue(data.index++);
					}
					bits |= (resb > 0 ? 1 : 0) * power;
					power <<= 1;
				}
				dictionary[dictSize++] = String.fromCharCode(bits);
				c = dictSize - 1;
				enlargeIn--;
				break;
			case 2:
				return result.join('');
		}

		if (enlargeIn === 0) {
			enlargeIn = Math.pow(2, numBits);
			numBits++;
		}

		if (dictionary[c]) {
			entry = dictionary[c];
		} else {
			if (c === dictSize) {
				entry = w + w.charAt(0);
			} else {
				return null;
			}
		}
		result.push(entry);

		dictionary[dictSize++] = w + entry.charAt(0);
		enlargeIn--;

		w = entry;

		if (enlargeIn === 0) {
			enlargeIn = Math.pow(2, numBits);
			numBits++;
		}
	}
}

init();
