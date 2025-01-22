import { Document, DocumentsProvider } from "src/document";
import { NotesProvider } from "src/note";
import { UnixTimestamp } from "src/time";

export default class Exporter {
	private _isProcessing = false;

	constructor(
		private readonly _source: DocumentsProvider,
		private readonly _destination: NotesProvider
	) {}

	async run(previous?: ExportResult): Promise<ExportResult> {
		if (this._isProcessing) {
			throw new Error("Already processing");
		}

		this._isProcessing = true;

		try {
			return this.process(previous);
		} finally {
			this._isProcessing = false;
		}
	}

	private async process(previous?: ExportResult) {
		const docs = await this._source.getDocuments();
		const state = ExportState.from(docs, previous);

		console.log(state);

		for (const doc of state.updated) {
			const notes = await doc.getNotes();

			await this._destination.syncNotes(doc, notes);
			await doc.syncNotes(doc, notes);

			state.processed(doc);
		}

		// FIXME: Promise.all cause concurrency issues in the AnkiConnect provider, maybe obsidian is multithreaded?

		// await Promise.all(
		// 	state.updated.map(async (doc) => {
		// 		const notes = await doc.getNotes();

		// 		await this._destination.syncNotes(doc, notes);
		// 		await doc.syncNotes(doc, notes);

		// 		state.processed(doc);
		// 	})
		// );

		await this._destination.deleteNotesByTopics(state.deleted);

		return state.done();
	}
}

class ExportState {
	private _started: UnixTimestamp;
	private _ended?: UnixTimestamp;
	private _processed: Set<string>;

	private constructor(
		untouched: string[],
		public readonly updated: Document[],
		public readonly deleted: string[]
	) {
		this._started = new Date().getTime();
		this._processed = new Set(untouched);
	}

	public done(): ExportResult {
		this._ended = new Date().getTime();

		return {
			date: this._started,
			duration: this._ended - this._started,
			processed: Array.from(this._processed),
		};
	}

	public processed(doc: Document) {
		this._processed.add(doc.topic);
	}

	public static from(docs: Document[], previous?: ExportResult) {
		const previousTopics: string[] = previous?.processed.slice() ?? [];
		const updated: Document[] = [];
		const untouched: string[] = [];

		docs.forEach((doc) => {
			if (!previousTopics.includes(doc.topic)) {
				updated.push(doc);
			} else if (!previous || doc.modified > previous.date) {
				updated.push(doc);
			} else {
				untouched.push(doc.topic);
			}

			previousTopics.remove(doc.topic);
		});

		return new ExportState(untouched, updated, previousTopics);
	}
}

export type ExportResult = {
	date: UnixTimestamp;
	duration: number;
	processed: string[];
};
