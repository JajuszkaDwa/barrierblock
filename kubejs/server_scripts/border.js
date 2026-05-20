//priority: 10
var DB_KEY = 'unlocked_chunks';
var BARRIER_ID = 'kubejs:custom_barrier';
var Y_MIN = -64;
var Y_MAX = 319;

var REPLACEABLE_BLOCKS = [
	'#minecraft:replaceable',
	'#minecraft:slabs',
	'#minecraft:trapdoors',
	'#minecraft:fence_gates',
	'minecraft:iron_bars',
	'#minecraft:glass_panes',
	'minecraft:cobweb',
	'minecraft:scaffolding',
];

var getUnlockedSet = function(server) {
	var db = server.persistentData;
	if (!db.contains(DB_KEY)) {
		db.putString(DB_KEY, JSON.stringify(['0,0']));
	}
	return new Set(JSON.parse(db.getString(DB_KEY)));
};

var saveUnlockedSet = function(server, set) {
	server.persistentData.putString(DB_KEY, JSON.stringify(Array.from(set)));
};

var chunkKey = function(cx, cz) { return cx + ',' + cz; };

var blockToChunk = function(blockCoord) { return Math.floor(blockCoord / 16); };

var computeBorderSegments = function(unlockedSet) {
	var segments = [];
	for (var key of unlockedSet) {
		var parts = key.split(',');
		var cx = parseInt(parts[0]);
		var cz = parseInt(parts[1]);
		var ox = cx * 16;
		var oz = cz * 16;
		if (!unlockedSet.has(chunkKey(cx, cz - 1))) segments.push({ x1: ox,      z1: oz - 1,  x2: ox + 15, z2: oz - 1  });
		if (!unlockedSet.has(chunkKey(cx, cz + 1))) segments.push({ x1: ox,      z1: oz + 16, x2: ox + 15, z2: oz + 16 });
		if (!unlockedSet.has(chunkKey(cx - 1, cz))) segments.push({ x1: ox - 1,  z1: oz,      x2: ox - 1,  z2: oz + 15 });
		if (!unlockedSet.has(chunkKey(cx + 1, cz))) segments.push({ x1: ox + 16, z1: oz,      x2: ox + 16, z2: oz + 15 });
	}
	return segments;
};

var isBorderBlock = function(bx, bz, unlockedSet) {
	for (var key of unlockedSet) {
		var parts = key.split(',');
		var cx = parseInt(parts[0]);
		var cz = parseInt(parts[1]);
		var ox = cx * 16;
		var oz = cz * 16;
		if (bx === ox + 16 && bz >= oz && bz <= oz + 15 && !unlockedSet.has(chunkKey(cx + 1, cz))) return true;
		if (bx === ox - 1 && bz >= oz && bz <= oz + 15 && !unlockedSet.has(chunkKey(cx - 1, cz))) return true;
		if (bz === oz + 16 && bx >= ox && bx <= ox + 15 && !unlockedSet.has(chunkKey(cx, cz + 1))) return true;
		if (bz === oz - 1 && bx >= ox && bx <= ox + 15 && !unlockedSet.has(chunkKey(cx, cz - 1))) return true;
	}
	return false;
};

var isOutsideBorder = function(px, pz, unlockedSet) {
	var cx = blockToChunk(Math.floor(px));
	var cz = blockToChunk(Math.floor(pz));
	return !unlockedSet.has(chunkKey(cx, cz));
};

var findNearestUnlockedCenter = function(px, pz, unlockedSet) {
	var bestDist = Infinity;
	var bestX = 8;
	var bestZ = 8;
	for (var key of unlockedSet) {
		var parts = key.split(',');
		var cx = parseInt(parts[0]);
		var cz = parseInt(parts[1]);
		var centerX = cx * 16 + 8;
		var centerZ = cz * 16 + 8;
		var dist = (centerX - px) * (centerX - px) + (centerZ - pz) * (centerZ - pz);
		if (dist < bestDist) {
			bestDist = dist;
			bestX = centerX;
			bestZ = centerZ;
		}
	}
	return { x: bestX, z: bestZ };
};

