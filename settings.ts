export type Settings = {
	notesSectionDelimiter: string;
	notesDelimiter: string;
};

export const DEFAULT_SETTINGS: Settings = {
	notesSectionDelimiter: "#cards\n",
	notesDelimiter: "\n---\n",
};
