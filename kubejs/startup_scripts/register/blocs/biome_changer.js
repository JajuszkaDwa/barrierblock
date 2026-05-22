StartupEvents.registry('block', event => {
    event.create('biome_changer')
        .displayName('Biome Changer')
        .resistance(200)
        .requiresTool()
        .tagBlock('minecraft:mineable/pickaxe')
        .tagBlock('minecraft:needs_iron_tool')
        .model('minecraft:block/cauldron')
        .notSolid()
        .renderType('cutout')
        .defaultCutout()
});