var placeWallSegment = function(server, x1, z1, x2, z2) {
	for (var block of REPLACEABLE_BLOCKS) {
		server.runCommandSilent('fill ' + x1 + ' ' + Y_MIN + ' ' + z1 + ' ' + x2 + ' ' + Y_MAX + ' ' + z2 + ' ' + BARRIER_ID + ' replace ' + block);
	}
};

var removeWallSegment = function(server, x1, z1, x2, z2) {
	server.runCommandSilent('fill ' + x1 + ' ' + Y_MIN + ' ' + z1 + ' ' + x2 + ' ' + Y_MAX + ' ' + z2 + ' minecraft:air replace ' + BARRIER_ID);
};

var redrawAllBorders = function(server, unlockedSet) {
	var segments = computeBorderSegments(unlockedSet);
	for (var seg of segments) {
		placeWallSegment(server, seg.x1, seg.z1, seg.x2, seg.z2);
	}
	console.info('[BarrierBlock] Redrawn ' + segments.length + ' segments for ' + unlockedSet.size + ' chunk(s).');
};

var refillBorderColumn = function(server, bx, bz) {
	for (var block of REPLACEABLE_BLOCKS) {
		server.runCommandSilent('fill ' + bx + ' ' + Y_MIN + ' ' + bz + ' ' + bx + ' ' + Y_MAX + ' ' + bz + ' ' + BARRIER_ID + ' replace ' + block);
	}
};

var getChunkBehindBarrier = function(bx, bz, unlockedSet) {
	for (var key of unlockedSet) {
		var parts = key.split(',');
		var cx = parseInt(parts[0]);
		var cz = parseInt(parts[1]);
		var ox = cx * 16;
		var oz = cz * 16;
		if (bx === ox + 16 && bz >= oz && bz <= oz + 15 && !unlockedSet.has(chunkKey(cx + 1, cz))) return { cx: cx + 1, cz: cz };
		if (bx === ox - 1 && bz >= oz && bz <= oz + 15 && !unlockedSet.has(chunkKey(cx - 1, cz))) return { cx: cx - 1, cz: cz };
		if (bz === oz + 16 && bx >= ox && bx <= ox + 15 && !unlockedSet.has(chunkKey(cx, cz + 1))) return { cx: cx, cz: cz + 1 };
		if (bz === oz - 1 && bx >= ox && bx <= ox + 15 && !unlockedSet.has(chunkKey(cx, cz - 1))) return { cx: cx, cz: cz - 1 };
	}
	return null;
};

var findSharedWallSegments = function(newCX, newCZ, unlockedSet) {
	var ox = newCX * 16;
	var oz = newCZ * 16;
	var dirs = [
		{ dcx: 0, dcz: -1, x1: ox,      z1: oz,      x2: ox + 15, z2: oz      },
		{ dcx: 0, dcz:  1, x1: ox,      z1: oz + 15, x2: ox + 15, z2: oz + 15 },
		{ dcx:-1, dcz:  0, x1: ox,      z1: oz,      x2: ox,      z2: oz + 15 },
		{ dcx: 1, dcz:  0, x1: ox + 15, z1: oz,      x2: ox + 15, z2: oz + 15 },
	];
	var result = [];
	for (var d of dirs) {
		if (unlockedSet.has(chunkKey(newCX + d.dcx, newCZ + d.dcz))) {
			result.push({ x1: d.x1, z1: d.z1, x2: d.x2, z2: d.z2 });
		}
	}
	return result;
};

var getNewExposedSegments = function(newCX, newCZ, updatedSet) {
	var ox = newCX * 16;
	var oz = newCZ * 16;
	var dirs = [
		{ dcx: 0, dcz: -1, x1: ox,      z1: oz - 1,  x2: ox + 15, z2: oz - 1  },
		{ dcx: 0, dcz:  1, x1: ox,      z1: oz + 16, x2: ox + 15, z2: oz + 16 },
		{ dcx:-1, dcz:  0, x1: ox - 1,  z1: oz,      x2: ox - 1,  z2: oz + 15 },
		{ dcx: 1, dcz:  0, x1: ox + 16, z1: oz,      x2: ox + 16, z2: oz + 15 },
	];
	var result = [];
	for (var d of dirs) {
		if (!updatedSet.has(chunkKey(newCX + d.dcx, newCZ + d.dcz))) {
			result.push({ x1: d.x1, z1: d.z1, x2: d.x2, z2: d.z2 });
		}
	}
	return result;
};