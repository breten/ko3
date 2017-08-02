const path = require('path')
const fs = require('fs')
const _ = require('lodash')
const beautify = require('js-beautify').js_beautify
const mkdirp = require('mkdirp')

class DependsPluin {

	constructor (options = {}) {
		this.options = _.defaultsDeep(options, {
			rootPath: process.cwd(),
			output: 'dist',
			prjName: ''
		})
	}

	apply (compiler) {
		const self = this
			compiler.plugin('done', stats => {
        console.log('done')
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
      mkdirp.sync(path.dirname(distPath))
      fs.writeFileSync(distPath, beautify(JSON.stringify(result),{
        indent_size: 2
      }), 'utf-8')
      
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
    		result.push({
    			id: dependId,
    			chunkPath: _chunkPath,
    			oIdentifier: source[dependId].identifier,
    			depends: self.getDepends(source[dependId], source)
    		})

    	})
		}
		return result
	}
	
}

module.exports = DependsPluin