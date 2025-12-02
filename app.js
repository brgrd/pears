// State Management
let engineers = [];
let buckets = [];
let draggedEngineer = null;

// DOM Elements
const engineerNameInput = document.getElementById('engineerNameInput');
const addEngineerButton = document.getElementById('addEngineerButton');
const engineerList = document.getElementById('engineerList');
const createBucketButton = document.getElementById('createBucketButton');
const randomPairButton = document.getElementById('randomPairButton');
const clearBucketsButton = document.getElementById('clearBucketsButton');
const bucketsDisplay = document.getElementById('bucketsDisplay');

// Initialize App
function init() {
	loadFromStorage();
	setupEventListeners();
	renderEngineers();
	renderBuckets();
	setupPearTreeDropZone();
}

// Storage Functions
function saveToStorage() {
	localStorage.setItem('pearsEngineers', JSON.stringify(engineers));
	localStorage.setItem('pearsBuckets', JSON.stringify(buckets));
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
	engineers = safeJsonParse(localStorage.getItem('pearsEngineers'));
	buckets = safeJsonParse(localStorage.getItem('pearsBuckets'));

	// Clean up invalid engineer references in buckets
	const validIds = new Set(engineers.map(e => e.id));
	buckets = buckets
		.map(bucket => ({
			...bucket,
			engineers: (bucket.engineers || []).filter(id => validIds.has(id))
		}))
		.filter(b => b.engineers.length > 0);
}

// Setup drop zone for the entire Pear Tree area
function setupPearTreeDropZone() {
	bucketsDisplay.addEventListener('dragover', handlePearTreeDragOver);
	bucketsDisplay.addEventListener('dragleave', handlePearTreeDragLeave);
	bucketsDisplay.addEventListener('drop', handlePearTreeDrop);
}

// Event Listeners
function setupEventListeners() {
	addEngineerButton.addEventListener('click', addEngineer);
	engineerNameInput.addEventListener('keypress', (e) => {
		if (e.key === 'Enter') addEngineer();
	});

	createBucketButton.addEventListener('click', createBucket);
	randomPairButton.addEventListener('click', createRandomPairs);
	clearBucketsButton.addEventListener('click', clearAllBuckets);
}

// Engineer Management
function addEngineer() {
	const name = engineerNameInput.value.trim();
	if (name === '') return;

	if (!Array.isArray(engineers)) {
		engineers = [];
	}

	if (engineers.some(e => e.name.toLowerCase() === name.toLowerCase())) {
		alert('Engineer already exists!');
		return;
	}
	const engineer = { id: Date.now(), name };
	engineers.push(engineer);
	engineerNameInput.value = '';
	updateUI();
}

function getAssignedEngineerIds() {
	return new Set(buckets.flatMap(b => b.engineers || []));
}

function renderEngineers() {
	engineerList.innerHTML = '';
	const assignedIds = getAssignedEngineerIds();
	if (engineers.length === 0) {
		engineerList.innerHTML = '<li class="placeholder-text" style="list-style: none; text-align: center; padding: 20px; font-size: 0.85rem;">No seeds yet.</li>';
		return;
	}
	engineers.forEach(seed => {
		const isInPear = assignedIds.has(seed.id);
		const li = document.createElement('li');
		li.className = 'engineer-item';
		li.dataset.engineerId = seed.id;
		if (isInPear) {
			li.classList.add('in-bucket');
			// Do NOT set draggable; seed is unavailable once in pear tree
		} else {
			li.draggable = true;
			li.addEventListener('dragstart', e => {
				draggedEngineer = seed.id;
				li.classList.add('dragging');
				e.dataTransfer.effectAllowed = 'move';
				e.dataTransfer.setData('text/plain', seed.id.toString());
			});
			li.addEventListener('dragend', () => {
				li.classList.remove('dragging');
				draggedEngineer = null;
			});
		}
		const nameSpan = document.createElement('span');
		nameSpan.className = 'engineer-name';
		nameSpan.textContent = seed.name;
		const actionsDiv = document.createElement('div');
		actionsDiv.className = 'engineer-actions';
		const removeBtn = document.createElement('button');
		removeBtn.className = 'remove-engineer';
		removeBtn.textContent = '×';
		removeBtn.title = 'Remove seed';
		removeBtn.onclick = e => {
			e.stopPropagation();
			removeEngineer(seed.id);
		};
		actionsDiv.appendChild(removeBtn);
		li.appendChild(nameSpan);
		li.appendChild(actionsDiv);
		engineerList.appendChild(li);
	});
}

