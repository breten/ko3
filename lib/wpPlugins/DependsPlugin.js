const path = require('path')
const fs = require('fs')
const chalk = require('chalk')
const _ = require('lodash')
const beautify = require('js-beautify').js_beautify
const mkdirp = require('mkdirp')

class DependsPluin {

	constructor (options = {}) {
		this.options = _.defaultsDeep(options, {
			rootPath: process.cwd(),
			output: 'dist',
			prjName: '',
      fs: fs
		})
    this.warnings = []
	}

	apply (compiler) {
		const self = this
			compiler.plugin('done', stats => {
      stats = stats.toJson()
      const modules = stats.modules
      const chunks = stats.chunks
      const assets = stats.assets
      let depths = {}, userMods = {}, bundles = []
      modules.forEach( chunk => {

      	if(new RegExp(self.options.rootPath).test(chunk.identifier)){
      		userMods[chunk.id] = chunk
	      	!depths[chunk.depth] && (depths[chunk.depth] = [])
	      	depths[chunk.depth].push(chunk.id)
	      	
	      }
    	})
      _.map(userMods, chunk => {

      	chunk.reasons.forEach((reason, i) => {
      		!userMods[reason.moduleId]['depends'] && (userMods[reason.moduleId]['depends'] = [])
      		userMods[reason.moduleId]['depends'].push(chunk.id)
      	})

      })
      // bundles
      depths[0].forEach( id => {
      	const chunk = userMods[id]
      	const chunkPath = self.getChunkPath(chunk.identifier)
      	bundles.push({
      		id: id,
      		chunkPath: chunkPath,
      		depends: self.getDepends(chunk, userMods)
      	})

      })
      const result = {
        bundles, assets
      }
      const distPath = path.join(self.options.rootPath, self.options.output, self.options.prjName, 'depends.json')
      if(self.options.fs.mkdirpSync) {
        self.options.fs.mkdirpSync(path.dirname(distPath))
      }else{
        mkdirp.sync(path.dirname(distPath))
      }
      
      self.options.fs.writeFileSync(distPath, beautify(JSON.stringify(result),{
        indent_size: 2
      }), 'utf-8')
      self.warnings.forEach(warning => {
        console.log(warning)
      })
    })
		
	}

	getChunkPath (identifier) {
		const identifiers = identifier.split('!')
    return path.relative(this.options.rootPath, identifiers[identifiers.length - 1])
	}

	getDepends (chunk, source) {
		let self = this, result = []
		if(chunk.depends && chunk.depends.length > 0){
			chunk.depends.forEach( dependId => {
    		const _chunkPath = self.getChunkPath(source[dependId].identifier)
        if(_.indexOf(source[dependId].depends, chunk.id) != -1){
          // the chunk depends on itself
          const _warning = chalk.gray(`Warn: the module ${_chunkPath} depends on itself`)
          _.indexOf(self.warnings, _warning) == -1 && self.warnings.push(_warning)
        }else{
          const _depends = self.getDepends(source[dependId], source)
          const _apis = self.getApis (source[dependId], source)
      		result.push({
      			id: dependId,
      			chunkPath: _chunkPath,
      			oIdentifier: source[dependId].identifier,
      			depends: _depends,
            apis: _apis
      		})
        }

    	})
		}
		return result
	}

  getApis (chunk, source) {
    // const apiReg = '\/\/\(' + domains.join('|') + '\)[^\'\"]*'
    const apiReg = /[\'\"](https?)?\/\/[^\.\'\"\n]+(\.[^\.\'\"\n]+)+[^\'\"]*[\'\"]/g
    const res = chunk.source.match(new RegExp(apiReg, 'g'))
    let r = []
    if(res) {
      res.forEach(url => {
        const _url = url.replace(/[\'\"]/g, '')
        if(!/\.(png|jpg|mp3|mp4|ttf|woff|eot|css|svg|jpeg|webp)$/i.test(_url))
          r.push(_url)
      })
    }
    return r
  }
	
}

module.exports = DependsPluin