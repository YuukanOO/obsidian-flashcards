import { App, Component, MarkdownRenderer } from "obsidian";
import Formatter from "src/formatter";

export default class MarkdownToHtmlFormatter implements Formatter {
	constructor(private readonly _app: App) {}

	async format(content: string): Promise<string> {
		const div = createDiv();
		const comp = new Component();
		await MarkdownRenderer.render(this._app, content, div, "", comp);
		return div.innerHTML;
	}
}
