
const DB_KEY = 'unlocked_chunks';
const BARRIER_ID = 'kubejs:custom_barrier';
const Y_MIN = -64;
const Y_MAX = 319;

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
		let parts = key.split(',');
		let cx = parseInt(parts[0]);
		let cz = parseInt(parts[1]);
		let ox = cx * 16;
		let oz = cz * 16;

		if (!unlockedSet.has(chunkKey(cx, cz - 1))) {
			segments.push({ x1: ox, z1: oz - 1, x2: ox + 15, z2: oz - 1 });
		}
		if (!unlockedSet.has(chunkKey(cx, cz + 1))) {
			segments.push({ x1: ox, z1: oz + 16, x2: ox + 15, z2: oz + 16 });
		}
		if (!unlockedSet.has(chunkKey(cx - 1, cz))) {
			segments.push({ x1: ox - 1, z1: oz, x2: ox - 1, z2: oz + 15 });
		}
		if (!unlockedSet.has(chunkKey(cx + 1, cz))) {
			segments.push({ x1: ox + 16, z1: oz, x2: ox + 16, z2: oz + 15 });
		}
	}
	return segments;
};

const isBorderBlock = (bx, bz, unlockedSet) => {
	for (let key of unlockedSet) {
		let parts = key.split(',');
		let cx = parseInt(parts[0]);
		let cz = parseInt(parts[1]);
		let ox = cx * 16;
		let oz = cz * 16;
		if (bx === ox + 16 && bz >= oz && bz <= oz + 15 && !unlockedSet.has(chunkKey(cx + 1, cz))) return true;
		if (bx === ox - 1 && bz >= oz && bz <= oz + 15 && !unlockedSet.has(chunkKey(cx - 1, cz))) return true;
		if (bz === oz + 16 && bx >= ox && bx <= ox + 15 && !unlockedSet.has(chunkKey(cx, cz + 1))) return true;
		if (bz === oz - 1 && bx >= ox && bx <= ox + 15 && !unlockedSet.has(chunkKey(cx, cz - 1))) return true;
	}
	return false;
};

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

const getChunkBehindBarrier = (barrierX, barrierZ, unlockedSet) => {
	let bx = barrierX;
	let bz = barrierZ;

	for (let key of unlockedSet) {
		let parts = key.split(',');
		let cx = parseInt(parts[0]);
		let cz = parseInt(parts[1]);
		let ox = cx * 16;
		let oz = cz * 16;

		if (bx === ox + 16 && bz >= oz && bz <= oz + 15 && !unlockedSet.has(chunkKey(cx + 1, cz))) {
			return { cx: cx + 1, cz: cz };
		}
		if (bx === ox - 1 && bz >= oz && bz <= oz + 15 && !unlockedSet.has(chunkKey(cx - 1, cz))) {
			return { cx: cx - 1, cz: cz };
		}
		if (bz === oz + 16 && bx >= ox && bx <= ox + 15 && !unlockedSet.has(chunkKey(cx, cz + 1))) {
			return { cx: cx, cz: cz + 1 };
		}
		if (bz === oz - 1 && bx >= ox && bx <= ox + 15 && !unlockedSet.has(chunkKey(cx, cz - 1))) {
			return { cx: cx, cz: cz - 1 };
		}
	}

	return null;
};

const findSharedWallSegments = (newCX, newCZ, unlockedSet) => {
	let shared = [];
	let ox = newCX * 16;
	let oz = newCZ * 16;

	let adjacentDir = [
		{ dcx: 0, dcz: -1, wallX1: ox, wallX2: ox + 15, wallZ1: oz, wallZ2: oz },
		{ dcx: 0, dcz: 1, wallX1: ox, wallX2: ox + 15, wallZ1: oz + 15, wallZ2: oz + 15 },
		{ dcx: -1, dcz: 0, wallX1: ox, wallX2: ox, wallZ1: oz, wallZ2: oz + 15 },
		{ dcx: 1, dcz: 0, wallX1: ox + 15, wallX2: ox + 15, wallZ1: oz, wallZ2: oz + 15 },
	];

	for (let d of adjacentDir) {
		let neighborKey = chunkKey(newCX + d.dcx, newCZ + d.dcz);
		if (unlockedSet.has(neighborKey)) {
			shared.push({ x1: d.wallX1, z1: d.wallZ1, x2: d.wallX2, z2: d.wallZ2 });
		}
	}
	return shared;
};

const getNewExposedSegments = (newCX, newCZ, updatedSet) => {
	let ox = newCX * 16;
	let oz = newCZ * 16;
	let newSegments = [];

	let adjacentDir = [
		{ dcx: 0, dcz: -1, wallX1: ox, wallX2: ox + 15, wallZ1: oz - 1, wallZ2: oz - 1 },
		{ dcx: 0, dcz: 1, wallX1: ox, wallX2: ox + 15, wallZ1: oz + 16, wallZ2: oz + 16 },
		{ dcx: -1, dcz: 0, wallX1: ox - 1, wallX2: ox - 1, wallZ1: oz, wallZ2: oz + 15 },
		{ dcx: 1, dcz: 0, wallX1: ox + 16, wallX2: ox + 16, wallZ1: oz, wallZ2: oz + 15 },
	];

	for (let d of adjacentDir) {
		let neighborKey = chunkKey(newCX + d.dcx, newCZ + d.dcz);
		if (!updatedSet.has(neighborKey)) {
			newSegments.push({ x1: d.wallX1, z1: d.wallZ1, x2: d.wallX2, z2: d.wallZ2 });
		}
	}
	return newSegments;
};

