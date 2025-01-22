/**
 * Actual note content.
 */
export type Note = {
	id?: number;
	front: string;
	back: string;
	tags: string[];
};

/**
 * Represents a set of notes contained in a deck.
 */
export interface Deck {
	readonly name: string;
	readonly notes: Note[];
}
