const webpack = require('webpack')
const config  = require('./conf/webpack.config')()
const glob = require('glob')
const fs = require('fs')
const chalk = require('chalk')
const path = require('path')
const _ = require('lodash')
const getEntries = require('./utils').getEntries

function build () {
  return new Promise((resolve, reject) => {
    const prjPath = path.join(this.options.pagesDir, this.options.prjName)
    if(!fs.existsSync(prjPath)) {
      return reject(chalk.red(`${prjPath} not found`));
    }
    const entryGlob = path.join(prjPath, '*.js')
    const entryGlobPlus = path.join(prjPath, this.options.jsDir ,'*.js')
    config.entry = _.defaultsDeep(getEntries([entryGlob, entryGlobPlus]), config.entry)

    if(_.values(config.entry).length == 0){
      console.log(chalk.red(`Warn: Could not found any entries in ${this.options.prjName}`))
      return resolve()
    }
    config.output.path = path.resolve(this.options.rootDir, this.options.distDir)
    if(config.plugins === undefined) {
      config.plugins = []
    }
    config.plugins.push(new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: 'production'
      }
    }))
    config.plugins.push(new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false
      }
    }))

    const compiler = webpack(config)
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