const findNearestUnlockedCenter = (px, pz, unlockedSet) => {
	let bestDist = Infinity;
	let bestX = 8;
	let bestZ = 8;
	for (let key of unlockedSet) {
		let parts = key.split(',');
		let cx = parseInt(parts[0]);
		let cz = parseInt(parts[1]);
		let centerX = cx * 16 + 8;
		let centerZ = cz * 16 + 8;
		let dist = (centerX - px) * (centerX - px) + (centerZ - pz) * (centerZ - pz);
		if (dist < bestDist) {
			bestDist = dist;
			bestX = centerX;
			bestZ = centerZ;
		}
	}
	return { x: bestX, z: bestZ };
};

const isOutsideBorder = (px, pz, unlockedSet) => {
	let cx = blockToChunk(Math.floor(px));
	let cz = blockToChunk(Math.floor(pz));
	return !unlockedSet.has(chunkKey(cx, cz));
};

ServerEvents.loaded(event => {
	let server = event.server;
	let level = server.getLevel('minecraft:overworld');
	let db = server.persistentData;

	server.runCommandSilent('gamerule spawnRadius 0');

	if (!db.contains(DB_KEY)) {
		db.putString(DB_KEY, JSON.stringify(['0,0']));
		console.info('[BarrierBlock] Initialized chunk database with [0,0].');
		let topY = level.getHeight('motion_blocking', 8, 8);
		let spawnY = (topY > level.getMinBuildHeight()) ? topY + 1 : 64;
		server.runCommandSilent(`setworldspawn 8 ${spawnY} 8`);
		console.info(`[BarrierBlock] World spawn set to 8 ${spawnY} 8.`);
	}

	let unlockedSet = getUnlockedSet(server);
	console.info(`[BarrierBlock] ServerEvents.loaded: calling redrawAllBorders, unlockedSet=${JSON.stringify(Array.from(unlockedSet))}`);
	redrawAllBorders(server, unlockedSet);
	console.info('[BarrierBlock] ServerEvents.loaded: finished');
});

PlayerEvents.loggedIn(event => {
	let server = event.server;
	server.scheduleInTicks(1, () => {
		let unlockedSet = getUnlockedSet(server);
		redrawAllBorders(server, unlockedSet);
	});
});

PlayerEvents.tick(event => {
	let player = event.player;

	if (player.level != player.server.getLevel('minecraft:overworld')) return;
	if (!player.isAlive()) return;
	if (player.tickCount % 10 !== 0) return;
	if (player.isCreative() || player.isSpectator()) return;

	let server = player.server;
	let unlockedSet = getUnlockedSet(server);

	let px = player.x;
	let pz = player.z;

	if (isOutsideBorder(px, pz, unlockedSet)) {
		let safe = findNearestUnlockedCenter(px, pz, unlockedSet);
		let level = player.level;
		let safeY = level.getHeight('motion_blocking', safe.x, safe.z);
		if (safeY <= level.getMinBuildHeight()) safeY = 64;

		player.teleportTo('minecraft:overworld', safe.x + 0.5, safeY, safe.z + 0.5, player.yaw, player.pitch);
		console.info(`[BarrierBlock] Teleported ${player.name} back from (${px.toFixed(1)}, ${pz.toFixed(1)}) to (${safe.x}, ${safeY}, ${safe.z})`);
	}
});

BlockEvents.broken(event => {
	let block = event.block;
	if (block.id === BARRIER_ID) {
		event.cancel();
		return;
	}
	let unlockedSet = getUnlockedSet(event.server);
	if (isBorderBlock(block.x, block.z, unlockedSet)) {
		event.cancel();
	}
});

ItemEvents.rightClicked('kubejs:chunk_key', event => {
	let player = event.player;
	let server = event.server;

	let rayTrace = player.rayTrace(5);
	if (!rayTrace || !rayTrace.block) return;

	let hitBlock = rayTrace.block;
	if (hitBlock.id !== BARRIER_ID) return;

	let bx = hitBlock.x;
	let bz = hitBlock.z;

	let unlockedSet = getUnlockedSet(server);

	let target = getChunkBehindBarrier(bx, bz, unlockedSet);
	if (!target) {
		console.info(`[BarrierBlock] Could not determine target chunk for barrier at ${bx}, ${bz}.`);
		return;
	}

	let { cx: newCX, cz: newCZ } = target;
	let newKey = chunkKey(newCX, newCZ);

	if (unlockedSet.has(newKey)) {
		console.info(`[BarrierBlock] Chunk ${newKey} is already unlocked.`);
		return;
	}

	let sharedWalls = findSharedWallSegments(newCX, newCZ, unlockedSet);
	for (let seg of sharedWalls) {
		removeWallSegment(server, seg.x1, seg.z1, seg.x2, seg.z2);
	}

	unlockedSet.add(newKey);
	saveUnlockedSet(server, unlockedSet);

	let newSegments = getNewExposedSegments(newCX, newCZ, unlockedSet);
	for (let seg of newSegments) {
		placeWallSegment(server, seg.x1, seg.z1, seg.x2, seg.z2);
	}

	event.item.count--;

	player.runCommandSilent('playsound minecraft:entity.item.break master @s ~ ~ ~ 1 1');
	player.runCommandSilent('playsound minecraft:entity.player.levelup master @s ~ ~ ~ 0.5 1.2');

	player.runCommandSilent('particle minecraft:totem_of_undying ~ ~1 ~ 0.5 0.5 0.5 0.1 50');
	player.runCommandSilent('particle minecraft:happy_villager ~ ~1 ~ 0.5 0.5 0.5 0.1 20');

	server.runCommandSilent('title @a title {"text":"New chunk unlocked!","color":"gold","bold":true}');

	console.info(`[BarrierBlock] Player ${player.name} unlocked chunk [${newCX}, ${newCZ}]. Total unlocked: ${unlockedSet.size}.`);
});