import { useRef, useMemo, useSyncExternalStore, useCallback } from 'react';

/**
 * @template T
 * @typedef {import('react').MutableRefObject<T>} Ref<T>
 */

/** @typedef {import('./types.js').Id} Id */
/** @typedef {import('./types.js').Props} Props */
/** @typedef {import('./types.js').Resource} Resource */
/** @typedef {import('./types.js').Database} Database */

/**
 * @param {Database} database
 * @param {string} tableName
 * @param {Props} [props]
 * @returns {Array<Id>}
 */
export function useSelectIds(database, tableName, props = {}) {
	/** @type {Ref<Array<Id>|undefined>} */
	let snapshotCacheRef = useRef();

	/** @type {Ref<[string,any]|undefined>} */
	let propsCacheRef = useRef();
	if (propsCacheRef.current == undefined) {
		propsCacheRef.current = [JSON.stringify(props), props];
	}

	let cachedProps = useMemo(() => {
		let json = JSON.stringify(props);
		if (json !== propsCacheRef.current?.[0]) {
			propsCacheRef.current = [json, props];
		}

		return propsCacheRef.current[1];
	}, [props]);

	let subscribe = useCallback(
		/** @type {(callback: () => void) => () => void} */
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
			snapshotCacheRef.current = database.selectIds(tableName, props, true);
		}

		return snapshotCacheRef.current;
	};

	return useSyncExternalStore(subscribe, snapshot);
}

/**
 * @param {Database} database
 * @param {string} tableName
 * @param {Props} [props]
 * @returns {number}
 */
export function useCount(database, tableName, props = {}) {
	let index = useSelectIds(database, tableName, props);
	let count = index.length;
	return count;
}

/**
 * @param {Database} database
 * @param {string} tableName
 * @param {Id} id
 * @returns {Resource | undefined}
 */
export function useSelectById(database, tableName, id) {
	/** @type {Ref<Resource|undefined>} */
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
			snapshotCacheRef.current = database.selectById(tableName, id);
		}

		return snapshotCacheRef.current;
	};

	return useSyncExternalStore(subscribe, snapshot);
}

/**
 * @param {Database} database
 * @param {string} tableName
 * @param {Props} [props]
 * @returns {Array<Props>}
 */
export function useSelect(database, tableName, props = {}) {
	/** @type {Ref<Array<Props>|undefined>} */
	let snapshotCacheRef = useRef();

	/** @type {Ref<[string,any]|undefined>} */
	let propsCacheRef = useRef();
	if (propsCacheRef.current == undefined) {
		propsCacheRef.current = [JSON.stringify(props), props];
	}

	let cachedProps = useMemo(() => {
		let json = JSON.stringify(props);
		if (json !== propsCacheRef.current?.[0]) {
			propsCacheRef.current = [json, props];
		}

		return propsCacheRef.current[1];
	}, [props]);

	let subscribe = useCallback(
		/** @type {(callback: () => void) => () => void} */
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
