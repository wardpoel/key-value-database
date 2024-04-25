import { useMemo, useEffect } from 'react';

import useForceUpdate from './hooks/use-force-update.js';
import useImmutableCallback from './hooks/use-immutable-callback.js';

/** @typedef {import('./database.js').default} Database */

/**
 * @param {Database} database
 * @param {string} tableName
 * @param {Object|undefined} [props]
 */
export function useFind(database, tableName, props) {
	let forceUpdate = useForceUpdate();

	let key = useMemo(() => {
		let table = database.findTable(tableName);
		if (table) {
			return table.key(props);
		}
	}, [tableName]);

	let storageChangeHandler = useImmutableCallback(event => {
		let sameStorage = database.storage.value === event.storageArea;
		if (sameStorage) {
			let sameKey = key === event.key;
			if (sameKey) {
				forceUpdate();
			}
		}
	});

	useEffect(() => {
		window.addEventListener('storage', storageChangeHandler);

		return () => {
			window.removeEventListener('storage', storageChangeHandler);
		};
	});

	useEffect(() => {
		database.subscribe(key);
	}, [key]);

	return useMemo(() => {
		if (key == undefined) return;

		return database.storage.getItem(key) ?? [];
	}, [key]);
}

export function useCount(database, tableName, props) {
	return useFind(database, tableName, props)?.length;
}

export function useSelect(database, tableName, props) {
	// if (typeof props === 'string')
}
