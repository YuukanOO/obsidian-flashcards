import Formatter from "src/formatter";
import { DeckTopic, Note, NotesProvider } from "src/note";
import Slugifier from "src/slugifier";

export default class AnkiConnectProvider implements NotesProvider {
	/**
	 * Builds a new AnkiConnect provider instance.
	 * @param _slugifier Used to normalize tags since Anki does not allow spaces
	 */
	constructor(
		private readonly _slugifier: Slugifier,
		private readonly _baseUrl: string = "http://127.0.0.1:8765",
		private readonly _formatter?: Formatter
	) {}

	async getNotes(): Promise<Note[]> {
		throw new Error("Method not implemented.");
	}

	async syncNotes(topic: DeckTopic, notes: Note[]): Promise<void> {
		const existing = await this.removeOldNotes(topic, notes);

		if (!notes.length) return;

		await this.getOrCreateDeck(topic.deck);

		for (const note of notes) {
			// Non-existent id, just recreate it
			if (note.id && !existing.includes(note.id)) note.id = undefined;

			await this.upsertNote(topic, note);
		}
	}

	async deleteNotesByTopics(topics: string[]): Promise<void> {
		if (!topics.length) return;

		const ids = await this.call<number[]>("findNotes", {
			query: topics
				.map((topic) => `tag:${this._slugifier.slugify(topic)}`)
				.join(" or "),
		});

		await this.call("deleteNotes", {
			notes: ids,
		});
	}

	private async removeOldNotes(topic: DeckTopic, notes: Note[]) {
		const ids = await this.call<number[]>("findNotes", {
			query: `tag:${this._slugifier.slugify(topic.topic)}`,
		});

		await this.call("deleteNotes", {
			notes: ids.filter((id) => !notes.find((note) => note.id === id)),
		});

		return ids;
	}

	private async getOrCreateDeck(name: string): Promise<number> {
		const existingDecks = await this.call<Record<string, number>>(
			"deckNamesAndIds"
		);

		if (existingDecks[name]) return existingDecks[name];

		const id = await this.call<number>("createDeck", {
			deck: name,
		});

		return id;
	}

	private async upsertNote(topic: DeckTopic, note: Note) {
		const noteData = {
			deckName: topic.deck,
			modelName: "Basic",
			fields: {
				Front:
					(await this._formatter?.format(note.front)) ?? note.front,
				Back: (await this._formatter?.format(note.back)) ?? note.back,
			},
			tags: this._slugifier.slugify(note.tags.concat(topic.topic)),
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
