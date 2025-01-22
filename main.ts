import { App, Plugin, PluginSettingTab, Setting } from "obsidian";
import Exporter from "src/export";
import MarkdownToHtmlFormatter from "src/formatters/markdown-html-formatter";
import MarkdownParser from "src/parsers/markdown-parser";
import AnkiConnectProvider from "src/providers/anki-connect";
import ObsidianVaultProvider from "src/providers/obsidian-vault";
import CachedSlugifier from "src/slugifiers/cached-slugifier";
import { DEFAULT_SETTINGS, Settings } from "./settings";

export default class AnkiPlugin extends Plugin {
	settings: Settings;
	exporter: Exporter;

	async onload() {
		await this.loadSettings();

		this.exporter = new Exporter(
			new ObsidianVaultProvider(
				this.app.vault,
				new MarkdownParser(this.settings)
			),
			new AnkiConnectProvider(
				new CachedSlugifier(),
				undefined,
				new MarkdownToHtmlFormatter(this.app)
			)
		);

		this.addCommand({
			id: "yuukanoo-anki-export-questions",
			name: "Export questions to Anki",
			callback: async () => {
				const result = await this.exporter.run(this.settings.exported);

				this.settings.exported = result;
				await this.saveSettings();
			},
		});

		// // This creates an icon in the left ribbon.
		// const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
		// 	// Called when the user clicks the icon.
		// 	new Notice('This is a notice!');
		// });
		// // Perform additional things with the ribbon
		// ribbonIconEl.addClass('my-plugin-ribbon-class');

		// // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		// const statusBarItemEl = this.addStatusBarItem();
		// statusBarItemEl.setText('Status Bar Text');

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
		this.addSettingTab(new SettingsTab(this.app, this));

		// // If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// // Using this function will automatically remove the event listener when this plugin is disabled.
		// this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
		// 	console.log('click', evt);
		// });

		// // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		// this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {}

	async loadSettings() {
		this.settings = {
			...DEFAULT_SETTINGS,
			...(await this.loadData()),
		};
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SettingsTab extends PluginSettingTab {
	plugin: AnkiPlugin;

	constructor(app: App, plugin: AnkiPlugin) {
		super(app, plugin);
		this.plugin = plugin;
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
					.setValue(this.plugin.settings.notesSectionDelimiter)
					.onChange(async (value) => {
						this.plugin.settings.notesSectionDelimiter = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("Notes delimiter")
			.setDesc("Delimiter to separate notes back and front")
			.addTextArea((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.notesDelimiter)
					.setValue(this.plugin.settings.notesDelimiter)
					.onChange(async (value) => {
						this.plugin.settings.notesDelimiter = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
