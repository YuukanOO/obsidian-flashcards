import { Note } from "src/note";
import { NoteParser, NoteTransformerFunc, ParseResult } from "src/parser";

export type MarkdownParserOptions = {
	readonly notesSectionDelimiter: string;
	readonly notesDelimiter: string;
};

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
		transformer?: NoteTransformerFunc
	): ParseResult | undefined {
		const match = this._notesSectionDelimiter.exec(content);

		if (!match) return;

		return {
			index: match.index,
			notes: this.parseNotes(
				content.slice(match.index + match[0].length),
				transformer
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

	private parseNotes(
		content: string,
		transformer?: NoteTransformerFunc
	): Note[] {
		const parts = content.split(this._notesDelimiter);
		const notes: Note[] = [];

		if (parts.length % 2 !== 0) {
			return notes;
		}

		for (let i = 0; i < parts.length; i += 2) {
			const [front, id] = this.parseFront(parts[i]);
			const back = parts[i + 1].trim();

			const note: Note = { front, back, id, tags: [] };

			notes.push(transformer ? transformer(note) : note);
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
