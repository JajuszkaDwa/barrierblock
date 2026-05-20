PlayerEvents.loggedIn(event => {
    const { player, server } = event;
    const level = server.getLevel('minecraft:overworld');

    if (!player.persistentData.getBool('hasJoinedBefore')) {
        player.persistentData.setBool('hasJoinedBefore', true);

        server.scheduleInTicks(20, () => {
            let topY = level.getHeight('motion_blocking', 8, 8);

            if (topY < level.getMinBuildHeight()) {
                topY = 70; 
            }

            player.teleportTo('minecraft:overworld', 8.5, topY + 1, 8.5, 0, 0);
        });
    }
});