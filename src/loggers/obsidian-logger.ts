import { Notice } from "obsidian";
import Logger from "src/logger";

export default class ObsidianLogger implements Logger {
	constructor(private readonly _statusBarEle: HTMLElement) {}

	status(message: string): void {
		this._statusBarEle.setText(message);
	}

	info(message: string): void {
		this.notice(message);
	}

	error(err: Error): void {
		this.notice(err.message);
	}

	private notice(msg: string): void {
		new Notice(msg);
	}
}