// Fully remove a seed from all pears and seed list
function updateUI() {
	saveToStorage();
	renderEngineers();
	renderBuckets();
}

function removeEngineer(id) {
	buckets.forEach(bucket => {
		bucket.engineers = bucket.engineers.filter(engId => engId !== id);
	});
	engineers = engineers.filter(e => e.id !== id);
	updateUI();
}

// Bucket Functions
function createNewBucket(engineerIds = []) {
	return {
		id: Date.now(),
		engineers: Array.isArray(engineerIds) ? engineerIds : [engineerIds],
		locked: false,
		ooo: false
	};
}

function createBucket() {
	buckets.push(createNewBucket());
	saveToStorage();
	renderBuckets();
}

function createRandomPairs() {
	const inBuckets = buckets.flatMap(b => b.engineers);
	const available = engineers.filter(e => !inBuckets.includes(e.id));
	if (available.length < 2) {
		alert('Need at least 2 available seeds to create random pairs!');
		return;
	}
	const shuffled = [...available].sort(() => Math.random() - 0.5);
	for (let i = 0; i < shuffled.length; i += 2) {
		const pair = i + 1 < shuffled.length
			? [shuffled[i].id, shuffled[i + 1].id]
			: [shuffled[i].id];
		buckets.push({ ...createNewBucket(pair), id: Date.now() + i });
	}
	updateUI();
}

function deleteBucket(bucketId) {
	buckets = buckets.filter(b => b.id !== bucketId);
	updateUI();
}

function toggleBucketLock(bucketId) {
	const bucket = buckets.find(b => b.id === bucketId);
	if (!bucket) return;

	bucket.locked = !bucket.locked;
	saveToStorage();
	renderBuckets();
}

function removeEngineerFromBucket(bucketId, engineerId) {
	const bucket = buckets.find(b => b.id === bucketId);
	if (!bucket || bucket.locked) return;

	bucket.engineers = bucket.engineers.filter(id => id !== engineerId);
	updateUI();
}

function clearAllBuckets() {
	if (buckets.length === 0) return;
	if (!confirm('Are you sure you want to clear all pears?')) return;

	buckets = buckets.filter(b => b.locked);
	updateUI();
}

function toggleBucketOOO(bucketId) {
	const bucket = buckets.find(b => b.id === bucketId);
	if (!bucket) return;
	bucket.ooo = !bucket.ooo;
	saveToStorage();
	renderBuckets();
}

function renderBuckets() {
	bucketsDisplay.innerHTML = '';
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
		if (!draggedEngineer) return;
		buckets.push(createNewBucket(draggedEngineer));
		updateUI();
	});

	bucketsDisplay.appendChild(newZone);

	buckets.forEach((bucket, index) => {
		const bucketDiv = document.createElement('div');
		bucketDiv.className = 'bucket';
		bucketDiv.dataset.bucketId = bucket.id;

		if (bucket.locked) bucketDiv.classList.add('locked');

		// Drag events for bucket
		bucketDiv.addEventListener('dragover', handleBucketDragOver);
		bucketDiv.addEventListener('dragleave', handleBucketDragLeave);
		bucketDiv.addEventListener('drop', handleBucketDrop);

		// Header
		const header = document.createElement('div');
		header.className = 'bucket-header';

		const title = document.createElement('div');
		title.className = 'bucket-title';
		title.textContent = bucket.ooo ? `OOO Pear` : `Pear ${index + 1}`;
		if (bucket.ooo) bucketDiv.classList.add('ooo');

		const actions = document.createElement('div');
		actions.className = 'bucket-actions';

		const lockBtn = document.createElement('button');
		lockBtn.className = 'lock-bucket-btn';
		lockBtn.textContent = bucket.locked ? '🔒' : '🔓';
		lockBtn.title = bucket.locked ? 'Unlock pear' : 'Lock pear';
		lockBtn.onclick = () => toggleBucketLock(bucket.id);
		const oooBtn = document.createElement('button');
		oooBtn.className = 'ooo-bucket-btn';
		oooBtn.textContent = bucket.ooo ? 'OOO' : 'Active';
		oooBtn.title = bucket.ooo ? 'Mark pear active' : 'Mark pear out of office';
		oooBtn.onclick = () => toggleBucketOOO(bucket.id);

		const deleteBtn = document.createElement('button');
		deleteBtn.className = 'delete-bucket-btn';
		deleteBtn.textContent = '×';
		deleteBtn.title = 'Delete pear';
		deleteBtn.onclick = () => deleteBucket(bucket.id);

		actions.appendChild(lockBtn);
		actions.appendChild(oooBtn);
		actions.appendChild(deleteBtn);

		header.appendChild(title);
		header.appendChild(actions);

		// Engineers in bucket
		const engineersDiv = document.createElement('div');
		engineersDiv.className = 'bucket-engineers';

		bucket.engineers.forEach(engId => {
			const engineer = engineers.find(e => e.id === engId);
			if (!engineer) return;

			const engDiv = document.createElement('div');
			engDiv.className = 'bucket-engineer';
			engDiv.draggable = !bucket.locked;
			engDiv.dataset.engineerId = engId;

			if (!bucket.locked) {
				engDiv.addEventListener('dragstart', handleBucketEngineerDragStart);
				engDiv.addEventListener('dragend', () => {
					engDiv.classList.remove('dragging');
					draggedEngineer = null;
				});
			} const nameSpan = document.createElement('span');
			nameSpan.textContent = engineer.name;

			const removeBtn = document.createElement('button');
			removeBtn.className = 'remove-from-bucket';
			removeBtn.textContent = '×';
			removeBtn.onclick = () => removeEngineerFromBucket(bucket.id, engId);

			if (bucket.locked) {
				removeBtn.style.display = 'none';
			}

			engDiv.appendChild(nameSpan);
			engDiv.appendChild(removeBtn);
			engineersDiv.appendChild(engDiv);
		});

		// Count
		const count = document.createElement('div');
		count.className = 'bucket-count';
		const engCount = bucket.engineers.length;
		count.textContent = engCount === 1 ? '1 seed' : `${engCount} seeds`;

		bucketDiv.appendChild(header);
		bucketDiv.appendChild(engineersDiv);
		bucketDiv.appendChild(count);
		bucketsDisplay.appendChild(bucketDiv);
	});

}

