import Table from './database-table.js';
import Index from './database-index.js';
import Listeners from './database-listeners.js';
import JSONStorage from './storage/json.js';

import enumerate from './utilities/string/enumerate.js';

/** @typedef {import('./types.js').Id} Id */
/** @typedef {import('./types.js').Props} Props */
/** @typedef {import('./types.js').Resource} Resource */
/** @typedef {import('./types.js').Migration} Migration */

export default class Database {
	/**
	 * @param {Storage} storage
	 * @param {{ prefix?: string, migrations?: Array<Migration>,autoindex?: boolean, entropy?: number}} [options]
	 */
	constructor(storage, options) {
		let prefix = options?.prefix ?? '';
		let entropy = options?.entropy ?? 1000000;
		let autoindex = options?.autoindex ?? false;
		let migrations = options?.migrations ?? [];

		/** @type {{ [key:string]: Table }} */
		this.tables = {};

		this.prefix = prefix;
		this.entropy = entropy;
		this.autoindex = autoindex;
		this.migrations = migrations;

		this.storage = new JSONStorage(storage);
		this.rowListeners = new Listeners();
		this.indexListeners = new Listeners();

		this.migrate();

		/** @type {(event:StorageEvent) => void} */
		this.storageEventHandler = event => {
			let isSameStorage = this.storage.value === event.storageArea;
			if (isSameStorage === false) return;

			let storageCleared = event.key === null;
			if (storageCleared) {
				this.migrate();

				this.rowListeners.notify();
				this.indexListeners.notify();
			} else {
				this.rowListeners.notify(event.key);
				this.indexListeners.notify(event.key);
			}
		};

		if (typeof window !== 'undefined') {
			window.addEventListener('storage', this.storageEventHandler);
		}
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
	 * @returns {Table|undefined}
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
		} else {
			table.destroy();
		}
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
	 * @returns {Index|undefined}
	 */
	findIndex(tableName, ...indexKeys) {
		let indexes = this.findTable(tableName)?.indexes;
		if (indexes) {
			return indexes.find(index => index.keys.length === indexKeys.length && index.keys.every(key => indexKeys.includes(key)));
		}
	}

	/**
	 * @param {string} tableName
	 * @param  {Array<string>} indexKeys
	 * @returns
	 */
	assertIndex(tableName, ...indexKeys) {
		let index = this.findIndex(tableName, ...indexKeys);
		if (index == undefined) throw new Error(`Table "${tableName}" does not have an index for ${enumerate(...indexKeys)}`);
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
		return this.storage.getItem(`${this.prefix}#version`);
	}

	set version(version) {
		this.storage.setItem(`${this.prefix}#version`, version);
	}

	migrate() {
		let version = this.version ?? 0;
		for (let index = version; index < this.migrations.length; index++) {
			let backup = Object.entries(this.storage);
			let migration = this.migrations[index];
			try {
				migration.call(this, this);

				this.version = index + 1;
			} catch (error) {
				this.storage.clear();
				for (let [key, value] of backup) {
					this.storage.setItem(key, value);
				}
				throw error;
			}
		}
	}

	close() {
		window?.removeEventListener('storage', this.storageEventHandler);
	}

	// Table functions

	/**
	 * @param {string} tableName
	 * @param {Props} [props]
	 * @param {boolean} [autoindex]
	 * @returns {Array<Id>}
	 */
	selectIds(tableName, props, autoindex = this.autoindex) {
		return this.assertTable(tableName).selectIds(props, autoindex);
	}

	/**
	 * @param {string} tableName
	 * @param {Id} id
	 * @returns {Resource|undefined}
	 */
	selectById(tableName, id) {
		return this.assertTable(tableName).selectById(id);
	}

	/**
	 * @param {string} tableName
	 * @param {Props} [props]
	 * @param {boolean} [autoindex]
	 * @returns {number}
	 */
	count(tableName, props, autoindex = this.autoindex) {
		return this.assertTable(tableName).count(props, autoindex);
	}

