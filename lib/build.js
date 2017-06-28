const webpack = require('webpack')
const config  = require('./conf/config')()
const glob = require('glob')
const fs = require('fs')
const chalk = require('chalk')
const path = require('path')
const _ = require('lodash')

function getEntries (globPath) {
  let files = []
  if (Object.prototype.toString.call(globPath) === '[object Array]') {
    globPath.forEach(function(o, i) {
      files = files.concat(glob.sync(o))
    })
  } else {
    files = glob.sync(globPath)
  }
  let _entries = {}
  let entry, dirname, basename
  for (let i = 0; i < files.length; i++) {
    entry = files[i]
    dirname = path.dirname(entry)
    basename = path.basename(entry, '.js')
    _entries[path.join(dirname, basename).replace(/\\/g, '/')] = path.resolve(entry)
  }
  return _entries
}

function build () {
  return new Promise((resolve, reject) => {
    const prjPath = path.join(this.options.pagesDir, this.options.prjName)
    if(!fs.existsSync(prjPath)) {
      return reject(chalk.red(`${prjPath} not found`));
    }
    const entryGlob = path.join(prjPath, '*.js')
    const entryGlobPlus = path.join(prjPath, '_js' ,'*.js')
    config.entry = getEntries([entryGlob, entryGlobPlus])
    if(_.values(config.entry).length == 0){
      console.log(chalk.red(`Warn: Could not found any entries in ${this.options.prjName}`))
      return resolve()
    }
    config.output.path = path.resolve(this.options.rootDir, this.options.distDir)
    const compiler = webpack(config)
    compiler.run(function(err, stats){
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