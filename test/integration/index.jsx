import { createRoot } from 'react-dom/client';
import { useFind, useSelect } from '../../source/hooks.js';

import database from './database.js';

let root = document.querySelector('#root');
if (root) {
	createRoot(root).render(<Root />);
}

function Root() {
	let result = useSelect(database, 'cars');

	return <pre>{JSON.stringify(result, null, 4)}</pre>;
}