function handleBucketEngineerDragStart(e) {
	const engineerId = parseInt(e.target.dataset.engineerId);
	const bucketId = parseInt(e.target.closest('.bucket').dataset.bucketId);
	const bucket = buckets.find(b => b.id === bucketId);

	if (bucket && bucket.locked) {
		e.preventDefault();
		return;
	}

	draggedEngineer = engineerId;
	e.target.classList.add('dragging');
	e.dataTransfer.effectAllowed = 'move';

	// Remove from current bucket
	bucket.engineers = bucket.engineers.filter(id => id !== engineerId);
	saveToStorage();
}

function handleBucketDragOver(e) {
	e.preventDefault();
	const bucketDiv = e.currentTarget;
	const bucketId = parseInt(bucketDiv.dataset.bucketId);
	const bucket = buckets.find(b => b.id === bucketId);

	if (bucket && !bucket.locked) {
		e.dataTransfer.dropEffect = 'move';
		bucketDiv.classList.add('drag-over');
	}
}

function handleBucketDragLeave(e) {
	e.currentTarget.classList.remove('drag-over');
}

function handleBucketDrop(e) {
	e.preventDefault();
	e.stopPropagation(); // Prevent event from bubbling to pear tree
	const bucketDiv = e.currentTarget;
	bucketDiv.classList.remove('drag-over');

	const bucketId = parseInt(bucketDiv.dataset.bucketId);
	const bucket = buckets.find(b => b.id === bucketId);

	if (!bucket || bucket.locked || !draggedEngineer) return;

	// Add seed to pear if not already there (avoid duplicates within same pear)
	if (!bucket.engineers.includes(draggedEngineer)) {
		bucket.engineers.push(draggedEngineer);
		updateUI();
	}
}

// Pear Tree drop zone handlers
function handlePearTreeDragOver(e) {
	// Only handle if not over a specific bucket
	if (e.target.closest('.bucket')) {
		bucketsDisplay.classList.remove('drag-over-empty');
		return;
	}

	e.preventDefault();
	e.dataTransfer.dropEffect = 'move';
	bucketsDisplay.classList.add('drag-over-empty');
}

function handlePearTreeDragLeave(e) {
	// Only remove highlight if leaving the entire pear tree area
	if (e.target === bucketsDisplay) {
		bucketsDisplay.classList.remove('drag-over-empty');
	}
}

function handlePearTreeDrop(e) {
	// Only handle if not over a specific bucket
	if (e.target.closest('.bucket')) {
		return;
	}

	e.preventDefault();
	bucketsDisplay.classList.remove('drag-over-empty');

	if (!draggedEngineer) return;

	buckets.push(createNewBucket(draggedEngineer));
	updateUI();
}

// Initialize on page load
init();
