import { ExportResult } from "src/export";

const DEFAULT_NOTES_SECTION_DELIMITER = "#cards\n";
const DEFAULT_NOTES_DELIMITER = "\n---\n";

export type Settings = {
	notesSectionDelimiter: string;
	notesDelimiter: string;
	exported?: ExportResult;
};

export const DEFAULT_SETTINGS: Settings = {
	notesSectionDelimiter: DEFAULT_NOTES_SECTION_DELIMITER,
	notesDelimiter: DEFAULT_NOTES_DELIMITER,
};
