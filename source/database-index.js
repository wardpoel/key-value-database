import enumerate from './utilities/string/enumerate.js';

/** @typedef {import('./database.js').Id} Id */
/** @typedef {import('./database.js').default} Database */
/** @typedef {import('./database-table.js').default} Table */

export default class Index {
	/**
	 * @param {Database} database
	 * @param {Table} table
	 * @param  {Array<string|[string,function]>} attributes
	 */
	constructor(database, table, ...attributes) {
		let keys = attributes.map(attribute => (attribute instanceof Array ? attribute[0] : attribute));
		let values = attributes.map(attribute => (attribute instanceof Array ? attribute[1] : attribute));

		this.keys = keys;
		this.table = table;
		this.values = values;
		this.database = database;

		let index = database.findIndex(table.name, ...keys);
		if (index) throw new Error(`Index on ${enumerate(...keys)} already exists on table "${table.name}"`);

		let key = table.key();
		let ids = database.getItem(key) ?? [];
		for (let id of ids) {
			let key = table.rowKey(id);
			let row = database.getItem(key);

			this.add(row);
		}

		table.indexes.push(this);
	}

	/**
	 * @param {Object} row
	 */
	add(row) {
		let key = this.key(row);
		let ids = this.database.getItem(key) ?? [];
		let index = ids.indexOf(row.id);
		if (index === -1) {
			this.database.setItem(key, [...ids, row.id]);
		}
	}

	/**
	 * @param {Object} row
	 */
	remove(row) {
		let key = this.key(row);
		let ids = this.database.getItem(key) ?? [];
		let index = ids.indexOf(row.id);
		if (index !== -1) {
			if (ids.length === 1) {
				this.database.removeItem(key);
			} else {
				this.database.setItem(key, [...ids.slice(0, index), ...ids.slice(index + 1)]);
			}
		}
	}

	/**
	 * @param {Object|string} rowOrValue
	 * @param  {Array<string>} values
	 * @returns {string}
	 */
	key(rowOrValue, ...values) {
		let propValues;
		if (typeof rowOrValue === 'object') {
			propValues = this.values.map(value => (typeof value === 'function' ? value(rowOrValue) : rowOrValue[value]));
		} else {
			propValues = [rowOrValue, ...values];
		}

		let tableKey = this.table.key();
		let indexKey = this.keys.reduce((result, key, index) => result + `[${key}=${propValues[index]}]`, '');

		return `${tableKey}${indexKey}`;
	}

	/**
	 * @param {Object|string} props
	 * @param  {Array<string>} other
	 * @returns {Array<Id>}
	 */
	ids(props, ...other) {
		let key = this.key(props, ...other);
		let ids = this.database.getItem(key) ?? [];
		return ids;
	}

	destroy() {
		let rows = this.table.select();
		for (let row of rows) {
			this.database.removeItem(this.key(row));
		}
	}
}
