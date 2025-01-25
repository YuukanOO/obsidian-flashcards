import { TAbstractFile, TFile, TFolder, Vault } from "obsidian";
import { Deck, Note } from "src/note";
import NoteParser from "src/parser";
import {
	DeckHeader,
	DecksDiff,
	DecksEmitter,
	SyncData,
} from "src/synchronizer";
import { UnixTimestamp } from "src/time";

const MARKDOWN_EXTENSION = "md";

/**
 * Read and write notes from/to an obsidian file.
 * We need to keep track of where notes are extracted to update id in the file once
 * it has been exported.
 *
 * It also keeps the notes section index to avoid relaunching the regexp.
 */
class ObsidianFile {
	private _notes: Note[] = [];
	private _matchedIndex?: number;

	constructor(
		private readonly _file: TFile,
		private readonly _parser: NoteParser,
		private readonly _source: string,
		private readonly _tags: string[] = []
	) {}

	async extract(): Promise<Note[]> {
		const content = await this._file.vault.cachedRead(this._file);
		const parseResult = this._parser.parse(content, (note) => {
			note.tags = this._tags;
			note.source = this._source;
			return note;
		});

		this._matchedIndex = parseResult?.index;
		this._notes = parseResult?.notes ?? [];

		return this._notes;
	}

	async write(): Promise<void> {
		await this._file.vault.process(this._file, (content) => {
			return (
				content.slice(0, this._matchedIndex) +
				this._parser.stringify(this._notes)
			);
		});
	}
}

/**
 * Represents a deck, extracted from root folders/files in an obsidian vault.
 */
class ObsidianDeckHeader implements DeckHeader {
	private _removed: string[];
	private readonly _updated: ObsidianFile[] = [];
	public readonly unchanged: string[] = [];
	public readonly sources: string[] = [];

	private constructor(public readonly name: string) {}

	get hasBeenModified(): boolean {
		return this._updated.length > 0 || this._removed.length > 0;
	}

	async open(callback: (deck: Deck) => Promise<void>): Promise<void> {
		const notes: Note[] = [];

		for (const file of this._updated) {
			notes.push(...(await file.extract()));
		}

		await callback({
			name: this.name,
			notes,
		});

		// Write back the file in case where note ids have been attributed
		for (const file of this._updated) {
			await file.write();
		}
	}

	private visit(
		parser: NoteParser,
		file: TAbstractFile,
		modifiedSince?: UnixTimestamp,
		tags: string[] = []
	): void {
		if (file instanceof TFile && file.extension === MARKDOWN_EXTENSION) {
			const source = getSourceName(file);

			if (
				!this._removed.includes(source) ||
				!modifiedSince ||
				file.stat.mtime > modifiedSince
			) {
				this._updated.push(
					new ObsidianFile(
						file,
						parser,
						source,
						tags.concat(file.basename)
					)
				);
			} else this.unchanged.push(source);

			this.sources.push(source);
			this._removed.remove(source);
			return;
		}

		if (file instanceof TFolder) {
			file.children.forEach((f) =>
				this.visit(parser, f, modifiedSince, tags.concat(file.name))
			);
		}
	}

	public static create(
		parser: NoteParser,
		name: string,
		file: TAbstractFile,
		previousSources?: string[],
		since?: UnixTimestamp
	): ObsidianDeckHeader {
		const header = new ObsidianDeckHeader(name);

		// Consider every previous sources as being removed
		header._removed = previousSources ? previousSources.slice() : [];
		header.visit(parser, file, since);

		return header;
	}
}

/**
 * Extract decks from an obsidian vault and parse notes using the given NoteParser.
 */
export default class ObsidianVaultDecks implements DecksEmitter {
	constructor(
		private readonly _vault: Vault,
		private readonly _parser: NoteParser
	) {}

	async getDecks(previous?: SyncData): Promise<DecksDiff> {
		const diff: DecksDiff = { decks: [], fingerprint: {} };

		this._vault.getRoot().children.forEach((file) => {
			if (!canBeUsedAsDeck(file)) return;

			const deckName = getBasename(file);
			// Consider unseen decks as modified
			const since = previous?.decks[deckName] ? previous?.on : undefined;

			const deck = ObsidianDeckHeader.create(
				this._parser,
				deckName,
				file,
				previous?.decks[deckName],
				since
			);

			diff.fingerprint[deckName] = deck.sources;

			if (!deck.hasBeenModified) return;

			diff.decks.push(deck);
		});

		return diff;
	}
}

function getBasename(file: TAbstractFile): string {
	return file instanceof TFile ? file.basename : file.name;
}

function canBeUsedAsDeck(file: TAbstractFile): boolean {
	if (file instanceof TFile) return file.extension === MARKDOWN_EXTENSION;
	if (file instanceof TFolder) return true;

	return false;
}

function getSourceName(file: TFile): string {
	return file.path.slice(0, -(file.extension.length + 1));
}
