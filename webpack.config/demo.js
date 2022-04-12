const path = require('path');
const HtmlWebPackPlugin = require('html-webpack-plugin');

module.exports = function () {
    const sourcePath = path.resolve(__dirname, '../demo');

    return require('./common')({
        entry: './index.tsx',
        mode: 'development',
        context: sourcePath,
        devtool: 'source-map',
        plugins: [
            new HtmlWebPackPlugin({
                template: path.join(sourcePath, 'index.html'),
                filename: 'index.html',
            }),
        ],
        devServer: {
            historyApiFallback: true,
            compress: false,
            inline: true,
            hot: true,
            disableHostCheck: true,
            port: 3000,
            host: '0.0.0.0',
            proxy: {
                // Local Express server
                '/api': 'http://localhost:5000/',
            },
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.js', '.jsx'],
            modules: [path.resolve('../demo'), './node_modules'],
            alias: {
                '~': path.join(__dirname, '../demo'),
                'react-file-manager': path.join(__dirname, '../src/lib/index.tsx'),
                'react-file-manager-css': path.join(__dirname, '../src/lib/styles.scss'),
            },
        },
        optimization: {
            minimize: false,
        },
    });
};
