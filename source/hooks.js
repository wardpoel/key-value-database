import { useRef, useMemo, useSyncExternalStore, useCallback } from 'react';

/** @typedef {import('./database.js').Id} Id */
/** @typedef {import('./database.js').default} Database */

/**
 * @param {Database} database
 * @param {string} tableName
 * @param {Id} id
 */
export function useFind(database, tableName, id) {
	let snapshotCacheRef = useRef();

	let subscribe = useCallback(
		/**
		 * @param {() => void} callback
		 */
		callback => {
			return database.subscribeToRow(tableName, id, () => {
				snapshotCacheRef.current = undefined;
				callback();
			});
		},
		[database, tableName, id],
	);

	let snapshot = function () {
		if (snapshotCacheRef.current == undefined) {
			snapshotCacheRef.current = database.find(tableName, id);
		}

		return snapshotCacheRef.current;
	};

	return useSyncExternalStore(subscribe, snapshot);
}

/**
 * @param {Database} database
 * @param {string} tableName
 * @param {Object} [props]
 * @returns {Array<Id>}
 */
export function useIndex(database, tableName, props = {}) {
	/** @type {React.MutableRefObject<Array<Id>>} */
	let snapshotCacheRef = useRef();

	/** @type {React.MutableRefObject<[string,any]>} */
	let propsCacheRef = useRef();
	if (propsCacheRef.current == undefined) {
		propsCacheRef.current = [JSON.stringify(props), props];
	}

	let cachedProps = useMemo(() => {
		let json = JSON.stringify(props);
		if (json !== propsCacheRef.current[0]) {
			propsCacheRef.current = [json, props];
		}

		return propsCacheRef.current[1];
	}, [props]);

	let subscribe = useCallback(
		callback => {
			return database.subscribeToIndex(tableName, cachedProps, () => {
				snapshotCacheRef.current = undefined;
				callback();
			});
		},
		[database, tableName, cachedProps],
	);

	let snapshot = function () {
		if (snapshotCacheRef.current == undefined) {
			snapshotCacheRef.current = database.index(tableName, props, true);
		}

		return snapshotCacheRef.current;
	};

	return useSyncExternalStore(subscribe, snapshot);
}

/**
 * @param {Database} database
 * @param {string} tableName
 * @param {Object} [props]
 * @returns {number}
 */
export function useCount(database, tableName, props = {}) {
	let index = useIndex(database, tableName, props);
	let count = index.length;
	return count;
}

/**
 * @param {Database} database
 * @param {string} tableName
 * @param {Object} [props]
 * @returns {Array<Object>}
 */
export function useSelect(database, tableName, props = {}) {
	/** @type {MutableRefObject<Array<Id>>} */
	let snapshotCacheRef = useRef();

	/** @type {MutableRefObject<[string,any]>} */
	let propsCacheRef = useRef();
	if (propsCacheRef.current == undefined) {
		propsCacheRef.current = [JSON.stringify(props), props];
	}

	let cachedProps = useMemo(() => {
		let json = JSON.stringify(props);
		if (json !== propsCacheRef.current[0]) {
			propsCacheRef.current = [json, props];
		}

		return propsCacheRef.current[1];
	}, [props]);

	let subscribe = useCallback(
		callback => {
			return database.subscribeToRows(tableName, cachedProps, () => {
				snapshotCacheRef.current = undefined;
				callback();
			});
		},
		[database, tableName, cachedProps],
	);

	let snapshot = function () {
		if (snapshotCacheRef.current == undefined) {
			snapshotCacheRef.current = database.select(tableName, props, true);
		}

		return snapshotCacheRef.current;
	};

	return useSyncExternalStore(subscribe, snapshot);
}
