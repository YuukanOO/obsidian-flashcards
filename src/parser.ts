import { Note } from "src/note";

export type ParseResult = {
	/** Index at which the notes section has been found. */
	index: number;
	notes: Note[];
};

/**
 * Function used to create a note from raw data.
 */
export type NoteFactoryFunc = (
	front: string,
	back: string,
	id?: number
) => Note;

export interface NoteParser {
	parse(content: string, factory?: NoteFactoryFunc): ParseResult | undefined;
	stringify(notes: Note[]): string;
}
