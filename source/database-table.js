import enumerate from './utilities/string/enumerate.js';
import capitalize from './utilities/string/capitalize.js';
import generateId, { alphabet } from './utilities/string/id.js';

/** @typedef {import('./types.js').Id} Id */
/** @typedef {import('./types.js').Props} Props */
/** @typedef {import('./types.js').Index} Index */
/** @typedef {import('./types.js').Database} Database */
/** @typedef {import('./types.js').Resource} Resource */

export default class Table {
	/**
	 * @param {Database} database
	 * @param {string} tableName
	 * @param {string} [entryName]
	 */
	constructor(database, tableName, entryName) {
		this.name = tableName;
		/** @type {Array<Index>} */
		this.indexes = [];
		this.database = database;

		if (entryName) {
			// @ts-ignore
			database[`select${capitalize(entryName)}Ids`] = database.selectIds.bind(database, tableName);
			// @ts-ignore
			database[`select${capitalize(entryName)}ById`] = database.selectById.bind(database, tableName);
			// @ts-ignore
			database[`select${capitalize(tableName)}`] = database.select.bind(database, tableName);
			// @ts-ignore
			database[`count${capitalize(tableName)}`] = database.count.bind(database, tableName);
			// @ts-ignore
			database[`create${capitalize(entryName)}`] = database.create.bind(database, tableName);
			// @ts-ignore
			database[`update${capitalize(entryName)}`] = database.update.bind(database, tableName);
			// @ts-ignore
			database[`replace${capitalize(entryName)}`] = database.replace.bind(database, tableName);
			// @ts-ignore
			database[`delete${capitalize(entryName)}`] = database.delete.bind(database, tableName);
		}

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
		return `${this.key()}[id=${id}]`;
	}

