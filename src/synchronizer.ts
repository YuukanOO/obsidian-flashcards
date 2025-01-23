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
	syncDecks(decks: DeckHeader[]): Promise<void>;
}

export interface ProgressTracker {
	error(err: Error): void;
	progress(current: number, total: number): void;
}

export type SyncResult = {
	started: UnixTimestamp;
	ended: UnixTimestamp;
	/** Duration of the sync process, in Milliseconds */
	duration: number;
	/** Number of decks synced */
	decksCount: number;
};

/**
 * Synchronizes decks from a source to a destination.
 */
export default class Synchronizer {
	private _isRunning = false;

	constructor(
		private readonly _source: DecksEmitter,
		private readonly _destination: DecksReceiver
	) {}

	async run(previous?: UnixTimestamp): Promise<SyncResult> {
		if (this._isRunning) {
			throw new Error(
				"The exporter is already running, wait for it to complete."
			);
		}

		this._isRunning = true;

		try {
			return await this.process(previous);
		} finally {
			this._isRunning = false;
		}
	}

	private async process(previous?: UnixTimestamp): Promise<SyncResult> {
		const started = new Date().getTime();
		const decks = await this._source.getDecks(previous);

		await this._destination.syncDecks(decks);

		const ended = new Date().getTime();

		return {
			started,
			ended,
			duration: ended - started,
			decksCount: decks.length,
		};
	}
}
