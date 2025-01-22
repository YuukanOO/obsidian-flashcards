import Formatter from "src/formatter";
import { Deck, Note } from "src/note";
import Slugifier from "src/slugifier";
import { DecksReceiver } from "src/synchronizer";

/**
 * Synchronize decks with an AnkiConnect server.
 */
export default class AnkiConnectDecks implements DecksReceiver {
	constructor(
		private readonly _slugifier: Slugifier,
		private readonly _formatter?: Formatter,
		private readonly _baseUrl: string = "http://127.0.0.1:8765",
		private readonly _orphansDeckName: string = "obsidian-orphans"
	) {}

	async sync(deck: Deck): Promise<void> {
		await this.ensureDeckExist(deck);
		const previousIds = await this.getExistingIds(deck.name);

		for (const note of deck.notes) {
			if (note.id && !previousIds.includes(note.id)) {
				await this.tryMoveNoteToDeck(note, deck.name);
			}

			previousIds.remove(await this.upsert(note, deck.name));
		}

		await this.moveToOrphansDeck(previousIds);
	}

	async finalize(): Promise<void> {
		await this.call("deleteDecks", {
			decks: [this._orphansDeckName],
			cardsToo: true,
		});
	}

	private async ensureDeckExist(deck: Deck): Promise<void> {
		const existingDecks = await this.call<Record<string, number>>(
			"deckNamesAndIds"
		);

		if (existingDecks[deck.name]) return;

		// No note to create = no need to create the deck
		if (!deck.notes.length) return;

		await this.call("createDeck", {
			deck: deck.name,
		});
	}

	private getExistingIds(deck: string): Promise<number[]> {
		return this.call<number[]>("findNotes", {
			query: `deck:"${deck}"`,
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
			tags: this._slugifier.slugify(note.tags),
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

	private async format(content: string): Promise<string> {
		if (!this._formatter) return content;

		return this._formatter.format(content);
	}

	private async call<TResult>(
		action: string,
		params?: unknown
	): Promise<TResult> {
		const result = (await fetch(this._baseUrl, {
			headers: {
				"Content-Type": "application/json",
			},
			method: "POST",
			body: JSON.stringify({
				action,
				params,
				version: 6,
			}),
		}).then((r) => r.json())) as ActionResult<TResult>;

		if (result.error)
			throw new Error(result.error + "\n" + JSON.stringify(params));

		return result.result;
	}
}
type ActionResult<T> = {
	result: T;
	error: null | string;
};
