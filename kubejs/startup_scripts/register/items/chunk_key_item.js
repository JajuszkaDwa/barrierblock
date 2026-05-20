StartupEvents.registry('item', event => {
	event.create('chunk_key')
		.displayName('Chunk key')
		.texture('minecraft:item/stick')
		.unstackable()
		.fireResistant(true)	
});