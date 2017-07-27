const join = require('path').join
const webpack = require('webpack')
// const ExtractTextPlugin = require("extract-text-webpack-plugin")
module.exports = function (ko) {
	let config = {
		plugins: [],
		entry: {},
		output: {
			path: 'dist/',
			filename: '[name]'
		},
	 	resolve: {
	 		modules: [
        join(__dirname, '..', '..','node_modules')
      ],
      alias: {
      	vue: 'vue/dist/vue.runtime.common.js'
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
	      use: [
	      	{
	      		loader: 'style-loader'
	      	},
	      	{
	      		loader: "css-loader",
	          options: {
	             modules: true
	          }
	      	}
	      ]
	    }, {
	      test: /\.s?html$/,
	      use: [
	      	{
            loader: "file-loader",
            options: {
                name: ko.options.prjName + "/[name].[ext]",
            },
        	},
        	{
            loader: "extract-loader",
        	},
	      	{
	      		loader: 'html-loader',
	      		options: {
	             ignoreCustomFragments: [/\{\{.*?}}/],
	             interpolate: true,
	             attrs: ['img:src']
	          }	          
	      	}
	      ]
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
	      loader: 'style-loader!css-loader!sass-loader?sourceMap'
	    }, {
	      test: /\.(png|jpe?g|gif|svg|woff2?|eot|ttf|otf)$/,
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