	/**
	 * @param {Props|undefined} props
	 * @param {boolean} autoindex
	 * @returns {string|undefined}
	 */
	indexKey(props, autoindex = this.database.autoindex) {
		if (props == undefined) return this.key();

		let keys = Object.keys(props);
		if (keys.length === 0) return this.key();

		let index = this.indexes.find(index => index.keys.length === keys.length && index.keys.every(key => keys.includes(key)));
		if (index) {
			return index.key(props);
		} else if (keys.includes('id') === false) {
			if (process.env.NODE_ENV === 'development') {
				let autoindexWarning;
				if (autoindex) {
					autoindexWarning = `An index will be created at runtime to improve lookup.`;
				} else {
					autoindexWarning = `Please create an index for these properties.`;
				}

				console.warn(`Finding "${this.name}" by ${enumerate(...keys)} can be slow without an index. ${autoindexWarning}`);
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
		if (ids instanceof Array === false) throw new Error('Expected table ids to be an array');

		let size = Math.ceil(Math.log2(entropy * Math.max(ids.length, 1)) / Math.log2(alphabet.length));

		let id;
		do {
			id = generateId(size);
		} while (ids.includes(id));

		return id;
	}

	/**
	 * @param {Props} [props]
	 * @param {boolean} autoindex
	 * @returns {Array<Id>}
	 */
	selectIds(props, autoindex = this.database.autoindex) {
		let key = this.indexKey(props, autoindex);
		if (key) {
			let ids = this.database.getItem(key) ?? [];
			if (ids instanceof Array === false) throw new Error('Expected index ids to be an array');
			return ids;
		} else {
			if (props == undefined) throw new Error(`Expected props to not be undefined`);

			let rows = this.select();
			let keys = Object.keys(props);
			let selection = rows.filter(item => keys.every(key => item[key] === props[key]));
			let selectionIds = selection.map(row => row.id);
			return selectionIds;
		}
	}

	/**
	 * @param {Id} id
	 * @returns {Resource|undefined}
	 */
	selectById(id) {
		let key = this.rowKey(id);
		let row = this.database.getItem(key);

		return row;
	}

	/**
	 * @param {Object|undefined} [props]
	 * @param {boolean} autoindex
	 * @returns {number}
	 */
	count(props, autoindex = this.database.autoindex) {
		return this.selectIds(props, autoindex).length;
	}

	/**
	 * @param {Props} [props]
	 * @param {boolean} autoindex
	 * @returns {Array<Resource>}
	 */
	select(props, autoindex = this.database.autoindex) {
		if (props?.id == undefined) {
			let key = this.indexKey(props, autoindex);
			if (key) {
				let ids = this.database.getItem(key) ?? [];
				if (ids instanceof Array === false) throw new Error('Expected index to be an array');

				let rows = ids.map(this.selectById.bind(this));
				let filtered = rows.filter(/** @type {<T>(row: T | undefined) => row is T} */ row => row !== undefined);
				return filtered;
			} else {
				let rows = this.select();
				if (props) {
					let keys = Object.keys(props);
					let filter = rows.filter(item => keys.every(key => item[key] === props[key]));
					return filter;
				} else {
					return rows;
				}
			}
		} else {
			let key = this.rowKey(props.id);
			let row = this.database.getItem(key);
			let keys = Object.keys(props);
			let filtered = keys.every(key => row[key] === props[key]);
			if (filtered) {
				return [row];
			} else {
				return [];
			}
		}
	}

	/**
	 * @param {Props} props
	 * @returns {Resource}
	 */
	create(props) {
		let { id, ...other } = props;

		let rowId = id ?? this.id();
		let rowKey = this.rowKey(rowId);

		if (id != undefined) {
			let row = this.database.getItem(rowKey);
			if (row) {
				throw new Error(`Id "${id}" already exists in table "${this.name}"`);
			}
		}

		let row = { id: rowId, ...other };

		let tableKey = this.key();
		let tableIds = this.database.getItem(tableKey) ?? [];
		if (tableIds instanceof Array === false) throw Error('Expected table ids to be an array');
		let filteredIds = tableIds.filter(id => id !== row.id);

		this.database.setItem(rowKey, row);
		this.database.setItem(tableKey, [...filteredIds, row.id]);

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
	 * @param {Id|Resource} row
	 * @param {Props} [props]
	 * @returns {Resource}
	 */
	update(row, props = {}) {
		let rowId = typeof row === 'object' ? row.id : row;
		let rowKey = this.rowKey(rowId);
		let rowOld = this.database.getItem(rowKey);
		if (rowOld == undefined) {
			throw new Error(`Can not update row with id "${rowId}" as it does not exist`);
		}

		let rowNew = { ...rowOld, ...props };

		for (let index of this.indexes) {
			index.remove(rowOld);
			index.add(rowNew);
		}

		this.database.setItem(rowKey, rowNew);

		return rowNew;
	}

	/**
	 * @param {Id|Resource} row
	 * @param {Props} [props]
	 * @returns {Resource}
	 */
	replace(row, props = {}) {
		let rowId = typeof row === 'object' ? row.id : row;
		let rowKey = this.rowKey(rowId);
		let rowOld = this.database.getItem(rowKey);
		if (rowOld == undefined) {
			throw new Error(`Can not replace row with id "${rowId}" as it does not exist`);
		}

		let rowNew = { id: rowId, ...props };

		for (let index of this.indexes) {
			index.remove(rowOld);
			index.add(rowNew);
		}

		this.database.setItem(rowKey, rowNew);

		return rowNew;
	}

	/**
	 * @param {Resource|Id} row
	 * @returns {Resource}
	 */
	delete(row) {
		let rowId = typeof row === 'object' ? row.id : row;
		let rowKey = this.rowKey(rowId);
		let rowValue = typeof row === 'object' ? row : this.database.getItem(rowKey);
		if (rowValue) {
			for (let index of this.indexes) {
				index.remove(rowValue);
			}

			rowValue = this.database.getItem(rowKey);
			this.database.removeItem(rowKey);
		}

		let tableKey = this.key();
		let tableIds = this.database.getItem(tableKey) ?? [];
		if (tableIds instanceof Array === false) throw new Error('Expected table ids to be an array');

		let rowIndex = tableIds.indexOf(rowId);
		if (rowIndex !== -1) {
			this.database.setItem(tableKey, [...tableIds.slice(0, rowIndex), ...tableIds.slice(rowIndex + 1)]);
		}

		return rowValue;
	}

	clear() {
		let tableKey = this.key();
		let storageKeys = Object.keys(this.database.storage.value);

		for (let storageKey of storageKeys) {
			if (storageKey.startsWith(tableKey)) {
				this.database.removeItem(storageKey);
			}
		}
	}

	destroy() {
		this.clear();

		delete this.database.tables[this.name];
	}
}
