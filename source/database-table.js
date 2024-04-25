import Index from './database-index.js';

import enumerate from './utilities/string/enumerate.js';
import capitalize from './utilities/string/capitalize.js';
import generateId, { alphabet } from './utilities/string/id.js';

/** @typedef {import('./database.js').Id} Id */
/** @typedef {import('./database.js').default} Database */

export default class Table {
	/**
	 * @param {Database} database
	 * @param {string} tableName
	 * @param {string} [entryName]
	 */
	constructor(database, tableName, entryName) {
		this.name = tableName;
		this.database = database;

		let tableKey = /** @type {string} */ (this.key());
		let tableIds = database.storage.getItem(tableKey);
		if (tableIds) throw new Error(`Table "${this.name}" already exists`);

		database.storage.setItem(tableKey, []);

		if (entryName) {
			database[`find${capitalize(tableName)}`] = database.find.bind(database, tableName);
			database[`count${capitalize(tableName)}`] = database.count.bind(database, tableName);
			database[`create${capitalize(entryName)}`] = database.create.bind(database, tableName);
			database[`select${capitalize(tableName)}`] = database.select.bind(database, tableName);
			database[`select${capitalize(entryName)}`] = database.select.bind(database, tableName);
			database[`update${capitalize(entryName)}`] = database.update.bind(database, tableName);
			database[`delete${capitalize(entryName)}`] = database.delete.bind(database, tableName);
		}

		/** @type {Array<Index>} */
		this.indexes = [];
		this.index = new Index(database, this, 'id');

		database.tables[tableName] = this;
	}

	/**
	 * @param {Id|Object} [props]
	 * @returns {string|undefined}
	 */
	key(props, autoindex = this.database.autoindex) {
		if (props == undefined) {
			return `${this.database.prefix}${this.name}`;
		} else if (typeof props === 'string' || typeof props === 'number') {
			return this.index.key(props);
		} else {
			let keys = Object.keys(props);
			if (keys.length === 0) return this.key();

			let index = this.database.findIndex(this.name, ...keys);
			if (index) {
				return index.key(props);
			} else {
				if (process.env.NODE_ENV === 'development') {
					let autoindexWarning;
					if (autoindex) {
						autoindexWarning = `An index will be created at runtime to improve lookup`;
					} else {
						autoindexWarning = `Please create an index for these properties`;
					}

					console.warn(
						`Finding "${this.name}" by ${enumerate(...keys)} can be slow without an index. ${autoindexWarning}`,
					);
				}

				if (autoindex) {
					let index = this.database.addIndex(this.name, ...keys);
					let indexKey = index.key(props);
					return indexKey;
				}
			}
		}
	}

	/**
	 * @param {number} entropy
	 * @returns {Id}
	 */
	id(entropy = this.database.entropy) {
		let key = /** @type {string} */ (this.key());
		let ids = this.database.storage.getItem(key) ?? [];
		let size = Math.ceil(Math.log2(entropy * Math.max(ids.length, 1)) / Math.log2(alphabet.length));

		let id;
		do {
			id = generateId(size);
		} while (ids.includes(id));

		return id;
	}

	/**
	 * @param {Object} [props]
	 * @param {boolean} autoindex
	 * @returns {Array<Id>}
	 */
	find(props, autoindex = this.database.autoindex) {
		let key = this.key(props, autoindex);
		if (key) {
			return this.database.storage.getItem(key);
		} else {
			let rows = this.select();
			let keys = Object.keys(props);
			let selection = rows.filter(item => keys.every(key => item[key] === props[key]));
			let selectionIds = selection.map(row => row.id);
			return selectionIds;
		}
	}

	/**
	 * @param {Object|undefined} [props]
	 * @param {boolean} autoindex
	 * @returns {number}
	 */
	count(props, autoindex = this.database.autoindex) {
		return this.find(props, autoindex)?.length ?? 0;
	}

	/**
	 * @param {Object|Id|undefined} [props]
	 * @param {boolean} autoindex
	 * @returns {Array<Object>|Object|undefined}
	 */
	select(props, autoindex = this.database.autoindex) {
		let key = this.key(props, autoindex);
		if (key) {
			let value = this.database.storage.getItem(key);
			if (value instanceof Array) {
				value = value.map(id => this.database.storage.getItem(this.index.key(id)));
			}
			return value;
		}
	}

	/**
	 * @param {Object} props
	 * @returns {Object}
	 */
	create(props) {
		let { id, ...other } = props;

		let rowId = id ?? this.id();
		let rowKey = this.index.key(rowId);

		if (id != undefined) {
			let row = this.database.storage.getItem(rowKey);
			if (row) {
				throw new Error(`Id "${id}" already exists in table "${this.name}"`);
			}
		}

		let row = { id: rowId, ...other };

		let tableKey = /** @type {string} */ (this.key());
		let tableIds = this.database.storage.getItem(tableKey);
		if (tableIds == undefined) {
			throw new Error(`Table "${this.name}" does not exists yet`);
		}

		this.database.storage.setItem(rowKey, row);
		this.database.storage.setItem(tableKey, [...tableIds, row.id]);

		for (let index of this.indexes) {
			index.add(row);
		}

		return row;
	}

	/**
	 * @param {Object} row
	 * @param {Object} [props]
	 * @returns {Object}
	 */
	update(row, props = {}) {
		let rowId = typeof row === 'object' ? row.id : row;

		let key = this.index.key(rowId);
		let oldRow = this.database.storage.getItem(key);
		let newRow = { ...row, ...props };

		for (let index of this.indexes) {
			index.remove(oldRow);
			index.add(newRow);
		}

		this.database.storage.setItem(key, newRow);

		return newRow;
	}

	/**
	 * @param {Object} row
	 * @returns {Object|Id}
	 */
	delete(row) {
		let rowId = typeof row === 'object' ? row.id : row;

		let tableKey = /** @type {string} */ (this.key());
		let tableIds = this.database.storage.getItem(tableKey);
		let rowIndex = tableIds.indexOf(rowId);
		if (rowIndex !== -1) {
			this.database.storage.setItem(tableKey, [...tableIds.slice(0, rowIndex), ...tableIds.slice(rowIndex + 1)]);

			let rowKey = this.index.key(rowId);
			let row = this.database.storage.getItem(rowKey);
			if (row) {
				for (let index of this.indexes) {
					index.remove(row);
				}
			}

			this.database.storage.removeItem(rowKey);

			return row;
		}
	}

	destroy() {
		let tableKey = /** @type {string} */ (this.key());
		let storageKeys = Object.keys(this.database.storage.value);

		for (let storageKey of storageKeys) {
			if (storageKey.startsWith(tableKey)) {
				this.database.storage.removeItem(storageKey);
			}
		}

		delete this.database.tables[this.name];
	}
}
