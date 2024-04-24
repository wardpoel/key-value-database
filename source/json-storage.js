export default class JSONStorage {
	/**
	 * @param {Storage} value
	 */
	constructor(value) {
		this.value = value;
	}

	/**
	 * @param {number} index
	 * @returns {string|null}
	 */
	key(index) {
		return this.value.key(index);
	}

	/**
	 * @param {string} key
	 * @returns {Object|undefined}
	 */
	getItem(key) {
		let value = this.value.getItem(key);
		if (value) {
			return JSON.parse(value);
		}
	}

	/**
	 * @param {string} key
	 * @param {Object} value
	 */
	setItem(key, value) {
		this.value.setItem(key, JSON.stringify(value));
	}

	/**
	 * @param {string} key
	 */
	removeItem(key) {
		this.value.removeItem(key);
	}

	clear() {
		this.value.clear();
	}

	/**
	 * @returns {number}
	 */
	get length() {
		return this.value.length;
	}
}
