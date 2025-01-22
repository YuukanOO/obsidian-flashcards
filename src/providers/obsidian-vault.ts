import { TAbstractFile, TFile, TFolder, Vault } from "obsidian";
import { Deck, Note } from "src/note";
import { NoteParser } from "src/parser";
import { DeckHeader, DecksEmitter } from "src/synchronizer";
import { UnixTimestamp } from "src/time";

function getBasename(file: TAbstractFile): string {
	return file instanceof TFile ? file.basename : file.name;
}

const MARKDOWN_EXTENSION = "md";

function isValidDeckHeader(file: TAbstractFile): boolean {
	if (file instanceof TFile) return file.extension === MARKDOWN_EXTENSION;
	if (file instanceof TFolder) return true;

	return false;
}

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
		private readonly _tags: string[] = []
	) {}

	async extract(): Promise<Note[]> {
		const content = await this._file.vault.cachedRead(this._file);
		const parseResult = this._parser.parse(content, (front, back, id) => ({
			id,
			front,
			back,
			tags: this._tags,
		}));

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
	name: string;

	constructor(
		private readonly _parser: NoteParser,
		private readonly _root: TAbstractFile,
		private readonly _since?: UnixTimestamp
	) {
		this.name = getBasename(this._root);
	}

	async open(callback: (deck: Deck) => Promise<void>): Promise<void> {
		const files = this.collectFiles(this._root, []);
		const notes: Note[] = [];

		for (const file of files) {
			notes.push(...(await file.extract()));
		}

		await callback({
			name: this.name,
			notes,
		});

		// Write back the file in case where note ids have been attributed
		for (const file of files) {
			await file.write();
		}
	}

	private collectFiles(file: TAbstractFile, tags: string[]): ObsidianFile[] {
		if (file instanceof TFile && file.extension === MARKDOWN_EXTENSION) {
			return [
				new ObsidianFile(
					file,
					this._parser,
					tags.concat(file.basename)
				),
			];
		}

		if (file instanceof TFolder) {
			return file.children.flatMap((f) =>
				this.collectFiles(f, tags.concat(file.name))
			);
		}

		return [];
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

	async getDecks(since?: UnixTimestamp): Promise<DeckHeader[]> {
		const root = this._vault.getRoot();

		return root.children
			.filter(isValidDeckHeader)
			.map((f) => new ObsidianDeckHeader(this._parser, f, since));
	}
}
