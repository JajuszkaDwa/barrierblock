BlockEvents.rightClicked('kubejs:biome_changer', event => {
    if (event.hand !== 'MAIN_HAND') return;
    
    let targetBiomes = {
        'kubejs:nether_essence': { 
            biome: 'minecraft:nether_wastes', 
            ground: 'minecraft:netherrack', 
            fluid: 'minecraft:lava', 
            particle: 'minecraft:flame', 
            sound: 'minecraft:block.netherrack.place',
            ores: {
                'minecraft:ancient_debris': ['minecraft:diamond_ore', 'minecraft:deepslate_diamond_ore'],
                'minecraft:nether_quartz_ore': ['minecraft:coal_ore', 'minecraft:deepslate_coal_ore', 'minecraft:redstone_ore', 'minecraft:deepslate_redstone_ore'],
                'minecraft:glowstone': ['minecraft:iron_ore', 'minecraft:deepslate_iron_ore', 'minecraft:gold_ore', 'minecraft:deepslate_gold_ore', 'minecraft:copper_ore', 'minecraft:deepslate_copper_ore', 'minecraft:emerald_ore', 'minecraft:deepslate_emerald_ore', 'minecraft:lapis_ore', 'minecraft:deepslate_lapis_ore']
            }
        },
        'minecraft:gunpowder': { 
            biome: 'minecraft:nether_wastes', 
            ground: 'minecraft:netherrack', 
            fluid: 'minecraft:lava', 
            particle: 'minecraft:flame', 
            sound: 'minecraft:block.netherrack.place',
            ores: {
                'minecraft:ancient_debris': ['minecraft:diamond_ore', 'minecraft:deepslate_diamond_ore'],
                'minecraft:nether_quartz_ore': ['minecraft:coal_ore', 'minecraft:deepslate_coal_ore', 'minecraft:redstone_ore', 'minecraft:deepslate_redstone_ore'],
                'minecraft:glowstone': ['minecraft:iron_ore', 'minecraft:deepslate_iron_ore', 'minecraft:gold_ore', 'minecraft:deepslate_gold_ore', 'minecraft:copper_ore', 'minecraft:deepslate_copper_ore', 'minecraft:emerald_ore', 'minecraft:deepslate_emerald_ore', 'minecraft:lapis_ore', 'minecraft:deepslate_lapis_ore']
            }
        }
    };
    
    let config = targetBiomes[event.item.id];
    if (!config) return;
    
    event.item.count--;
    
    let minX = (event.block.x >> 4) * 16;
    let minZ = (event.block.z >> 4) * 16;
    let maxX = minX + 15;
    let maxZ = minZ + 15;
    let centerX = minX + 8;
    let centerZ = minZ + 8;
    let dim = event.level.dimension;
    let blockX = event.block.x;
    let blockY = event.block.y;
    let blockZ = event.block.z;
    
    let blocksToConvert = [
        '#minecraft:base_stone_overworld',
        '#minecraft:dirt',
        'minecraft:gravel',
        'minecraft:sand',
        'minecraft:sandstone',
        'minecraft:clay',
        'minecraft:ice',
        'minecraft:packed_ice',
        'minecraft:blue_ice',
        'minecraft:calcite',
        'minecraft:dripstone_block',
        'minecraft:smooth_basalt',
        'minecraft:amethyst_block',
        'minecraft:budding_amethyst',
        'minecraft:mossy_cobblestone',
        'minecraft:mossy_stone_bricks'
    ];
    
    let blocksToClear = [
        '#minecraft:mineable/axe',
        '#minecraft:mineable/hoe',
        '#minecraft:leaves',
        '#minecraft:logs',
        '#minecraft:flowers',
        '#minecraft:saplings',
        '#minecraft:crops',
        'minecraft:short_grass',
        'minecraft:tall_grass',
        'minecraft:fern',
        'minecraft:large_fern',
        'minecraft:dead_bush',
        'minecraft:sugar_cane',
        'minecraft:cactus',
        'minecraft:vine',
        'minecraft:glow_lichen',
        'minecraft:lily_pad',
        'minecraft:snow',
        'minecraft:snow_block',
        'minecraft:brown_mushroom',
        'minecraft:red_mushroom',
        'minecraft:cobweb',
        'minecraft:amethyst_cluster',
        'minecraft:large_amethyst_bud',
        'minecraft:medium_amethyst_bud',
        'minecraft:small_amethyst_bud'
    ];
    
    let slices = [];
    for (let y = 319; y >= -64; y -= 32) {
        slices.push({ maxY: y, minY: Math.max(y - 31, -64) });
    }
    
    slices.forEach(slice => {
        blocksToClear.forEach(block => {
            event.server.runCommandSilent(`execute in ${dim} run fill ${minX} ${slice.minY} ${minZ} ${maxX} ${slice.maxY} ${maxZ} minecraft:air replace ${block}`);
        });
        
        if (config.fluid) {
            event.server.runCommandSilent(`execute in ${dim} run fill ${minX} ${slice.minY} ${minZ} ${maxX} ${slice.maxY} ${maxZ} minecraft:structure_void replace minecraft:water`);
            event.server.runCommandSilent(`execute in ${dim} run fill ${minX} ${slice.minY} ${minZ} ${maxX} ${slice.maxY} ${maxZ} minecraft:structure_void replace minecraft:flowing_water`);
        }
    });
    
    event.server.runCommandSilent(`execute in ${dim} run setblock ${blockX} ${blockY} ${blockZ} kubejs:biome_changer`);
    
    event.server.runCommandSilent(`execute in ${dim} run playsound minecraft:entity.generic.explode block @a ${centerX} ${blockY} ${centerZ} 10.0 0.8`);
    event.server.runCommandSilent(`execute in ${dim} run particle minecraft:explosion_emitter ${centerX} ${blockY} ${centerZ} 8 4 8 0 2 force`);
    event.server.runCommandSilent(`execute in ${dim} run particle minecraft:large_smoke ${centerX} ${blockY} ${centerZ} 8 8 8 0.1 1000 force`);
    event.server.runCommandSilent(`execute in ${dim} run particle minecraft:campfire_cosy_smoke ${centerX} ${blockY} ${centerZ} 8 8 8 0.1 1000 force`);
    
    slices.forEach((slice, index) => {
        event.server.scheduleInTicks((index + 1) * 10, () => {
            
            if (config.ores) {
                for (let targetOre in config.ores) {
                    config.ores[targetOre].forEach(sourceOre => {
                        event.server.runCommandSilent(`execute in ${dim} run fill ${minX} ${slice.minY} ${minZ} ${maxX} ${slice.maxY} ${maxZ} ${targetOre} replace ${sourceOre}`);
                    });
                }
            }
            
            blocksToConvert.forEach(block => {
                event.server.runCommandSilent(`execute in ${dim} run fill ${minX} ${slice.minY} ${minZ} ${maxX} ${slice.maxY} ${maxZ} ${config.ground} replace ${block}`);
            });
            
            if (config.fluid) {
                event.server.runCommandSilent(`execute in ${dim} run fill ${minX} ${slice.minY} ${minZ} ${maxX} ${slice.maxY} ${maxZ} ${config.fluid} replace minecraft:structure_void`);
            }
            
            event.server.runCommandSilent(`execute in ${dim} run fillbiome ${minX} ${slice.minY} ${minZ} ${maxX} ${slice.maxY} ${maxZ} ${config.biome}`);
            
            if (blockY >= slice.minY && blockY <= slice.maxY) {
                event.server.runCommandSilent(`execute in ${dim} run setblock ${blockX} ${blockY} ${blockZ} kubejs:biome_changer`);
            }
            
            event.server.runCommandSilent(`execute in ${dim} run playsound ${config.sound} block @a ${centerX} ${slice.minY + 16} ${centerZ} 10.0 0.8`);
            event.server.runCommandSilent(`execute in ${dim} run particle ${config.particle} ${centerX} ${slice.minY + 16} ${centerZ} 8 16 8 0.2 2500 force`);
            event.server.runCommandSilent(`execute in ${dim} run particle minecraft:smoke ${centerX} ${slice.minY + 16} ${centerZ} 8 16 8 0.1 1500 force`);
        });
    });
});