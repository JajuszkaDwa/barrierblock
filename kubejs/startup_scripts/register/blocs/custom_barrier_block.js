StartupEvents.registry('block', event => {
	event.create('custom_barrier')
		.displayName('Custom Barrier')
		.noSoundType()
        .unbreakable()
		.resistance(6000000)
		.noDrops()
        .opaque(false)
        .renderType('translucent')
		.notSolid()
		.transparent(true)
		.model('kubejs:block/custom_barrier')
});