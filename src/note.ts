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
	readonly notes: Note[];
};
