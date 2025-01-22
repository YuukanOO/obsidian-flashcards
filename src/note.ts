export class Note {
	constructor(
		public front: string,
		public back: string,
		public id?: number,
		public tags: string[] = []
	) {}
}

export interface DeckTopic {
	readonly deck: string;
	readonly topic: string;
}

export interface NotesProvider {
	getNotes(): Promise<Note[]>;
	syncNotes(topic: DeckTopic, notes: Note[]): Promise<void>;
	deleteNotesByTopics(topics: string[]): Promise<void>;
}
