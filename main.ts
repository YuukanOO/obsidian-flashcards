import { Plugin } from "obsidian";
import MarkdownToHtmlFormatter from "src/formatters/markdown-html-formatter";
import Logger from "src/logger";
import ObsidianLogger from "src/loggers/obsidian-logger";
import MarkdownParser from "src/parsers/markdown-parser";
import AnkiConnectDecks from "src/providers/anki-connect";
import ObsidianVaultDecks from "src/providers/obsidian-vault";
import CachedSlugifier from "src/slugifiers/cached-slugifier";
import Synchronizer, { SyncFingerprint, SyncResult } from "src/synchronizer";
import SettingsTab, {
	DEFAULT_SETTINGS,
	Settings,
	SettingsManager,
} from "./settings";

type SavedData = {
	fingerprint: SyncFingerprint;
};

export default class AnkiPlugin extends Plugin implements SettingsManager {
	private _settings: Settings & SavedData;
	private _synchronizer: Synchronizer;
	private _logger: Logger;

	async onload() {
		await this.loadSettings();
		this.prepareServices();

		this.addCommand({
			id: "yuukanoo-anki-export-questions",
			name: "Export notes to Anki",
			callback: () => this.export(),
		});

		this.addCommand({
			id: "yuukanoo-anki-export-questions-force",
			name: "Export notes to Anki (force)",
			callback: () => this.export(true),
		});

		// // This creates an icon in the left ribbon.
		// const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
		// 	// Called when the user clicks the icon.
		// 	new Notice('This is a notice!');
		// });
		// // Perform additional things with the ribbon
		// ribbonIconEl.addClass('my-plugin-ribbon-class');

		// // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		//statusBarItemEl.setText("Status Bar Text");

		// // This adds a simple command that can be triggered anywhere
		// this.addCommand({
		// 	id: 'open-sample-modal-simple',
		// 	name: 'Open sample modal (simple)',
		// 	callback: () => {
		// 		new SampleModal(this.app).open();
		// 	}
		// });
		// // This adds an editor command that can perform some operation on the current editor instance
		// this.addCommand({
		// 	id: 'sample-editor-command',
		// 	name: 'Sample editor command',
		// 	editorCallback: (editor: Editor, view: MarkdownView) => {
		// 		console.log(editor.getSelection());
		// 		editor.replaceSelection('Sample Editor Command');
		// 	}
		// });
		// // This adds a complex command that can check whether the current state of the app allows execution of the command
		// this.addCommand({
		// 	id: 'open-sample-modal-complex',
		// 	name: 'Open sample modal (complex)',
		// 	checkCallback: (checking: boolean) => {
		// 		// Conditions to check
		// 		const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
		// 		if (markdownView) {
		// 			// If checking is true, we're simply "checking" if the command can be run.
		// 			// If checking is false, then we want to actually perform the operation.
		// 			if (!checking) {
		// 				new SampleModal(this.app).open();
		// 			}

		// 			// This command will only show up in Command Palette when the check function returns true
		// 			return true;
		// 		}
		// 	}
		// });

		// // This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SettingsTab(this.app, this, this));

		// // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// // Using this function will automatically remove the event listener when this plugin is disabled.
		// this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
		// 	console.log('click', evt);
		// });

		// // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		// this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	private async export(force?: boolean) {
		try {
			const result = await this._synchronizer.run(
				force ? undefined : this._settings.fingerprint
			);

			this.ended(result);
			this._settings.fingerprint = result.fingerprint;
			await this.saveSettings();
		} catch (e) {
			this.ended(e);
		}
	}

	private ended(result: SyncResult): void;
	private ended(err: Error): void;
	private ended(result: SyncResult | Error): void {
		this._logger.status("");

		if (result instanceof Error) {
			this._logger.error(result);
			return;
		}

		this._logger.info(
			`Synced ${result.decksCount} decks in ${result.duration}ms`
		);
	}

	onunload() {}

	private prepareServices() {
		this._logger = new ObsidianLogger(this.addStatusBarItem());
		this._synchronizer = new Synchronizer(
			new ObsidianVaultDecks(
				this.app.vault,
				new MarkdownParser(this._settings)
			),
			new AnkiConnectDecks(
				new CachedSlugifier(),
				new MarkdownToHtmlFormatter(this.app),
				this._logger
			)
		);
	}

	private async loadSettings() {
		this._settings = {
			...DEFAULT_SETTINGS,
			...(await this.loadData()),
		};
	}

	private async saveSettings() {
		await this.saveData(this._settings);
	}

	getSetting<TKey extends keyof Settings>(key: TKey): Settings[TKey] {
		return this._settings[key];
	}

	setSetting<TKey extends keyof Settings>(
		key: TKey,
		value: Settings[TKey]
	): Promise<void> {
		this._settings[key] = value;
		return this.saveSettings();
	}
}
