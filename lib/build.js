const webpack = require('webpack')
const wpConfig  = require('./conf/webpack.config')
const glob = require('glob')
const fs = require('fs')
const chalk = require('chalk')
const path = require('path')
const _ = require('lodash')
const getEntries = require('./utils').getEntries
const mergeWpConf = require('./utils').mergeWpConf
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin
const DependsPlugin = require('./wpPlugins/DependsPlugin')

function build () {
  return new Promise((resolve, reject) => {
    let config = wpConfig(this, this)
    config = mergeWpConf(config, this.options.webpack({
      isProduct: true
    }) || {})
    const prjPath = path.join(this.options.pagesDir, this.options.prjName)
    if(!fs.existsSync(prjPath)) {
      return reject(chalk.red(`${prjPath} not found`));
    }
    const entryGlob = path.join(prjPath, this.options.jsEntryDir, '*.js')
    const entryGlobPlus = path.join(prjPath, this.options.jsDir ,'*.js')
    const entryHtmlGlob = path.join(prjPath, '*.@(html|shtml)')

    let htmlEntries = {}
    this.options.loadHtml && (htmlEntries = getEntries([entryHtmlGlob], this.options.pagesDir, this.options.tmpDir))
    
    config.entry = _.defaultsDeep(getEntries([entryGlob, entryGlobPlus], this.options.pagesDir), htmlEntries ,config.entry)

    if(_.values(config.entry).length == 0){
      console.log(chalk.red(`Warn: Could not found any entries in ${this.options.prjName}`))
      return resolve()
    }
    config.output.path = path.resolve(this.options.rootDir, this.options.distDir)
    config.output.publicPath = this.options.staticDomain
    if(config.plugins === undefined) {
      config.plugins = []
    }
    config.plugins.push(new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: '"production"'
      }
    }))
    this.options.dependsDist && config.plugins.push(new DependsPlugin({
      rootPath: path.resolve(this.options.rootDir),
      prjName: this.options.prjName,
      fs: this.mfs,
      output: this.options.dependsDist
    }))
    config.plugins.push(new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false
      },
      comments: false
    }))
    this.options.analyze && config.plugins.push(new BundleAnalyzerPlugin(_.defaultsDeep(_.isObject(this.options.analyze) ? this.options.analyze : {}, {
          // Can be `server`, `static` or `disabled`.
          // In `server` mode analyzer will start HTTP server to show bundle report.
          // In `static` mode single HTML file with bundle report will be generated.
          // In `disabled` mode you can use this plugin to just generate Webpack Stats JSON file by setting `generateStatsFile` to `true`.
          analyzerMode: 'server',
          // Host that will be used in `server` mode to start HTTP server.
          analyzerHost: '127.0.0.1',
          // Port that will be used in `server` mode to start HTTP server.
          analyzerPort: 8888,
          // Path to bundle report file that will be generated in `static` mode.
          // Relative to bundles output directory.
          reportFilename: 'report.html',
          // Module sizes to show in report by default.
          // Should be one of `stat`, `parsed` or `gzip`.
          // See "Definitions" section for more information.
          defaultSizes: 'parsed',
          // Automatically open report in default browser
          openAnalyzer: true,
          // If `true`, Webpack Stats JSON file will be generated in bundles output directory
          generateStatsFile: false,
          // Name of Webpack Stats JSON file that will be generated if `generateStatsFile` is `true`.
          // Relative to bundles output directory.
          statsFilename: 'stats.json',
          // Options for `stats.toJson()` method.
          // For example you can exclude sources of your modules from stats file with `source: false` option.
          // See more options here: https://github.com/webpack/webpack/blob/webpack-1/lib/Stats.js#L21
          statsOptions: null,
          // Log level. Can be 'info', 'warn', 'error' or 'silent'.
          logLevel: 'info'
        })))

    const compiler = webpack(config)
    console.log(chalk.gray('Building...'))
    compiler.run((err, stats) => {
      if(err) {
        return reject(err)
      }

      if (stats.hasErrors()) {
        console.log(stats.toString({
          chunks: false,
          children: false,
          modules: false,
          colors: true
        }))
        return reject(chalk.red('Webpack build exited with errors'))
      }
      resolve()
    })

  })
}

module.exports = build