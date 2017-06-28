const fs = require('fs')
const _ = require('lodash')
const build = require('./build')
const prev = require('./prev')

class Ko {
	constructor (options = {}) {
		const conf = {
			rootDir : '.',
			pagesDir: '',
			distDir : '',
			prjName : ''
		}

		this.options = _.defaultsDeep(options, conf)

		this.build = build.bind(this)
		this.prev = prev.bind(this)
		return Promise.resolve(this)
	}
}

module.exports = Ko