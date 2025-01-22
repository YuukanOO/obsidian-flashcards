import { TAbstractFile, TFile, Vault } from "obsidian";
import { Document, DocumentsProvider } from "src/document";
import { DeckTopic, Note } from "src/note";
import { NoteParser } from "src/parser";

function collectDeckNameAndTags(file: TAbstractFile, tags: string[]): string {
	tags.push(file instanceof TFile ? file.basename : file.name);

	if (!file.parent || file.parent.isRoot()) {
		return file instanceof TFile ? file.basename : file.name;
	}

	return collectDeckNameAndTags(file.parent, tags);
}

class ObsidianVaultDocument implements Document {
	readonly deck: string;
	readonly topic: string;
	readonly modified: number;

	private _parseIndex?: number;
	private _tags: string[] = [];

	constructor(
		private readonly _file: TFile,
		private readonly _parser: NoteParser
	) {
		this.topic = this._file.path.slice(
			0,
			-(this._file.extension.length + 1)
		);
		this.deck = collectDeckNameAndTags(this._file, this._tags);
		this.modified = this._file.stat.mtime;
	}

	deleteNotesByTopics(topics: string[]): Promise<void> {
		throw new Error("Method not implemented.");
	}

	async syncNotes(topic: DeckTopic, notes: Note[]): Promise<void> {
		if (topic !== this) throw new Error("wrong topic");

		await this._file.vault.process(this._file, (content) => {
			return (
				content.slice(0, this._parseIndex) +
				this._parser.stringify(notes)
			);
		});
	}

	async getNotes(): Promise<Note[]> {
		const content = await this._file.vault.cachedRead(this._file);

		const parseResult = this._parser.parse(
			content,
			(front, back, id) => new Note(front, back, id, this._tags)
		);
		this._parseIndex = parseResult?.index;

		return parseResult?.notes ?? [];
	}
}

export default class ObsidianVaultProvider implements DocumentsProvider {
	constructor(
		private readonly _vault: Vault,
		private readonly _parser: NoteParser
	) {}

	async getDocuments(): Promise<Document[]> {
		const files = this._vault.getMarkdownFiles();
		return files.map((f) => new ObsidianVaultDocument(f, this._parser));
	}
}
