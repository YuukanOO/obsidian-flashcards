import { Note } from "src/note";
import { NoteFactoryFunc, NoteParser, ParseResult } from "src/parser";

export type MarkdownParserOptions = {
	readonly notesSectionDelimiter: string;
	readonly notesDelimiter: string;
};

const DEFAULT_NOTE_FACTORY_FUNC: NoteFactoryFunc = (front, back, id) =>
	new Note(front, back, id);

export default class MarkdownParser implements NoteParser {
	private _idRegexp = /^<!--\s*id:(\d+)\s*-->/m;

	private get _notesDelimiter() {
		return new RegExp(`^${this._options.notesDelimiter}`, "gm");
	}

	private get _notesSectionDelimiter() {
		return new RegExp(`^${this._options.notesSectionDelimiter}`, "m");
	}

	constructor(private readonly _options: MarkdownParserOptions) {}

	parse(
		content: string,
		factory: NoteFactoryFunc = DEFAULT_NOTE_FACTORY_FUNC
	): ParseResult | undefined {
		const match = this._notesSectionDelimiter.exec(content);

		if (!match) return;

		return {
			index: match.index,
			notes: this.parseNotes(
				content.slice(match.index + match[0].length),
				factory
			),
		};
	}

	stringify(notes: Note[]): string {
		if (!notes.length) return "";

		return (
			this._options.notesSectionDelimiter +
			notes
				.map(this.stringifyNote.bind(this))
				.join(this._options.notesDelimiter)
		);
	}

	private stringifyNote(note: Note): string {
		return `
${
	note.id
		? `<!-- id:${note.id} -->
`
		: ""
}${note.front}
${this._options.notesDelimiter}
${note.back}
`;
	}

	private parseNotes(content: string, factory: NoteFactoryFunc): Note[] {
		const parts = content.split(this._notesDelimiter);
		const notes: Note[] = [];

		if (parts.length % 2 !== 0) {
			return notes;
		}

		for (let i = 0; i < parts.length; i += 2) {
			const [front, id] = this.parseFront(parts[i]);
			const back = parts[i + 1].trim();

			notes.push(factory(front, back, id));
		}

		return notes;
	}

	private parseFront(content: string): [string, number | undefined] {
		const match = this._idRegexp.exec(content);

		if (!match) return [content.trim(), undefined];

		// Slice this way to allow the id comment to be anywhere in the front content.
		return [
			(
				content.slice(0, match.index) +
				content.slice(match.index + match[0].length)
			).trim(),
			parseInt(match[1]),
		];
	}
}
