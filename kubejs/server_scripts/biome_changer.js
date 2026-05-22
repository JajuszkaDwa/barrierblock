BlockEvents.rightClicked('kubejs:biome_changer', event => {
	const { hand, item, player, block, server } = event;
	if (hand !== 'MAIN_HAND') return;

});