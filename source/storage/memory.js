export default class MemoryStorage {
	constructor(storage) {
		this.value = Object.create(null);

		if (storage) {
			for (let index = 0; index < storage.length; index++) {
				let key = storage.key(index);
				let value = storage.getItem(key);

				this.value[key] = value;
			}
		}
	}

	/**
	 * @param {number} index
	 * @returns {string|null}
	 */
	key(index) {
		return Object.keys(this.value)[index];
	}

	/**
	 * @param {string} key
	 * @returns {string|undefined}
	 */
	getItem(key) {
		return this.value[key];
	}

	/**
	 * @param {string} key
	 * @param {string} value
	 */
	setItem(key, value) {
		this.value[key] = value;
	}

	/**
	 * @param {string} key
	 */
	removeItem(key) {
		delete this.value[key];
	}

	clear() {
		this.value = Object.create(null);
	}

	/**
	 * @returns {number}
	 */
	get length() {
		return Object.keys(this.value).length;
	}
}
