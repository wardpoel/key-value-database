import { useEffect, useInsertionEffect } from 'react';

let useIsomorphicEffect = typeof document == 'undefined' ? useEffect : useInsertionEffect;

export default function (handler, dependencies) {
	useIsomorphicEffect(handler, dependencies);
}
