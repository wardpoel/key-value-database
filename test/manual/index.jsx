import Application from './application';

import { createRoot } from 'react-dom/client';

let root = document.querySelector('#root');
if (root) {
	createRoot(root).render(<Application />);
}
