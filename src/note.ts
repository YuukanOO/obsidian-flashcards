/**
 * Actual note content.
 */
export type Note = {
	id?: number;
	source?: string;
	front: string;
	back: string;
	tags: string[];
};

/**
 * Represents a set of notes contained in a deck.
 */
export type Deck = {
	readonly name: string;
	/**
	 * Contains the array of unchanged sources so that notes coming from them should not be processed.
	 * It enables partial deck updates.
	 */
	readonly unchanged: string[];
	readonly notes: Note[];
};
