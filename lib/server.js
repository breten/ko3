const webpack = require("webpack")
const chalk = require("chalk")
const Server = require("webpack-dev-server")
const path = require('path')
const fs = require('fs')
const _ = require('lodash')
const getEntries = require('./utils').getEntries
const mergeWpConf = require('./utils').mergeWpConf
const wpConfigBase  = require('./conf/webpack.config')
const SingleEntryPlugin = require('webpack/lib/SingleEntryPlugin')
const url = require("url")
const internalIp = require("internal-ip")
const open = require("opn")
const express = require("express")

// 保留webpack-dev-server配置
function createDomain(options) {
	const protocol = options.https ? "https" : "http"
	// the formatted domain (url without path) of the webpack server
	return options.public ? `${protocol}://${options.public}` : url.format({
		protocol: protocol,
		hostname: options.useLocalIp ? internalIp.v4() : options.host,
		port: options.socket ? 0 : options.port.toString()
	})
}


class Serve {
	constructor (ko) {
		this.ko = ko
		this.options = ko.options
		this.wpConfig = mergeWpConf(wpConfigBase(ko), ko.options.wpDev)
	}

	start () {
		
		const prjPath = path.join(this.options.pagesDir, this.options.prjName)
	  if(!fs.existsSync(prjPath)) {
	    console.log(chalk.red(`${prjPath} not found`))
	    process.exit(1)
	  }
	  this.htmlWatcher = this.ko.watchHtml()
	  this.wpConfig.entry = this.getEntries()

	  if(_.values(this.wpConfig.entry).length == 0){
	    console.log(chalk.red(`Warn: Could not found any entries in ${this.options.prjName}`))
	    process.exit(1)
	  }
	  this.wpConfig.output.path = path.resolve(this.options.rootDir, this.options.distDir)
	  let compiler
	  try {
	  	compiler = webpack(this.wpConfig)
	  }catch(e) {
	  	if(e instanceof webpack.WebpackOptionsValidationError) {
				console.log(chalk.red(e.message))
				process.exit(1)
			}
			throw e
	  }
	  const ko = this.ko
		const devOptions = _.defaultsDeep(ko.options.devServer, {
			contentBase: this.options.pagesDir,
			host: '127.0.0.1',
			port: 9000,
	    quiet: true,
	    inline: true,
	    noInfo: true,
	    historyApiFallback: false,
	    open: true,
	    disableHostCheck: true,
	    staticOptions: {
	    	index: false
	    }
		})
		let _setup
		if(_.isFunction(devOptions.setup)) {
			_setup = devOptions.setup
		}
		devOptions.setup = (app) => {
			_setup && _setup(app)
			app.use((req, res, next) => {
        const file = req.path
        const _dirPath = path.dirname(file)
				const _basename = path.basename(file)
	      let tarPath = path.join(ko.options.pagesDir, file)
	      let distHtmlTarPath = path.join(ko.options.distDir, file)

	      // fix: webpack中间件会默认回到index.html
	      if(!/\.(html|shtml)$/.test(file)){
	      		tarPath = path.join(tarPath, 'index.html')
        		distHtmlTarPath = path.resolve(distHtmlTarPath, 'index.html')

        		if(!compiler.outputFileSystem.existsSync(path.resolve(distHtmlTarPath)))
	      		return next()
	      }
	      let _content = ''
	      if(ko.options.loadHtml) {
	      	_content = compiler.outputFileSystem.readFileSync(path.resolve(distHtmlTarPath), 'utf-8')
	      }else {
	      	_content = ko.mfs.readFileSync(path.resolve(tarPath), 'utf-8')
	      }
	      let result = ko.sincludeHtml(_content, tarPath, compiler)
	      
	      return Promise.resolve(result)
	      	.then((result) => {
	      		if(_.isFunction(ko.options.parseHtmlAsDev)) {
			      	return ko.options.parseHtmlAsDev(result)
			      }else {
			      	return Promise.resolve(result)
			      }
	      	})
	      	.then((result) => {
	      		res.setHeader("Content-Type", "text/html")
		        res.write(result)
		        res.end('<script src="http://'+ devOptions.host +':'+ devOptions.port +'/webpack-dev-server.js"></script>')
	      	})
	      	.catch((err) => {
	      		console.log(err)
	      	})
      })
			app.get(['*.(png|jpg|jpeg|svg|mp3|mp4|webp|gif)'], express.static(path.resolve('.')));
		}
		this.server = new Server(compiler, devOptions)
		this.server.listen(devOptions.port, devOptions.host, function(err) {
			if(err) throw err
			console.log(`Serving at: http:\/\/${devOptions.host}:${devOptions.port}`)
			const uri = createDomain(devOptions) + (devOptions.inline !== false || devOptions.lazy === true ? "/" : "/webpack-dev-server/")
			devOptions.open && open(uri + (devOptions.openPage || '')).catch(function() {
				console.log("Unable to open browser. If you are running in a headless environment, please do not use the open flag.")
			})
		})
		this.htmlWatcher.on('change', (file, stats) => {
			const old = this.wpConfig.entry
			const cur = this.getEntries()
			if(old != cur){
				let diff = {}
				for(const i in cur) {
					!old[i] && (diff[i] = cur[i])
				}
				for(const i in diff){
					compiler.apply(new SingleEntryPlugin(process.cwd(), diff[i], i))
				}
				this.wpConfig.entry = cur
			}
		})
		return this
	}

	getEntries () {
		const prjPath = path.join(this.options.pagesDir, this.options.prjName)
		const entryGlob = path.join(prjPath, this.options.jsEntryDir, '*.js')
	  const entryGlobPlus = path.join(prjPath, this.options.jsDir ,'*.js')
	  const entryHtmlGlob = path.join(prjPath, '*.@(html|shtml)')
	  let htmlEntries = {}
    this.options.loadHtml && (htmlEntries = getEntries([entryHtmlGlob], this.options.pagesDir, this.options.tmpDir))
	  return _.defaultsDeep(getEntries([entryGlob, entryGlobPlus], this.options.pagesDir), htmlEntries, this.wpConfig.entry)
	}

	close (cb) {
		this.htmlWatcher.close()
		return this.server.close(cb)
	}
}


module.exports = Serve