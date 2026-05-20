StartupEvents.registry('item', event => {
	event.create('chunk_key')
		.displayName('Chunk key')
		.texture('kubejs:item/chunk_key')
		.unstackable()
		.fireResistant(true)	
});