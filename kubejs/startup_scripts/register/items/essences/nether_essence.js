StartupEvents.registry('item', event => {
	event.create('nether_essence')
		.displayName('Nether Essence')
		.texture('minecraft:item/gunpowder')
		.maxStackSize(64)
		.fireResistant(true)	
});