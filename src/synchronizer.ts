import { Deck } from "src/note";
import { UnixTimestamp } from "src/time";

/**
 * Represents an element from which we can retrieve a deck.
 */
export interface DeckHeader {
	readonly name: string;

	/**
	 * Open the deck and retrieve associated notes.
	 *
	 * Calls the given callback with the opened deck.
	 */
	open(callback: (deck: Deck) => Promise<void>): Promise<void>;
}

/**
 * Represents an element from which we can retrieve decks.
 */
export interface DecksEmitter {
	getDecks(since?: UnixTimestamp): Promise<DeckHeader[]>;
}

/**
 * Represents an element which can receive decks and synchronize them.
 */
export interface DecksReceiver {
	sync(deck: Deck): Promise<void>;
	finalize(): Promise<void>;
}

/**
 * Synchronizes decks from a source to a destination.
 */
export default class Synchronizer {
	private _isRunning = false;

	constructor(
		private readonly _source: DecksEmitter,
		private readonly _destination: DecksReceiver
	) {}

	async run(previous?: UnixTimestamp) {
		if (this._isRunning) {
			throw new Error("Already running");
		}

		this._isRunning = true;

		try {
			this.process(previous);
		} finally {
			this._isRunning = false;
		}
	}

	private async process(previous?: UnixTimestamp) {
		const headers = await this._source.getDecks(previous);

		for (const header of headers) {
			await header.open(async (deck) => {
				await this._destination.sync(deck);
			});
		}

		await this._destination.finalize();
	}
}
