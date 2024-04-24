import { useMemo } from 'react';

/** @typedef {import('./database.js').default} Database */

/**
 *
 * @param {Database} database
 * @param {string} tableName
 * @param {Object|undefined} [props]
 */
export function useFind(database, tableName, props) {
	let key = useMemo(() => {
		let table = database.findTable(tableName)
		if (table) {
			return table.findKey(props)
		}
	}, [props]);

	useEffect(() => {
		// subscribe to database
	}, [key])

	return useMemo(() => {
		if (key == undefined) return 
		
		return database.storage.getItem(key) ?? [];
	}, [key]);
}

export function useCount(database, tableName, props) {
	return useFind(database, tableName, props)?.length
}

export function useSelect(database, tableName, props) {
	if (typeof props === 'string')
}
