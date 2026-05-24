StartupEvents.registry('item', event => {
	event.create('nether_essence')
		.displayName('Nether Essence')
		// .texture('kubejs:items/nether_essence')
		.maxStackSize(64)
		.fireResistant(true)	
});