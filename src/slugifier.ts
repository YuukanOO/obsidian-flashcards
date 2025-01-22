/**
 * Convert strings to their slug equivalent.
 */
export default interface Slugifier {
	slugify(values: string[]): string[];
	slugify(value: string): string;
}
