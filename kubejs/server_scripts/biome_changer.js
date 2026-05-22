BlockEvents.rightClicked('kubejs:biome_changer', event => {
    const { hand, item, player, block, server } = event;
    
    if (hand !== 'MAIN_HAND') return;
    
    let targetBiomes = {
        'kubejs:nether_essence': { biome: 'minecraft:nether_wastes', block: 'minecraft:netherrack', particle: 'minecraft:flame', sound: 'minecraft:entity.glowing_squid.ambient' },
    };
    
    let config = targetBiomes[item.id];
    if (!config) return;
    
    event.cancel();
    item.count--;
    
    let chunkX = block.x >> 4;
    let chunkZ = block.z >> 4;
    let minX = chunkX * 16;
    let maxX = minX + 15;
    let minZ = chunkZ * 16;
    let maxZ = minZ + 15;
    
    console.info(`Changing biome of chunk [${chunkX}, ${chunkZ}] to ${config.biome}`);
    
    server.runCommandSilent(`fillbiome ${minX} -64 ${minZ} ${maxX} 319 ${maxZ} ${config.biome}`);
    
    server.runCommandSilent(`fill ${minX} -64 ${minZ} ${maxX} ${block.y - 1} ${maxZ} ${config.block} replace minecraft:air`);
    server.runCommandSilent(`fill ${minX} -64 ${minZ} ${maxX} ${block.y - 1} ${maxZ} ${config.block} replace minecraft:cave_air`);
    
    let level = server.getLevel('minecraft:overworld');
    for (let i = 0; i < 10; i++) {
        server.scheduleInTicks(i * 2, () => {
            player.playSound(config.sound, 1.0, 1.0);
            for (let px = minX; px <= maxX; px += 3) {
                for (let pz = minZ; pz <= maxZ; pz += 3) {
                    level.spawnParticles(config.particle, false, px + 0.5, block.y + 0.5, pz + 0.5, 0, 0, 0.1, 0, 1);
                }
            }
        });
    }
});