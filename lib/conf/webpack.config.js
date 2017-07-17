const join = require('path').join
const webpack = require('webpack')
// const ExtractTextPlugin = require("extract-text-webpack-plugin")
module.exports = function () {
	let config = {
		plugins: [],
		entry: {},
		output: {
			path: 'dist/',
			filename: '[name].js'
		},
	 	resolve: {
	 		modules: [
        join(__dirname, '..', '..','node_modules')
      ],
      alias: {
      	vue: 'vue/dist/vue.common.js'
      }
	 	},
		resolveLoader: {
      modules: [
        join(__dirname, '..', '..','node_modules')
      ]
    },
    plugins: [new webpack.optimize.CommonsChunkPlugin({
      name: 'vendor',
      filename: 'vendor.bundle.js'
    })],
		module: {
			//加载器配置
	    rules: [{
	      test: /\.vue$/,
	      loader: 'vue-loader',
	      query: {
	      	loaders: {
	      		'js': 'babel-loader?presets[]='+ join(__dirname ,'../../node_modules/babel-preset-es2015') + '&plugins[]=' + join(__dirname ,'../../node_modules/babel-plugin-transform-runtime')
	      	}
	      }
	    }, {
	      test: /\.css$/,
	      loader: 'style-loader'
	    }, {
	      test: /\.js$/,
	      
	      exclude: /node_modules/,
	      use: {
	      	loader: "babel-loader",
	      	options: {
		      	presets: [join(__dirname ,'../../node_modules/babel-preset-es2015')],
		      	plugins: [join(__dirname ,'../../node_modules/babel-plugin-transform-runtime')],
		      	babelrc: false
		      }
	      }
	    }, {
	      test: /\.scss$/,
	      loader: 'style!css!sass?sourceMap'
	    }, {
	      test: /\.(png|jpg)$/,
	      loader: 'url-loader',
	      query: {
	      	limit: 8192,
	      	name : '/[path][name].[ext]?[sha512:hash:base64:7]',
	      	useRelativePath: false,
	      	outputPath: function(r){
	      		return r.replace(/\/[^\/]+/, '')
	      	}
	      }
	    }]
		}
	}

	return config
}