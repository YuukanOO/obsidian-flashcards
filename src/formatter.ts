export default interface Formatter {
	format(content: string): Promise<string>;
}
