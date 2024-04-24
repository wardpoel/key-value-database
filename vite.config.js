export let client = new URL('http://localhost:5173');

export default {
	root: 'test/integration',
	build: {
		outDir: '../../build',
		emptyOutDir: true,
	},
	server: {
		port: client.port,
		host: client.hostname,
		open: client.pathname,
		https: client.protocol === 'https:',
		origin: client.origin,
		strictPort: true,
	},
	esbuild: {
		jsxInject: `import React from 'react'`,
	},
};
