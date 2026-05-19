// 1. GENEROWANIE BARIER WOKÓŁ CHUNKA STARTOWEGO (Uruchamia się przy starcie serwera)
ServerEvents.loaded(event => {
    const level = event.server.getLevel('minecraft:overworld');

    const chunkStartX = 0; 
    const chunkStartZ = 0;

    const minY = -64;
    const maxY = 319;

    for (let x = 0; x < 16; x++) {
        for (let z = 0; z < 16; z++) {
            if (x === 0 || x === 15 || z === 0 || z === 15) {
                for (let y = minY; y <= maxY; y++) {
                    let block = level.getBlock(chunkStartX + x, y, chunkStartZ + z);
                    
                    if (block.id !== 'kubejs:custom_barrier') {
                        block.set('kubejs:custom_barrier');
                    }
                }
            }
        }
    }
    console.log("[KubeJS] Ściana barier dla pierwszego chunka została wygenerowana!");
});

PlayerEvents.loggedIn(event => {
    const { player, server } = event;
    const level = server.getLevel('minecraft:overworld');

    if (!player.persistentData.getBool('hasJoinedBefore')) {
        player.persistentData.setBool('hasJoinedBefore', true);

        let topY = level.getHeight('motion_blocking', 0, 0);

        if (topY < level.getMinBuildHeight()) {
            topY = 70; 
        }

        player.teleportTo('minecraft:overworld', 0.5, topY + 1, 0.5, 0, 0);
        
        player.tell("§aWitaj na serwerze! Zostałeś przeniesiony na bezpieczny spawn.");
    }
});