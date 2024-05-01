export default class Listeners {
	constructor() {
		/** @type {Object<string,Array<() => void>>} */
		this.listeners = {};
	}

	/**
	 * @param {string} key
	 * @returns {Array<()=>void>}
	 */
	get(key) {
		return this.listeners[key] ?? [];
	}

	/**
	 * @param {string} key
	 * @param {() => void} callback
	 * @returns
	 */
	add(key, callback) {
		let listeners = this.listeners[key];
		if (listeners) {
			let subscribed = listeners.includes(callback);
			if (subscribed === false) {
				listeners.push(callback);
			}
		} else {
			this.listeners[key] = [callback];
		}

		return this.remove.bind(this, key, callback);
	}

	/**
	 * @param {string} key
	 * @param {() => void} callback
	 */
	remove(key, callback) {
		let listeners = this.listeners[key];
		if (listeners?.includes(callback)) {
			if (listeners.length === 1) {
				delete this.listeners[key];
			} else {
				this.listeners[key] = listeners.filter(listener => listener !== callback);
			}
		}
	}

	/**
	 * @param {string} [key]
	 */
	notify(key) {
		if (key) {
			let listeners = this.listeners[key];
			if (listeners) {
				for (let listener of listeners) {
					listener();
				}
			}
		} else {
			for (let key in this.listeners) {
				let listeners = this.listeners[key];
				if (listeners) {
					for (let listener of listeners) {
						listener();
					}
				}
			}
		}
	}

	clear() {
		for (let key in this.listeners) {
			delete this.listeners[key];
		}
	}
}
