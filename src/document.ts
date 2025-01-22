import { DeckTopic, NotesProvider } from "src/note";
import { UnixTimestamp } from "src/time";

/**
 * Represents a single document from which notes can be extracted.
 */
export interface Document extends NotesProvider, DeckTopic {
	readonly modified: UnixTimestamp;
}

/**
 * Extract documents from a specific source.
 */
export interface DocumentsProvider {
	getDocuments(): Promise<Document[]>;
}
