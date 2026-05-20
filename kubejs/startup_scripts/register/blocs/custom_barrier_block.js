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
		.customBlockProperties(properties => {
			properties.skipRendering((state, adjacentState, direction) => {
				return adjacentState.is(state.getBlock());
			});
		});;
});