const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = {
    entry: {
        index: './src/renderer/index.js',
    },
    output: {
        path: path.resolve(__dirname, 'dist', 'app'),
        filename: '[name].js',
        publicPath: './',
    },
    target: 'electron-renderer',
    devtool: 'eval-source-map',
    module: {
        rules: [
            {
                test: /\.css$/i,
                include: path.resolve(__dirname, 'src/renderer'),
                use: ['style-loader', 'css-loader', 'postcss-loader'],
            },
            {
                test: /\.(png|jpe?g|gif|svg|ttf|otf|woff|woff2)$/i,
                use: [
                    {
                        loader: 'file-loader',
                        options: {
                            esModule: false,
                        },
                    },
                ],
            },
        ],
    },
    devServer: {
        static: {
            directory: path.join(__dirname, '/'),
        },
        devMiddleware: {
            publicPath: 'https://localhost:4999/',
        },
        hot: true,
        port: 4999,
    },
    plugins: [
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            template: './src/renderer/index.html',
            inject: true,
            chunks: ['index'],
            filename: 'index.html',
        }),
        new HtmlWebpackPlugin({
            template: './src/renderer/coffee.html',
            filename: 'coffee.html',
        }),
        new MiniCssExtractPlugin({
            filename: 'styles.css',
        }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src/renderer/'),
        },
    },
    stats: {
        colors: true,
    },
    mode: 'development',
};
