BlockEvents.rightClicked('kubejs:biome_changer', event => {
    const { hand, item, player, block, server, level } = event;
    if (hand !== 'MAIN_HAND') return;
    
    let targetBiomes = {
        'kubejs:nether_essence': { biome: 'minecraft:nether_wastes', block: 'minecraft:netherrack', particle: 'minecraft:flame', sound: 'minecraft:entity.glowing_squid.ambient' }
    };
    
    let config = targetBiomes[item.id];
    
    if (!config) {
        player.tell(`§cTo nie jest odpowiednia esencja! (Trzymasz: ${item.id})`);
        return;
    }
    
    event.cancel();
    player.tell("§a[KROK 1] Rozpoznano esencję!");
    
    try {
        item.shrink(1);
        player.tell("§a[KROK 2] Zabrano esencję z ręki!");
        
        let chunkX = block.x >> 4;
        let chunkZ = block.z >> 4;
        let minX = chunkX * 16;
        let maxX = minX + 15;
        let minZ = chunkZ * 16;
        let maxZ = minZ + 15;
        
        player.tell(`§a[KROK 3] Kordy chunka: X:${minX} do Z:${maxZ}`);
        
        server.runCommandSilent(`fillbiome ${minX} -64 ${minZ} ${maxX} 319 ${maxZ} ${config.biome}`);
        player.tell("§a[KROK 4] Komenda biomu wykonana!");
        
        server.runCommandSilent(`fill ${minX} -64 ${minZ} ${maxX} ${block.y - 1} ${maxZ} ${config.block} replace minecraft:air`);
        player.tell("§a[KROK 5] Komenda fill wykonana!");
        
        player.playSound(config.sound, 1.0, 1.0);
        player.tell("§a[KROK 6] Dźwięk odtworzony. KONIEC!");
        
    } catch (err) {
        player.tell(`§c[BŁĄD KRYTYCZNY]: ${err}`);
        console.error(err);
    }
});