import Slugifier from "src/slugifier";

/**
 * Slugify strings using a basic conversion methods and cache the result across calls.
 */
export default class CachedSlugifier implements Slugifier {
	private readonly _cache: Map<string, string> = new Map();

	slugify(values: string[]): string[];
	slugify(value: string): string;
	slugify(value: string | string[]): string | string[] {
		if (Array.isArray(value)) return value.map(this.getOrCreate.bind(this));

		return this.getOrCreate(value);
	}

	private getOrCreate(value: string): string {
		const cached = this._cache.get(value);

		if (cached) return cached;

		const slug = value
			.normalize("NFKD") // split accented characters into their base characters and diacritical marks
			.replace(/[\u0300-\u036f]/g, "") // remove all the accents, which happen to be all in the \u03xx UNICODE block.
			.trim() // trim leading or trailing whitespace
			.toLowerCase() // convert to lowercase
			.replace(/\/+|\\+/g, "-") // replace slashes and backslashes with hyphens
			.replace(/[^a-z0-9 -]/g, "") // remove non-alphanumeric characters
			.replace(/\s+/g, "-") // replace spaces with hyphens
			.replace(/-+/g, "-"); // remove consecutive hyphens

		this._cache.set(value, slug);

		return slug;
	}
}
