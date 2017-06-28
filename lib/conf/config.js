const join = require('path').join
const ExtractTextPlugin = require("extract-text-webpack-plugin")
module.exports = function () {
	let config = {
		plugins: [],
		entry: {},
		output: {
			path: 'dist/',
			filename: '[name].js'
		},
		// externals: {
	 //    "vue": "Vue",
	 //  },
	 	resolve: {
	 		modules: [
        join(__dirname, '..', '..','node_modules')
      ]
	 	},
		resolveLoader: {
      modules: [
        join(__dirname, '..', '..','node_modules')
      ]
    },
		module: {
			//加载器配置
	    rules: [{
	      test: /\.vue$/,
	      loader: 'vue-loader',
	    }, {
	      test: /\.css$/,
	      loader: 'style-loader'
	    }, {
	      test: /\.js$/,
	      exclude: /node_modules/,
	      loader: "babel-loader"
	    }, {
	      test: /\.scss$/,
	      loader: 'style!css!sass?sourceMap'
	    }, {
	      test: /\.(png|jpg)$/,
	      loader: 'url-loader?limit=8192'
	    }]
		}
	}

	return config
}