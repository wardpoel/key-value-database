import { useRef, useMemo, useEffect, useSyncExternalStore } from 'react';

import useImmutableCallback from './hooks/use-immutable-callback.js';

/** @typedef {import('./database.js').default} Database */

/**
 * @template T
 * @typedef {import('react').MutableRefObject<T>} MutableRefObject<T>
 */

function useKey(database, tableName, props) {
	/** @type {MutableRefObject<function>} */
	let callbackRef = useRef();

	let key = useMemo(() => {
		let table = database.findTable(tableName);
		if (table) {
			return table.key(props);
		}
	}, [database, tableName, props]);

	let keyValue = useMemo(() => {
		return database.storage.getItem(key);
	}, [database, key]);

	let subscribe = useMemo(() => {
		return function (callback) {
			callbackRef.current = callback;
			let unsubscribe = database.subscribe(key, callback);
			return function () {
				unsubscribe();
				callbackRef.current = undefined;
			};
		};
	}, [database, key]);

	let value = useSyncExternalStore(subscribe, () => keyValue);

	let handler = useImmutableCallback(
		/**
		 * @param {StorageEvent} event
		 */
		event => {
			let sameStorage = database.storage.value === event.storageArea;
			if (sameStorage) {
				let sameKey = key === event.key;
				if (sameKey) {
					callbackRef;
				}
			}
		},
	);

	useEffect(() => {
		window.addEventListener('storage', handler);

		return () => {
			window.removeEventListener('storage', handler);
		};
	}, [handler]);

	return value;
}

/**
 * @param {Database} database
 * @param {string} tableName
 * @param {Object|undefined} [props]
 */
export function useFind(database, tableName, props) {}

export function useCount(database, tableName, props) {
	// return useFind(database, tableName, props)?.length;
}

export function useSelect(database, tableName, props) {
	// if (typeof props === 'string')
}
