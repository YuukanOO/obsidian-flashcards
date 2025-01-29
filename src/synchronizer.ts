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
 * Keep the list of sources and the last seen time.
 */
export type DeckFingerprint = {
	on: UnixTimestamp;
	sources: string[];
};

export type DecksFingerprints = { [deckName: string]: DeckFingerprint };

/**
 * Represents what have changed since a previous sync.
 */
export type DecksDiff = {
	/** List of modified decks */
	readonly decks: DeckHeader[];
	/** Current state of decks */
	fingerprints: DecksFingerprints;
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
	getDecks(previous?: DecksFingerprints): Promise<DecksDiff>;
}

/**
 * Represents an element which can receive decks and synchronize them.
 */
export interface DecksReceiver {
	syncDecks(decks: DeckHeader[]): Promise<SyncStats>;
}

export type SyncResult = {
	/** Duration of the sync process, in Milliseconds */
	duration: number;
	stats: SyncStats;
	state: DecksFingerprints;
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

	async run(previous?: DecksFingerprints): Promise<SyncResult> {
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

	private async process(previous?: DecksFingerprints): Promise<SyncResult> {
		const started = Date.now();

		const diff = await this._source.getDecks(previous);
		const stats = await this._destination.syncDecks(diff.decks);

		const ended = Date.now();

		return {
			state: diff.fingerprints,
			stats,
			duration: ended - started,
		};
	}
}
