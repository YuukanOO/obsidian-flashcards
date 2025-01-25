import { Deck } from "src/note";
import { UnixTimestamp } from "src/time";

/**
 * Represents an element from which we can retrieve a deck.
 */
export interface DeckHeader {
	readonly name: string;
	/**
	 * Contains the array of unchanged sources so that notes coming from them should not be processed.
	 * Enables partial deck syncing.
	 */
	readonly unchanged: string[];

	/**
	 * Open the deck and retrieve associated notes.
	 *
	 * Calls the given callback with the opened deck.
	 */
	open(callback: (deck: Deck) => Promise<void>): Promise<void>;
}

/**
 * Keep the list of sources synced per deck.
 */
export type DecksFingerprint = { [deckName: string]: string[] };

/**
 * Represents what have changed since a previous sync.
 */
export type DecksDiff = {
	/** List of modified decks */
	readonly decks: DeckHeader[];
	/** Current state of decks */
	fingerprint: DecksFingerprint;
};

/**
 * Contains stats about the sync process.
 */
export type SyncStats = {
	readonly decks: number;
	readonly notes: number;
};

/**
 * Represents an element from which we can retrieve decks.
 */
export interface DecksEmitter {
	getDecks(previous?: SyncData): Promise<DecksDiff>;
}

/**
 * Represents an element which can receive decks and synchronize them.
 */
export interface DecksReceiver {
	syncDecks(diff: DecksDiff): Promise<SyncStats>;
}

/**
 * Sync data which could be persisted to prevent syncing everything every time.
 */
export type SyncData = {
	decks: DecksFingerprint;
	on: UnixTimestamp;
};

export type SyncResult = {
	/** Duration of the sync process, in Milliseconds */
	duration: number;
	stats: SyncStats;
	state: SyncData;
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

	async run(previous?: SyncData): Promise<SyncResult> {
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

	private async process(previous?: SyncData): Promise<SyncResult> {
		const started = new Date().getTime();

		const diff = await this._source.getDecks(previous);
		const stats = await this._destination.syncDecks(diff);

		const ended = new Date().getTime();

		return {
			state: { decks: diff.fingerprint, on: ended },
			stats,
			duration: ended - started,
		};
	}
}
