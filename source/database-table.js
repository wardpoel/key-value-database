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

		let tableKey = this.key();
		let tableIds = database.getItem(tableKey);
		if (tableIds) {
			if (process.env.NODE_ENV === 'development' && this.database.execute) {
				console.warn(`Table "${this.name}" already exists`);
			}
		} else {
			database.setItem(tableKey, []);
		}

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
		this.indexById = new Index(database, this, 'id');

		database.tables[tableName] = this;
	}

	/**
	 * @returns {string}
	 */
	key() {
		return `${this.database.prefix}${this.name}`;
	}

	/**
	 * @param {Id} id
	 * @returns {string}
	 */
	rowKey(id) {
		return this.indexById.key(id);
	}

	/**
	 * @param {Object} props
	 * @param {boolean} autoindex
	 * @returns {string|undefined}
	 */
	indexKey(props, autoindex = this.database.autoindex) {
		if (props == undefined) return this.key();

		let keys = Object.keys(props);
		if (keys.length === 0) return this.key();

		let index = this.database.findIndex(this.name, ...keys);
		if (index) {
			return index.key(props);
		} else {
			if (process.env.NODE_ENV === 'development') {
				let autoindexWarning;
				if (autoindex) {
					autoindexWarning = `An index will be created at runtime to improve lookup.`;
				} else {
					autoindexWarning = `Please create an index for these properties.`;
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

	/**
	 * @param {number} entropy
	 * @returns {Id}
	 */
	id(entropy = this.database.entropy) {
		let key = this.key();
		let ids = this.database.getItem(key) ?? [];
		let size = Math.ceil(Math.log2(entropy * Math.max(ids.length, 1)) / Math.log2(alphabet.length));

		let id;
		do {
			id = generateId(size);
		} while (ids.includes(id));

		return id;
	}

	/**
	 * @param {Id} id
	 * @returns {Object|undefined}
	 */
	find(id) {
		let key = this.rowKey(id);
		let row = this.database.getItem(key);

		return row;
	}

	/**
	 * @param {Object} [props]
	 * @param {boolean} autoindex
	 * @returns {Array<Id>}
	 */
	index(props, autoindex = this.database.autoindex) {
		let key = this.indexKey(props, autoindex);
		if (key) {
			return this.database.getItem(key) ?? [];
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
		return this.index(props, autoindex).length;
	}

	/**
	 * @param {Object|Id|undefined} [props]
	 * @param {boolean} autoindex
	 * @returns {Array<Object>|Object|undefined}
	 */
	select(props, autoindex = this.database.autoindex) {
		let key = this.indexKey(props, autoindex);
		if (key) {
			let ids = this.database.getItem(key);
			let rows = ids.map(this.find.bind(this));
			return rows;
		} else {
			let rows = this.select();
			let keys = Object.keys(props);
			let filter = rows.filter(item => keys.every(key => item[key] === props[key]));
			return filter;
		}
	}

	/**
	 * @param {Object} props
	 * @returns {Object}
	 */
	create(props) {
		let { id, ...other } = props;

		let rowId = id ?? this.id();
		let rowKey = this.indexById.key(rowId);

		if (id != undefined) {
			let row = this.database.getItem(rowKey);
			if (row) {
				throw new Error(`Id "${id}" already exists in table "${this.name}"`);
			}
		}

		let row = { id: rowId, ...other };

		let tableKey = this.key();
		let tableIds = this.database.getItem(tableKey);
		if (tableIds == undefined) {
			throw new Error(`Table "${this.name}" does not exists yet`);
		}

		this.database.setItem(rowKey, row);
		this.database.setItem(tableKey, [...tableIds, row.id]);

		let indexListeners = this.database.indexListeners.get(tableKey);
		if (indexListeners) {
			for (let listener of indexListeners) {
				this.database.rowListeners.add(rowKey, listener);
			}
		}

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

		let key = this.indexById.key(rowId);
		let oldRow = this.database.getItem(key);
		let newRow = { ...row, ...props };

		for (let index of this.indexes) {
			index.remove(oldRow);
			index.add(newRow);
		}

		this.database.setItem(key, newRow);

		return newRow;
	}

	/**
	 * @param {Object} row
	 * @returns {Object|Id}
	 */
	delete(row) {
		let rowId = typeof row === 'object' ? row.id : row;

		let tableKey = this.key();
		let tableIds = this.database.getItem(tableKey);
		let rowIndex = tableIds.indexOf(rowId);
		if (rowIndex !== -1) {
			this.database.setItem(tableKey, [...tableIds.slice(0, rowIndex), ...tableIds.slice(rowIndex + 1)]);

			let rowKey = this.indexById.key(rowId);
			let row = this.database.getItem(rowKey);
			if (row) {
				for (let index of this.indexes) {
					index.remove(row);
				}
			}

			this.database.removeItem(rowKey);

			return row;
		}
	}

	destroy() {
		let tableKey = this.key();
		let storageKeys = Object.keys(this.database.storage.value);

		for (let storageKey of storageKeys) {
			if (storageKey.startsWith(tableKey)) {
				this.database.removeItem(storageKey);
			}
		}

		delete this.database.tables[this.name];
	}
}
