//priority: 0
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

	redrawAllBorders(server, getUnlockedSet(server));
});

PlayerEvents.loggedIn(event => {
	let server = event.server;
	server.scheduleInTicks(1, () => {
		redrawAllBorders(server, getUnlockedSet(server));
	});
});

PlayerEvents.tick(event => {
	let player = event.player;

	if (player.level != player.server.getLevel('minecraft:overworld')) return;
	if (!player.isAlive()) return;
	if (player.tickCount % 5 !== 0) return;
	if (player.isCreative() || player.isSpectator()) return;

	let server = player.server;
	let unlockedSet = getUnlockedSet(server);
	let px = player.x;
	let pz = player.z;

	if (isOutsideBorder(px, pz, unlockedSet)) {
		if (player.isPassenger()) player.stopRiding();

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
	let server = event.server;

	if (block.id === BARRIER_ID) {
		event.cancel();
		return;
	}

	let unlockedSet = getUnlockedSet(server);
	if (!isBorderBlock(block.x, block.z, unlockedSet)) return;

	if (event.player) {
		event.cancel();
	} else {
		let bx = block.x, bz = block.z;
		server.scheduleInTicks(1, () => refillBorderColumn(server, bx, bz));
	}
});

ServerEvents.tick(event => {
	let server = event.server;
	if (server.players.size === 0) return;
	if (server.tickCount % 100 !== 0) return;
	redrawAllBorders(server, getUnlockedSet(server));
});

ItemEvents.rightClicked('kubejs:chunk_key', event => {
	let player = event.player;
	let server = event.server;

	let rayTrace = player.rayTrace(5);
	if (!rayTrace || !rayTrace.block) return;

	let hitBlock = rayTrace.block;
	if (hitBlock.id !== BARRIER_ID) return;

	let unlockedSet = getUnlockedSet(server);
	let target = getChunkBehindBarrier(hitBlock.x, hitBlock.z, unlockedSet);
	if (!target) {
		console.info(`[BarrierBlock] Could not determine target chunk for barrier at ${hitBlock.x}, ${hitBlock.z}.`);
		return;
	}

	let { cx: newCX, cz: newCZ } = target;
	let newKey = chunkKey(newCX, newCZ);

	if (unlockedSet.has(newKey)) {
		console.info(`[BarrierBlock] Chunk ${newKey} is already unlocked.`);
		return;
	}

	for (let seg of findSharedWallSegments(newCX, newCZ, unlockedSet)) {
		removeWallSegment(server, seg.x1, seg.z1, seg.x2, seg.z2);
	}

	unlockedSet.add(newKey);
	saveUnlockedSet(server, unlockedSet);

	for (let seg of getNewExposedSegments(newCX, newCZ, unlockedSet)) {
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
