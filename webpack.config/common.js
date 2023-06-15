const path = require('path');
const webpack = require('webpack');

module.exports = function (options) {
    options.plugins = [
        // new webpack.DefinePlugin({
        //     'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
        // }),
        ...(options.plugins || []),
    ];

    const loaders = [
        {
            test: [/\.jsx?$/],
            exclude: /node_modules/,
            use: ['babel-loader'],
        },
        {
            test: [/\.tsx?$/],
            exclude: /node_modules/,
            use: [
                {
                    loader: 'ts-loader',
                    options: {
                        configFile:
                            options.mode === 'development'
                                ? 'tsconfig.json'
                                : 'tsconfig.build.json',
                    },
                },
            ],
        },
        {
            // test: /\.s[ac]ss$/i,
            test: /\.(sa|sc|c)ss$/,
            use: [
                'style-loader',
                'css-loader',
                {
                    loader: 'sass-loader',
                    options: {
                        // Prefer `dart-sass`
                        // implementation: require("sass"),
                        // sourceMap: true,
                    },
                },
            ],
        },
        {
            test: /\.js$/,
            enforce: 'pre',
            use: ['source-map-loader'],
        },
    ];

    return {
        entry: './index.tsx',
        module: {
            rules: loaders,
        },
        resolve: {
            extensions: ['.tsx', '.ts', '.js', '.jsx'],
        },
        ...options,
    };
};
