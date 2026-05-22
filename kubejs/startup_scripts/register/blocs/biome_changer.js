StartupEvents.registry('block', event => {
    event.create('biome_changer')
        .displayName('Biome Changer')
        .resistance(200)
        .requiresTool()
        .tagBlock('minecraft:mineable/pickaxe')
        .tagBlock('minecraft:needs_iron_tool')
        .notSolid()
        .renderType('cutout')
        .blockstateJson({
            "variants": {
                "": {
                    "model": "minecraft:block/cauldron"
                }
            }
        })
        .itemModelJson({
            "parent": "minecraft:item/cauldron"
        });
});