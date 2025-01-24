import { App, Plugin, PluginSettingTab, Setting } from "obsidian";

export type Settings = {
	notesSectionDelimiter: string;
	notesDelimiter: string;
};

export const DEFAULT_SETTINGS: Settings = {
	notesSectionDelimiter: "#cards\n",
	notesDelimiter: "\n---\n",
};

export interface SettingsManager {
	getSetting<TKey extends keyof Settings>(key: TKey): Settings[TKey];
	setSetting<TKey extends keyof Settings>(
		key: TKey,
		value: Settings[TKey]
	): Promise<void>;
}

export default class SettingsTab extends PluginSettingTab {
	constructor(
		app: App,
		plugin: Plugin,
		private readonly _manager: SettingsManager
	) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Notes section delimiter")
			.setDesc("Delimiter representing the notes section")
			.addTextArea((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.notesSectionDelimiter)
					.setValue(this._manager.getSetting("notesSectionDelimiter"))
					.onChange((value) =>
						this._manager.setSetting("notesSectionDelimiter", value)
					)
			);

		new Setting(containerEl)
			.setName("Notes delimiter")
			.setDesc("Delimiter to separate notes back and front")
			.addTextArea((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.notesDelimiter)
					.setValue(this._manager.getSetting("notesDelimiter"))
					.onChange((value) =>
						this._manager.setSetting("notesDelimiter", value)
					)
			);
	}
}
