const path = require('path')
const fs = require('fs')
const chalk = require('chalk')
const _ = require('lodash')
const beautify = require('js-beautify').js_beautify
const mkdirp = require('mkdirp')
const getApis = require('../utils').getApis
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
      
      // all mods depends
      let modsdepends = {}
      const allModsDependsDistPath = path.join(self.options.rootPath, self.options.output, 'modsdepends.json')
      if(fs.existsSync(path.resolve(allModsDependsDistPath))){
        modsdepends = JSON.parse(fs.readFileSync(path.resolve(allModsDependsDistPath), 'utf-8'))
      }else {
        mkdirp.sync(path.dirname(path.resolve(allModsDependsDistPath)))
      }
      const jsDirReg = new RegExp('/' + self.options.jsDir + '/')
      _.map(userMods, chunk => {
        const _chunkPath = self.getChunkPath(chunk.identifier)
        if(!jsDirReg.test(_chunkPath)){
          modsdepends[_chunkPath] = modsdepends[_chunkPath] || []
          chunk.reasons.forEach((reason, i) => {
            const _reasonChunkPath = self.getChunkPath(reason.moduleIdentifier || reason.identifier)
            if(!jsDirReg.test(_reasonChunkPath)){
              !_.includes(modsdepends[_chunkPath], _reasonChunkPath) && modsdepends[_chunkPath].push(_reasonChunkPath)
            }
          })
          modsdepends[_chunkPath] && !_.includes(modsdepends[_chunkPath], self.options.prjName) && modsdepends[_chunkPath].push(self.options.prjName)
          if(!modsdepends[_chunkPath][0]) {
            delete modsdepends[_chunkPath]
          }
        }
      })
        
      function addDepends(chunk, pagePath) {
        chunk.depends.forEach(chunkChild => {
          const _chunkPath = chunkChild.chunkPath
          modsdepends[_chunkPath] = modsdepends[_chunkPath] || []
          !_.includes(modsdepends[_chunkPath], pagePath) && modsdepends[_chunkPath].push(pagePath)
          if(chunkChild.depends.length > 0){
            addDepends(chunkChild, pagePath)
          }
        })
      }

      result.bundles.forEach(bundle => {
        const _chunkPath = bundle.chunkPath
        const basename = path.basename(_chunkPath, '.js')
        const full = /.*S?html/.exec(basename)[0]
        const pageName = _.kebabCase(full).replace(/-/g, '_').replace(/_(s?html)/,'.$1')
        const pagePath = path.join(self.options.prjName, pageName)
        addDepends(bundle, pagePath)
      })

      fs.writeFileSync(allModsDependsDistPath, beautify(JSON.stringify(modsdepends),{
        indent_size: 2
      }), 'utf-8')

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
    return getApis(chunk.source || '')
  }
	
}

module.exports = DependsPluin