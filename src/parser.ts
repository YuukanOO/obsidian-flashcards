import { Note } from "src/note";

export type ParseResult = {
	/** Index at which the notes section has been found. */
	index: number;
	notes: Note[];
};

/**
 * Function used to transform a note, extending it with custom data if needed.
 */
export type NoteTransformerFunc = (note: Note) => Note;

export interface NoteParser {
	parse(
		content: string,
		transformer?: NoteTransformerFunc
	): ParseResult | undefined;
	stringify(notes: Note[]): string;
}
