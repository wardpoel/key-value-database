import Table from './database-table.js';
import Index from './database-index.js';
import JSONStorage from './json-storage.js';

import enumerate from './utilities/string/enumerate.js';

/** @typedef {string|number} Id */

export default class Database {
	/**
	 * @param {Storage} storage
	 * @param {{ prefix?: string, migrations?: Array<function>, autoindex?: boolean, entropy?: number }} [options]
	 */
	constructor(storage, options) {
		let { prefix = '', migrations = [], autoindex = false, entropy = 1000000 } = options ?? {};

		this.prefix = prefix;
		this.storage = new JSONStorage(storage);

		/** @type {Object<string,Array<function>>} */
		this.listeners = {};

		let version = this.version ?? 0;
		let migrate = migrations.slice(version);

		for (let index = 0; index < migrate.length; index++) {
			let backup = Object.entries(storage);
			try {
				migrate[index].call(this, this);
				this.version = version + index;
			} catch {
				for (let index = 0; index < this.storage.length; index++) {
					let key = storage.key(index);
					if (key) {
						let value = backup[key];
						if (value) {
							storage.setItem(key, value);
						} else {
							storage.removeItem(key);
						}
					}
				}
			}
		}

		/** @type {Object<string,Table>} */
		this.tables = {};
		this.entropy = entropy;
		this.autoindex = autoindex;
	}

	/**
	 * @param {string} tableName
	 * @param {string} [entryName]
	 * @returns {Table}
	 */
	addTable(tableName, entryName) {
		return new Table(this, tableName, entryName);
	}

	/**
	 * @param {string} tableName
	 * @returns {Table}
	 */
	findTable(tableName) {
		return this.tables[tableName];
	}

	/**
	 * @param {string} tableName
	 * @returns {Table}
	 */
	assertTable(tableName) {
		let table = this.findTable(tableName);
		if (table == undefined) throw new Error(`Table "${tableName}" does not exist`);
		return table;
	}

	/**
	 * @param {string} tableName
	 */
	removeTable(tableName) {
		let table = this.findTable(tableName);
		if (table == undefined) {
			if (process.env.NODE_ENV === 'development') {
				console.warn(`Table "${tableName}" does not exist`);
			}
		}

		table.destroy();
	}

	/**
	 * @param {string} tableName
	 * @param  {Array<string|[string,function]>} attributes
	 * @returns {Index}
	 */
	addIndex(tableName, ...attributes) {
		let table = this.assertTable(tableName);
		let index = new Index(this, table, ...attributes);
		return index;
	}

	/**
	 * @param {string} tableName
	 * @param  {Array<string>} indexKeys
	 * @returns
	 */
	findIndex(tableName, ...indexKeys) {
		let indexes = this.findTable(tableName)?.indexes;
		if (indexes) {
			return indexes.find(
				index => index.keys.length === indexKeys.length && index.keys.every(key => indexKeys.includes(key)),
			);
		}
	}

	/**
	 * @param {string} tableName
	 * @param  {Array<string>} indexKeys
	 * @returns
	 */
	assertIndex(tableName, ...indexKeys) {
		let index = this.findIndex(tableName, ...indexKeys);
		if (index == undefined)
			throw new Error(`Table "${tableName}" does not have an index for ${enumerate(...indexKeys)}`);
		return index;
	}

	/**
	 * @param {string} tableName
	 * @param  {Array<string>} attributes
	 */
	removeIndex(tableName, ...attributes) {
		let index = this.findIndex(tableName, ...attributes);
		if (index == undefined) {
			if (process.env.NODE_ENV === 'development') {
				console.warn(`Index on ${enumerate(...attributes)} does not exist for table "${tableName}"`);
			}
		} else {
			index.destroy();
		}
	}

	get version() {
		return this.storage.getItem(`${this.prefix}.version`);
	}

	set version(version) {
		this.storage.setItem(`${this.prefix}.version`, version);
	}

	/**
	 * @param {string} tableName
	 * @param {Object} props
	 * @param {boolean} autoindex
	 * @returns {Array<Id>}
	 */
	find(tableName, props, autoindex = this.autoindex) {
		return this.assertTable(tableName).find(props, autoindex);
	}

	/**
	 * @param {string} tableName
	 * @param {Object} [props]
	 * @param {boolean} [autoindex]
	 * @returns {number}
	 */
	count(tableName, props, autoindex = this.autoindex) {
		return this.assertTable(tableName).count(props, autoindex);
	}

	/**
	 * @param {string} tableName
	 * @param {Object|Id} [props]
	 * @param {boolean} [autoindex]
	 * @returns {Array<Object>|Object}
	 */
	select(tableName, props, autoindex = this.autoindex) {
		return this.assertTable(tableName).select(props, autoindex);
	}

	/**
	 * @param {string} tableName
	 * @param {Object} props
	 * @returns {Object}
	 */
	create(tableName, props) {
		return this.assertTable(tableName).create(props);
	}

	/**
	 * @param {string} tableName
	 * @param {Object} row
	 * @param {Object} [props]
	 * @returns {Object}
	 */
	update(tableName, row, props = {}) {
		return this.assertTable(tableName).update(row, props);
	}

	/**
	 * @param {string} tableName
	 * @param {Object|Id} row
	 * @returns {Object}
	 */
	delete(tableName, row) {
		return this.assertTable(tableName).delete(row);
	}

	subscribe(key, callback) {
		let listeners = this.listeners[key];
		if (listeners) {
			listeners.push(callback);
		} else {
			this.listeners[key] = [callback];
		}

		return this.unsubscribe.bind(this, key, callback);
	}

	unsubscribe(key, callback) {
		let listeners = this.listeners[key];
		if (listeners?.includes(callback)) {
			if (listeners.length === 1) {
				delete this.listeners[key];
			} else {
				this.listeners[key] = listeners.filter(listener => listener !== callback);
			}
		}
	}
}
