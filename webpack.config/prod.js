const path = require('path');

module.exports = function () {
    const sourcePath = path.resolve(__dirname, '../src/lib'),
        buildPath = path.resolve(__dirname, '../dist');

    return require('./common')({
        mode: 'production',
        context: sourcePath,
        devtool: 'source-map',
        externals: ['react', 'react-dom', 'prop-types'],
        output: {
            path: buildPath,
            filename: 'index.js',
            clean: true,
            libraryTarget: 'commonjs2',
        },

        optimization: {
            minimize: true,
        },
    });
};
