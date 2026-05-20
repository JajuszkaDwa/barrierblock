//priority: 10
const DB_KEY = 'unlocked_chunks';
const BARRIER_ID = 'kubejs:custom_barrier';
const Y_MIN = -64;
const Y_MAX = 319;

const REPLACEABLE_BLOCKS = [
	'#minecraft:replaceable',
	'#minecraft:slabs',
	'#minecraft:trapdoors',
	'#minecraft:fence_gates',
	'minecraft:iron_bars',
	'#minecraft:glass_panes',
	'minecraft:cobweb',
	'minecraft:scaffolding',
];

const getUnlockedSet = (server) => {
	let db = server.persistentData;
	if (!db.contains(DB_KEY)) {
		db.putString(DB_KEY, JSON.stringify(['0,0']));
	}
	return new Set(JSON.parse(db.getString(DB_KEY)));
};

const saveUnlockedSet = (server, set) => {
	server.persistentData.putString(DB_KEY, JSON.stringify(Array.from(set)));
};

const chunkKey = (cx, cz) => `${cx},${cz}`;

const blockToChunk = (blockCoord) => Math.floor(blockCoord / 16);

const computeBorderSegments = (unlockedSet) => {
	let segments = [];
	for (let key of unlockedSet) {
		let [cx, cz] = key.split(',').map(Number);
		let ox = cx * 16;
		let oz = cz * 16;
		if (!unlockedSet.has(chunkKey(cx, cz - 1))) segments.push({ x1: ox, z1: oz - 1, x2: ox + 15, z2: oz - 1 });
		if (!unlockedSet.has(chunkKey(cx, cz + 1))) segments.push({ x1: ox, z1: oz + 16, x2: ox + 15, z2: oz + 16 });
		if (!unlockedSet.has(chunkKey(cx - 1, cz))) segments.push({ x1: ox - 1, z1: oz, x2: ox - 1, z2: oz + 15 });
		if (!unlockedSet.has(chunkKey(cx + 1, cz))) segments.push({ x1: ox + 16, z1: oz, x2: ox + 16, z2: oz + 15 });
	}
	return segments;
};

const isBorderBlock = (bx, bz, unlockedSet) => {
	for (let key of unlockedSet) {
		let [cx, cz] = key.split(',').map(Number);
		let ox = cx * 16;
		let oz = cz * 16;
		if (bx === ox + 16 && bz >= oz && bz <= oz + 15 && !unlockedSet.has(chunkKey(cx + 1, cz))) return true;
		if (bx === ox - 1 && bz >= oz && bz <= oz + 15 && !unlockedSet.has(chunkKey(cx - 1, cz))) return true;
		if (bz === oz + 16 && bx >= ox && bx <= ox + 15 && !unlockedSet.has(chunkKey(cx, cz + 1))) return true;
		if (bz === oz - 1 && bx >= ox && bx <= ox + 15 && !unlockedSet.has(chunkKey(cx, cz - 1))) return true;
	}
	return false;
};

const isOutsideBorder = (px, pz, unlockedSet) => {
	let cx = blockToChunk(Math.floor(px));
	let cz = blockToChunk(Math.floor(pz));
	return !unlockedSet.has(chunkKey(cx, cz));
};

const findNearestUnlockedCenter = (px, pz, unlockedSet) => {
	let bestDist = Infinity;
	let bestX = 8;
	let bestZ = 8;
	for (let key of unlockedSet) {
		let [cx, cz] = key.split(',').map(Number);
		let centerX = cx * 16 + 8;
		let centerZ = cz * 16 + 8;
		let dist = (centerX - px) ** 2 + (centerZ - pz) ** 2;
		if (dist < bestDist) {
			bestDist = dist;
			bestX = centerX;
			bestZ = centerZ;
		}
	}
	return { x: bestX, z: bestZ };
};

const placeWallSegment = (server, x1, z1, x2, z2) => {
	for (let block of REPLACEABLE_BLOCKS) {
		server.runCommandSilent(`fill ${x1} ${Y_MIN} ${z1} ${x2} ${Y_MAX} ${z2} ${BARRIER_ID} replace ${block}`);
	}
};

const removeWallSegment = (server, x1, z1, x2, z2) => {
	server.runCommandSilent(`fill ${x1} ${Y_MIN} ${z1} ${x2} ${Y_MAX} ${z2} minecraft:air replace ${BARRIER_ID}`);
};

const redrawAllBorders = (server, unlockedSet) => {
	let segments = computeBorderSegments(unlockedSet);
	for (let seg of segments) {
		placeWallSegment(server, seg.x1, seg.z1, seg.x2, seg.z2);
	}
	console.info(`[BarrierBlock] Redrawn ${segments.length} segments for ${unlockedSet.size} chunk(s).`);
};

const refillBorderColumn = (server, bx, bz) => {
	for (let block of REPLACEABLE_BLOCKS) {
		server.runCommandSilent(`fill ${bx} ${Y_MIN} ${bz} ${bx} ${Y_MAX} ${bz} ${BARRIER_ID} replace ${block}`);
	}
};

const getChunkBehindBarrier = (bx, bz, unlockedSet) => {
	for (let key of unlockedSet) {
		let [cx, cz] = key.split(',').map(Number);
		let ox = cx * 16;
		let oz = cz * 16;
		if (bx === ox + 16 && bz >= oz && bz <= oz + 15 && !unlockedSet.has(chunkKey(cx + 1, cz))) return { cx: cx + 1, cz };
		if (bx === ox - 1 && bz >= oz && bz <= oz + 15 && !unlockedSet.has(chunkKey(cx - 1, cz))) return { cx: cx - 1, cz };
		if (bz === oz + 16 && bx >= ox && bx <= ox + 15 && !unlockedSet.has(chunkKey(cx, cz + 1))) return { cx, cz: cz + 1 };
		if (bz === oz - 1 && bx >= ox && bx <= ox + 15 && !unlockedSet.has(chunkKey(cx, cz - 1))) return { cx, cz: cz - 1 };
	}
	return null;
};

const findSharedWallSegments = (newCX, newCZ, unlockedSet) => {
	let ox = newCX * 16;
	let oz = newCZ * 16;
	return [
		{ dcx: 0, dcz: -1, x1: ox, z1: oz, x2: ox + 15, z2: oz },
		{ dcx: 0, dcz: 1, x1: ox, z1: oz + 15, x2: ox + 15, z2: oz + 15 },
		{ dcx: -1, dcz: 0, x1: ox, z1: oz, x2: ox, z2: oz + 15 },
		{ dcx: 1, dcz: 0, x1: ox + 15, z1: oz, x2: ox + 15, z2: oz + 15 },
	].filter(d => unlockedSet.has(chunkKey(newCX + d.dcx, newCZ + d.dcz)));
};

const getNewExposedSegments = (newCX, newCZ, updatedSet) => {
	let ox = newCX * 16;
	let oz = newCZ * 16;
	return [
		{ dcx: 0, dcz: -1, x1: ox, z1: oz - 1, x2: ox + 15, z2: oz - 1 },
		{ dcx: 0, dcz: 1, x1: ox, z1: oz + 16, x2: ox + 15, z2: oz + 16 },
		{ dcx: -1, dcz: 0, x1: ox - 1, z1: oz, x2: ox - 1, z2: oz + 15 },
		{ dcx: 1, dcz: 0, x1: ox + 16, z1: oz, x2: ox + 16, z2: oz + 15 },
	].filter(d => !updatedSet.has(chunkKey(newCX + d.dcx, newCZ + d.dcz)));
};