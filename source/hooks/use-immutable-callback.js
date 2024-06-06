import { useRef, useCallback, useInsertionEffect } from 'react';

/**
 * @template T
 * @typedef {import('react').MutableRefObject<T>} MutableRefObject<T>
 */

/**
 * @param {function} callback
 * @param {Array<any>} dependencies
 * @returns
 */
export default function useImmutableCallback(callback, dependencies = []) {
	/** @type {MutableRefObject<function|undefined>} */
	let callbackRef = useRef();

	useInsertionEffect(() => {
		callbackRef.current = callback;
	});

	return useCallback(
		/** @param {any[]} args */
		function (...args) {
			return callbackRef.current?.(...args);
		},
		[callbackRef, ...dependencies],
	);
}
