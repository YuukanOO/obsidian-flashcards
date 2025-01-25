import Formatter from "src/formatter";
import Logger from "src/logger";
import { Deck, Note } from "src/note";
import Slugifier from "src/slugifier";
import {
	DeckHeader,
	DecksDiff,
	DecksReceiver,
	SyncStats,
} from "src/synchronizer";

const DEFAULT_ANKI_CONNECT_VERSION = 6;

/**
 * Synchronize decks with an AnkiConnect server.
 *
 * A Slugifier instance is mandatory to convert tags to their slug equivalent since
 * Anki is pretty touchy about it.
 */
export default class AnkiConnectDecks implements DecksReceiver {
	private _version: number = DEFAULT_ANKI_CONNECT_VERSION;
	private _existingDecks: Set<string> = new Set();

	constructor(
		private readonly _slugifier: Slugifier,
		private readonly _formatter?: Formatter,
		private readonly _logger?: Logger,
		private readonly _baseUrl: string = "http://localhost:8765",
		private readonly _orphansDeckName: string = "obsidian-orphans"
	) {}

	async syncDecks(diff: DecksDiff): Promise<SyncStats> {
		this._version = await this.requestPermissions();
		this._existingDecks = await this.getExistingDecks();

		const stats = { decks: 0, notes: 0 };

		for (let i = 0; i < diff.decks.length; i++) {
			const header = diff.decks[i];

			this._logger?.status(
				`Exporting deck ${++stats.decks}/${diff.decks.length}...`
			);

			try {
				await header.open(async (d) => {
					await this.syncDeck(header, d);

					stats.notes += d.notes.length;
				});
			} catch (e) {
				// Something happen and the deck can't be processed, let's just pretend
				// only unchanged source can be considered synced.
				diff.fingerprint[header.name] = header.unchanged ?? [];

				this._logger?.error(
					new Error(
						`Error processing deck ${header.name}: ${
							e.message ?? e
						}`
					)
				);
			}
		}

		await this.deleteOrphansDeck();

		return stats;
	}

	private async syncDeck(header: DeckHeader, deck: Deck): Promise<void> {
		await this.ensureDeckExist(deck);
		const previousIds = await this.getExistingNoteIds(header);

		for (const note of deck.notes) {
			if (note.id && !previousIds.includes(note.id)) {
				await this.tryMoveNoteToDeck(note, deck.name);
			}

			previousIds.remove(await this.upsert(note, deck.name));
		}

		await this.moveToOrphansDeck(previousIds);
	}

	private async getExistingDecks(): Promise<Set<string>> {
		const existingDecks = await this.call<Record<string, number>>(
			"deckNamesAndIds"
		);

		return new Set(Object.keys(existingDecks));
	}

	private async requestPermissions(): Promise<number> {
		// First try using no-cors to show the Anki popup.
		try {
			await this.call("requestPermission", undefined, "no-cors");
		} catch {
			throw new Error(
				"Could not reach AnkiConnect, make sure Anki is running and AnkiConnect plugin is installed."
			);
		}

		// And then check if the user has granted the application.
		try {
			const result = await this.call<PermissionResult>(
				"requestPermission"
			);

			if (result.permission !== "granted") throw result.permission;

			return result.version;
		} catch {
			throw new Error(
				"AnkiConnect is not reachable, did you allow Obsidian to reach it?"
			);
		}
	}

	private async deleteOrphansDeck(): Promise<void> {
		await this.call("deleteDecks", {
			decks: [this._orphansDeckName],
			cardsToo: true,
		});
	}

	private async ensureDeckExist(deck: Deck): Promise<void> {
		if (this._existingDecks.has(deck.name) || !deck.notes.length) return;

		await this.call("createDeck", {
			deck: deck.name,
		});

		this._existingDecks.add(deck.name);
	}

	private getExistingNoteIds(header: DeckHeader): Promise<number[]> {
		let query = `deck:"${header.name}"`;

		if (header.unchanged.length) {
			query +=
				" and " +
				header.unchanged
					.map((s) => `-tag:${this.sourceToTag(s)}`)
					.join(" and ");
		}

		return this.call<number[]>("findNotes", {
			query,
		});
	}

	private async moveToOrphansDeck(ids: number[]): Promise<void> {
		if (!ids.length) return;

		await this.call("changeDeck", {
			cards: ids,
			deck: this._orphansDeckName,
		});
	}

	private async tryMoveNoteToDeck(note: Note, deck: string) {
		if (!note.id) return;

		const [existing] = await this.call<object[]>("notesInfo", {
			notes: [note.id],
		});

		if (Object.isEmpty(existing)) {
			note.id = undefined;
			return;
		}

		await this.call("changeDeck", {
			cards: [note.id],
			deck: deck,
		});
	}

	private async upsert(note: Note, deck: string): Promise<number> {
		const tags = this._slugifier.slugify(note.tags);

		if (note.source) tags.push(this.sourceToTag(note.source));

		const noteData = {
			deckName: deck,
			modelName: "Basic",
			fields: {
				Front: await this.format(note.front),
				Back: await this.format(note.back),
			},
			options: {
				allowDuplicate: true,
			},
			tags,
		};

		if (note.id) {
			await this.call("updateNote", {
				note: {
					...noteData,
					id: note.id,
				},
			});
		} else {
			note.id = await this.call<number>("addNote", {
				note: noteData,
			});
		}

		return note.id;
	}

	private sourceToTag(source: string): string {
		return `obsidian:${this._slugifier.slugify(source)}`;
	}

	private async format(content: string): Promise<string> {
		if (!this._formatter) return content;

		return this._formatter.format(content);
	}

	private async call<TResult>(
		action: string,
		params?: unknown,
		mode: RequestInit["mode"] = "cors"
	): Promise<TResult> {
		const result = (await fetch(this._baseUrl, {
			headers: {
				"Content-Type": "application/json",
			},
			method: "POST",
			mode,
			body: JSON.stringify({
				action,
				params,
				version: this._version,
			}),
		}).then(async (r) => {
			// When using no-cors, looks like the content is always empty, so just dismiss it.
			if (mode === "no-cors") return { result: undefined, error: null };

			return r.json();
		})) as ActionResult<TResult>;

		if (result.error)
			throw new Error(result.error + "\n" + JSON.stringify(params));

		return result.result;
	}
}

type ActionResult<T> = {
	result: T;
	error: null | string;
};

type PermissionResult =
	| {
			permission: "denied";
			// eslint-disable-next-line no-mixed-spaces-and-tabs
	  }
	| {
			permission: "granted";
			requireApikey: boolean;
			version: number;
			// eslint-disable-next-line no-mixed-spaces-and-tabs
	  };
