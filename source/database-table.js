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
	 * @returns {string}
	 */
	key() {
		return `${this.database.prefix}${this.name}`;
	}

	/**
	 * @param {number} entropy
	 * @returns {Id}
	 */
	id(entropy = this.database.entropy) {
		let key = this.key();
		let ids = this.database.storage.getItem(key) ?? [];
		let size = Math.ceil(Math.log2(entropy * Math.max(ids.length, 1)) / Math.log2(alphabet.length));

		let id;
		do {
			id = generateId(size);
		} while (ids.includes(id));

		return id;
	}

	/**
	 * @param {Object|undefined} [props]
	 * @param {boolean} autoindex
	 * @returns {Array<Id>}
	 */
	find(props, autoindex = this.database.autoindex) {
		if (props == undefined) {
			let key = this.key();
			let ids = this.database.storage.getItem(key) ?? [];
			return ids;
		} else {
			let keys = Object.keys(props);
			if (keys.length === 0) return this.find();

			let index = this.database.findIndex(this.name, ...keys);
			if (index == undefined) {
				if (process.env.NODE_ENV === 'development') {
					console.warn(`Finding "${this.name}" by ${enumerate(...keys)} can be slow without an index`);

					if (autoindex) {
						console.warn(`An index will be created at runtime to improve lookup`);
					} else {
						console.warn(`Please create an index for these properties`);
					}
				}

				if (autoindex) {
					index = this.database.addIndex(this.name, ...keys);
				} else {
					let tableRows = this.select();
					let selectedRows = tableRows.filter(item => keys.every(key => item[key] === props[key]));
					let selectedRowIds = selectedRows.map(row => row.id);
					return selectedRowIds;
				}
			}

			return index.find(props);
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
		if (typeof props === 'string' || typeof props === 'number') {
			let key = this.index.key(props);
			let row = this.database.storage.getItem(key);
			return row;
		} else {
			let ids = this.find(props, autoindex);
			if (ids == undefined) return [];

			let keys = ids.map(id => this.index.key(id));
			let rows = keys.map(key => this.database.storage.getItem(key));
			return rows;
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

		let tableKey = this.key();
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

		let tableKey = this.key();
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
		let tableKey = this.key();
		let storageKeys = Object.keys(this.database.storage.value);

		for (let storageKey of storageKeys) {
			if (storageKey.startsWith(tableKey)) {
				this.database.storage.removeItem(storageKey);
			}
		}

		delete this.database.tables[this.name];
	}
}
