import { useRef, useCallback } from 'react';

import useInsertionEffect from './use-insertion-effect.js';

/**
 * @template T
 * @typedef {import('react').MutableRefObject} MutableRefObject<T>
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
		function (...args) {
			return callbackRef.current?.(...args);
		},
		[callbackRef, ...dependencies],
	);
}
