import { Note } from "src/note";

export type ParseResult = {
	index: number;
	notes: Note[];
};

export type NoteFactoryFunc = (
	front: string,
	back: string,
	id?: number
) => Note;

export interface NoteParser {
	parse(content: string, factory?: NoteFactoryFunc): ParseResult | undefined;
	stringify(notes: Note[]): string;
}
