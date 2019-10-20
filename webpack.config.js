const path = require('path');

module.exports = {
	entry: './index.js',
	externals: {
		'node-fetch': 'fetch',
	},
	output: {
		filename: 'index.min.js',
		path: path.resolve(__dirname),
		library: 'snxData',
		libraryTarget: 'window',
	},
};
