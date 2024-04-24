import { useMemo } from 'react';

/** @typedef {import('./database.js').default} Database */

/**
 *
 * @param {Database} database
 * @param {string} tableName
 * @param {Object|undefined} [props]
 */
export function useFind(database, tableName, props) {
	let indexKeys = Object.keys(props);
	let index = database.assertIndex(tableName, ...indexKeys);
	let indexKey = index?.key(props);

	return useMemo(() => {
		database.storage.getItem(indexKey);
	}, [indexKey]);
}

export function useCount(database, tableName, props, autoindex) {}

export function useSelect(database, tableName, props, autoindex) {}
