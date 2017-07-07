const fs = require('fs')
const path = require('path')
const _ = require('lodash')
const build = require('./build')
const Server = require('./server')
const parseHtml = require('./html').parse
const outputHtml = require('./html').output
const watchHtml = require('./html').watch
const sincludeHtml = require('./html').sinclude
const mfs = require('memory-fs')
const deploy = require('./deploy')
const rmFolder = require('./utils').rmFolder

class Ko {
	constructor (options = {}) {
		const conf = {
			rootDir  : '.',
			pagesDir : 'pages',
			distDir  : 'dist',
			jsDir    : '_js',
			prjName  : '',
			webpack  : {},
			devServer: {},
			sftp     : {},
			jsDomain : '',
			tpls     : {
		    inlineJsTpl  : '<script type="text/javascript">\n<%= content %></script>\n',
		    asyncJsTpl   : '<script async type="text/javascript" src="<%= url %>"></script>\n',
		    defaultJsTpl : '<script type="text/javascript" src="<%= url %>"></script>\n',
		    vmEntryTpl   : fs.readFileSync(path.resolve(__dirname, 'tpl/vmEntry.tpl'), {
	        encoding: 'utf-8'
	      })
		  }
		}

		this.options = _.defaultsDeep(options, conf)
		this.build = build.bind(this)
		this.server = Server
		this.parseHtml = parseHtml.bind(this)
		this.outputHtml = outputHtml.bind(this)
		this.watchHtml = watchHtml.bind(this)
		this.sincludeHtml = sincludeHtml.bind(this)
		this.deploy = deploy.bind(this)
		this.mfs = new mfs()
		return Promise.resolve(this)
	}

	clearDist () {
		const tarDir = path.resolve(this.options.distDir, this.options.pagesDir, this.options.prjName)
		fs.existsSync(tarDir) && rmFolder(tarDir, true)
		return Promise.resolve(this)
	}
}

module.exports = Ko