	/**
	 * @param {string} tableName
	 * @param {Props} [props]
	 * @param {boolean} [autoindex]
	 * @returns {Array<Resource>}
	 */
	select(tableName, props, autoindex = this.autoindex) {
		return this.assertTable(tableName).select(props, autoindex);
	}

	/**
	 * @param {string} tableName
	 * @param {Props} props
	 * @returns {Resource|undefined}
	 */
	create(tableName, props) {
		return this.assertTable(tableName).create(props);
	}

	/**
	 * @param {string} tableName
	 * @param {Resource|Id} row
	 * @param {Props} [props]
	 * @returns {Resource|undefined}
	 */
	update(tableName, row, props = {}) {
		return this.assertTable(tableName).update(row, props);
	}

	/**
	 * @param {string} tableName
	 * @param {Resource|Id} row
	 * @param {Props} [props]
	 * @returns {Resource|undefined}
	 */
	replace(tableName, row, props = {}) {
		return this.assertTable(tableName).replace(row, props);
	}

	/**
	 * @param {string} tableName
	 * @param {Resource|Id} row
	 * @returns {Resource|undefined}
	 */
	delete(tableName, row) {
		return this.assertTable(tableName).delete(row);
	}

	/**
	 * @param {string} tableName
	 */
	clear(tableName) {
		return this.assertTable(tableName).clear();
	}

	// Storage functions

	/**
	 * @param {string} key
	 * @returns {any}
	 */
	getItem(key) {
		return this.storage.getItem(key);
	}

	/**
	 * @param {string} key
	 * @param {any} value
	 */
	setItem(key, value) {
		this.storage.setItem(key, value);
		this.rowListeners.notify(key);
	}

	/**
	 * @param {string} key
	 */
	removeItem(key) {
		this.storage.removeItem(key);
		this.rowListeners.notify(key);
	}

	// Subscription functions

	/**
	 * @param {string} tableName
	 * @param {Id} id
	 * @param {() => void} callback
	 * @returns {() => void}
	 */
	subscribeToRow(tableName, id, callback) {
		let table = this.assertTable(tableName);
		let rowKey = table.rowKey(id);
		let unsubscribe = this.rowListeners.add(rowKey, callback);
		return unsubscribe;
	}

	/**
	 * @param {string} tableName
	 * @param {() => void|Object} arg1
	 * @param {() => void} [arg2]
	 * @returns {() => void}
	 */
	subscribeToIndex(tableName, arg1, arg2) {
		let [props, callback] = arg2 == undefined ? [undefined, arg1] : [arg1, arg2];

		let table = this.assertTable(tableName);
		let indexKey = table.indexKey(props);
		if (indexKey == undefined) throw new Error('Could not find index key');
		let unsubscribe = this.rowListeners.add(indexKey, callback);
		return unsubscribe;
	}

	/**
	 * @param {string} tableName
	 * @param {() => void|Object} arg1
	 * @param {() => void} [arg2]
	 * @returns {() => void}
	 */
	subscribeToRows(tableName, arg1, arg2) {
		let [props, callback] = arg2 == undefined ? [undefined, arg1] : [arg1, arg2];

		let table = this.assertTable(tableName);
		let indexKey = table.indexKey(props);
		if (indexKey == undefined) throw new Error('Could not find index key');

		let indexIds = this.storage.getItem(indexKey) ?? [];
		for (let id of indexIds) {
			this.rowListeners.add(table.rowKey(id), callback);
		}

		this.rowListeners.add(indexKey, callback);
		this.indexListeners.add(indexKey, callback);

		return () => {
			let indexIds = this.storage.getItem(indexKey) ?? [];
			for (let id of indexIds) {
				this.rowListeners.remove(table.rowKey(id), callback);
			}

			this.rowListeners.remove(indexKey, callback);
			this.indexListeners.remove(indexKey, callback);
		};
	}
}
