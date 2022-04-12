const path = require('path');
const HtmlWebPackPlugin = require('html-webpack-plugin');

module.exports = function () {
    const sourcePath = path.resolve(__dirname, '../src');

    return require('./common')({
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
        optimization: {
            minimize: false,
        },
    });
};
