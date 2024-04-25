import { useRef, useCallback } from 'react';

import useInsertionEffect from './use-insertion-effect.js';

/**
 * @param {function} callback
 * @param {Array<any>} dependencies
 * @returns
 */
export default function useImmutableCallback(callback, dependencies = []) {
	/** @type {React.MutableRefObject<function|undefined>} */
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
