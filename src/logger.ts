export default interface Logger {
	status(message: string): void;
	info(message: string): void;
	error(err: Error): void;
}
