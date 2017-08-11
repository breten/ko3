const path = require('path') 
const fs = require('fs')
const _ = require('lodash')
const glob = require('glob')
const htmlParser = require('htmlparser2')
const mkdirp = require('mkdirp')
const chalk = require('chalk')
const chokidar = require('chokidar')
const md5 = require('md5')
const rmFolder = require('./utils').rmFolder
const unifyPath = require('./utils').unifyPath
const formatTime = require('./utils').formatTime
const domUtils = require('domutils')
const vueHtml = require('vue-template-compiler')
const transpile = require('vue-template-es2015-compiler')
const beautify = require('js-beautify').js_beautify

let vmCache = {}, pagesStats = {}

/**
 * 解析template
 *
 */
function sinclude(str, targetPath, dev) {
  const compile = _.template(str)
  const ko = this
  const script = /(<)((\\\/|\/)?script>)/g
  targetPath = unifyPath(targetPath)
  let result = compile({
    'Sinclude': function(vmId, includeType) {
      let r = '', jsPath, dir, dirForDev, _c = ''
      if (vmCache[targetPath] && vmCache[targetPath][vmId] && vmCache[targetPath][vmId]['jsPath']) {
        jsPath = vmCache[targetPath][vmId]['jsPath']
      }else {
        jsPath = path.join(ko.options.distDir, path.dirname(targetPath).replace(ko.options.pagesDir, ''), ko.options.jsEntryDir, vmId + '.js')
        // if(fs.existsSync(unifyPath(jsPath.replace(ko.options.distDir, ''))))
        const theFilePath = unifyPath(jsPath.replace(ko.options.distDir, ko.options.pagesDir))
        if(fs.existsSync(path.resolve(theFilePath))){
          !vmCache[targetPath] && (vmCache[targetPath] = {})
          vmCache[targetPath][vmId] = {
            jsPath: jsPath,
            filePath: theFilePath
          }
        }
      }
      vmCache[targetPath][vmId]['includeType'] = includeType || 'default'
      dir = unifyPath(jsPath.replace(ko.options.distDir, ''))
      dirForDev = unifyPath(jsPath.replace(ko.options.distDir, ''))
      if(dev) {
        if(dev.outputFileSystem.existsSync(path.resolve(jsPath))){
          _c = dev.outputFileSystem.readFileSync(path.resolve(jsPath), 'utf-8')
        }else {
          throw new Error(`${vmId} bundle at ${targetPath} not found`)
        }
      }else{
        if(fs.existsSync(path.resolve(jsPath))){
          _c = fs.readFileSync(path.resolve(jsPath), {
            encoding: 'utf-8'
          })
        }else {
          throw new Error(`${vmId} bundle at ${targetPath} not found`)
        }
        
      }
      switch (includeType) 
      {
      case 'inline':            
        r += _.template(ko.options.tpls.inlineJsTpl)({
          content: _c.replace(script, '\\x3C$2')
        }) + '\n'
        break
      case 'async':
        let _url
        if(dev) {
          _url = dirForDev
        }else {
          _url = ko.options.staticDomain + dir + '?_v=' + md5(_c).slice(0, 8)
        }
        r += _.template(ko.options.tpls.asyncJsTpl)({
          url: _url
        }) + '\n'
      break
      default: 
        let _src
        if(dev) {
          _src = dirForDev
        }else {
          _src = ko.options.staticDomain + dir + '?_v=' + md5(_c).slice(0, 8)
        }
        r += _.template(ko.options.tpls.defaultJsTpl)({
          url: _src
        }) + '\n'
      }
      // deprecated
      if(_.isFunction(ko.options.parseVmConfAsDev) && vmCache[targetPath] && vmCache[targetPath][vmId]){
        r = ko.options.parseVmConfAsDev(vmCache[targetPath][vmId]) + r
      }
      return r
    }
  })
  
  // vendor插入到body标签的后面
  result = result.replace(/(\<\/head[^\>]*\>)/, function(a, b, c, d){
    const vendorPath = path.join(ko.options.distDir, ko.options.prjName, 'vendor.bundle.js')
    let _c
    if(dev) {
      if(dev.outputFileSystem.existsSync(path.resolve(vendorPath)))
      _c = dev.outputFileSystem.readFileSync(path.resolve(vendorPath), 'utf-8')
    }else{
      _c = fs.readFileSync(path.resolve(vendorPath), {
        encoding: 'utf-8'
      })
    }
    return '\n' + _.template(ko.options.tpls.inlineJsTpl)({
      content: _c.replace(script, '\\x3C$2')
    }) + '\n' + b
  })
  return result
}

function cleanHtml(html) {
  html = html.replace(/\sppms\-data\=\"[^\"\>]*\"/g, '')
  html = html.replace(/\svm\-type\=\"component\"/g, '')
  html = html.replace(/\svm\-source\=\"[^\"\>]*\"/g, '')
  html = html.replace(/\<\!\-\-[^\#][^\>]*\-\-\>/g, '')
  return html
}

function cleanTemplate(html) {
  html = html.replace(/\svm\-type\=\"component\"/g, '')
  html = html.replace(/\svm\-source\=\"[^\"\>]*\"/g, '')
  return html
}

function toFunction (code) {
  return 'function () {' + beautify(code, {
    indent_size: 2 // eslint-disable-line camelcase
  }) + '}'
}

function getVms(html, filePath) {
	let vms = []
	const pid = path.basename(filePath)
	const handler = new htmlParser.DomHandler((error, dom) => {
		if (error) {
			console.log(err)
			return
		}
		function find(arr) {
			arr.forEach((o, i) => {
				if (o.attribs && o.attribs['vm-container']) {
					const _vid = o.attribs['vm-container']
					vms.push({
						node: o,
						vid: o.attribs['vm-container'],
						pid: pid,
						components: [],
						ppmsDatas: [],
            outHtml: cleanTemplate(domUtils.getOuterHTML(o))
					})
				}
				if (o.children && o.children.length > 0) {
					find(o.children)
				}
			})
		}
		find(dom)
		if (vms.length > 0) {
			vms.forEach((vm, i) => {
				let components = []
				vm.node.children.forEach((o, i) => {
					if (o.type == 'tag' && o.attribs['vm-type'] == 'component') {
						const _name = _.camelCase(o.name)
						const _pathAsJs = o.attribs['vm-source'] ? path.join('../', o.attribs['vm-source'], _name + '.vue') : path.join('../mod/', _name + '.vue')
						const _pathAsHtml = o.attribs['vm-source'] ? path.join('./', o.attribs['vm-source'], _name + '.vue') : path.join('./mod/', _name + '.vue')

						vm.components.push({
							name: _name,
							pathAsJs: unifyPath(_pathAsJs),
							pathAsHtml: unifyPath(_pathAsHtml),
						})
						o.attribs['ppms-data'] && (vm.ppmsDatas = vm.ppmsDatas.concat(o.attribs['ppms-data'].split(',')))
					}
				})
			})
		}
	})
	const parser = new htmlParser.Parser(handler)
	parser.write(html)
	parser.done()
	return vms
}

function parseVm(content, filePath) {
  filePath = unifyPath(filePath)
  const ko = this
  const _dirPath = path.dirname(filePath)
  const _contents = content.toString()
  const _vms = getVms(_contents, filePath)
  const _titleReg = /\<title\>(.*)\<\/title\>/i.exec(_contents)
  const _title = _titleReg ? _titleReg[1] : ''
  !pagesStats[filePath] && (pagesStats[filePath] = {
    title: _title
  })
  if (_vms.length > 0) {
    if (!fs.existsSync(path.join(_dirPath, ko.options.jsDir))) {
      fs.mkdirSync(path.join(_dirPath, ko.options.jsDir))
    }
    _vms.forEach((vm, i) => {
      const _tarJsPath = path.join(_dirPath, ko.options.jsDir, (_.camelCase(vm.pid + '-' + vm.vid) + '.js'))
      const _distJsPath = path.join(ko.options.distDir, path.relative(ko.options.pagesDir ,_dirPath), ko.options.jsDir, (_.camelCase(vm.pid + '-' + vm.vid) + '.js'))
      fs.writeFileSync(_tarJsPath, getJs(vm, ko.options.tpls.vmEntryTpl), 'utf-8')
      // 设置缓存
      !vmCache[filePath] && (vmCache[filePath] = {})
      vmCache[filePath][vm.vid] = {
        components: vm.components,
        ppmsDatas: vm.ppmsDatas,
        jsPath: _distJsPath,
        filePath: _tarJsPath
      }
    })
  }
}

function preParseVms(globPath) {
  const files = glob.sync(globPath)
  cleanJsdir.call(this, globPath)
  files.forEach(((file, i) => {
      const content = fs.readFileSync(file, {
         encoding: 'utf-8'
      })
      parseVm.call(this, content, file)
      const _dirPath = path.dirname(file),
            _basename = path.basename(file)
      const tarContent = content,
            tarPath = path.resolve(_dirPath, _basename)
      this.mfs.mkdirpSync(path.dirname(tarPath))
      this.mfs.writeFileSync(tarPath, cleanHtml(tarContent), 'utf-8')
    }).bind(this))
}

function cleanJsdir(globPath) {
  const ko = this
  const files = glob.sync(globPath)
  files.forEach((file, i) => {
    const absolutePath = path.resolve(file),
      _dirPath = path.dirname(absolutePath)
    fs.existsSync(path.join(_dirPath, ko.options.jsDir)) && rmFolder(path.join(_dirPath, ko.options.jsDir), true)
  })
}

function getJs(vm, vmEntryTpl) {
  return _.template(vmEntryTpl)({
    components: vm.components,
    vid: vm.vid,
    render: transpile(
      'var render = ' + toFunction(vueHtml.compile(vm.outHtml).render) + '\n'
    )
  })
}

function parse () {
	return new Promise((resolve, reject) => {
		const prjPath = path.join(this.options.pagesDir, this.options.prjName)
    if(!fs.existsSync(prjPath)) {
      return reject(chalk.red(`${prjPath} not found`))
    }
    const entryGlob = path.join(prjPath, '*.@(html|shtml)')
    preParseVms.call(this, entryGlob)
    resolve()
	})
}

function watch () {
  const prjPath = path.join(this.options.pagesDir, this.options.prjName)
  if(!fs.existsSync(prjPath)) {
    return reject(chalk.red(`${prjPath} not found`))
  }
  const entryGlob = path.join(prjPath, '*.@(html|shtml)')
  preParseVms.call(this, entryGlob)

  const watcher = chokidar.watch(entryGlob)
  watcher.on('change', (thePath, stats) => {
    const contents = fs.readFileSync(thePath, {
      encoding: 'utf-8'
    })
    parseVm.call(this, contents, thePath);
    const tarPath = path.resolve(thePath)
    this.mfs.mkdirpSync(path.dirname(tarPath))
    this.mfs.writeFileSync(tarPath, contents, 'utf-8')
  })
  return watcher
}

function mergeStats() {
  _.map(pagesStats, function(o, i){
   if(vmCache[i]) {
     let bundles = []
     _.map(vmCache[i], function(m, n){
       bundles.push({
        name: n,
        jsPath: m.filePath,
        includeType: m.includeType
       })
     })
     o.bundles = bundles
   }
  })
  return pagesStats
}

function output() {
  return new Promise((resolve, reject) => {
    
    const prjPath = path.join(this.options.pagesDir, this.options.prjName)
    if(!fs.existsSync(prjPath)) {
      return reject(chalk.red(`${prjPath} not found`))
    }

    const entryGlob = path.join(prjPath, '*.@(html|shtml)')
    const files = glob.sync(entryGlob)
    files.forEach(function(file, i) {
      const _dirPath = path.dirname(file),
          _basename = path.basename(file)

      const tarPath = path.resolve(_dirPath, _basename)
      const distTarPath = path.resolve(this.options.distDir, path.relative(this.options.pagesDir, _dirPath), _basename)
      let _content = ''
      if(this.options.loadHtml){
        // 经过html-loader处理的文件
        _content = fs.readFileSync(distTarPath, 'utf-8')
      }else {
        _content = this.mfs.readFileSync(tarPath).toString()
      }
      const content = sinclude.call(this, _content, file)

      // mfs -> fs
      mkdirp.sync(path.dirname(distTarPath))
      fs.writeFileSync(distTarPath, content, 'utf-8')
    }.bind(this))
    
    const stats = mergeStats(vmCache)
    
    resolve(stats)
  })
}

function sitemap(stats) {
  return new Promise((resolve, reject) => {
    if(!this.options.dependsDist){
      return resolve(stats)
    }
    const dependsDist = path.join(this.options.dependsDist, this.options.prjName, 'depends.json')
    if(this.mfs.existsSync(path.resolve(dependsDist))){
      let depends = JSON.parse(this.mfs.readFileSync(path.resolve(dependsDist), 'utf-8'))
      depends.pages = stats
      mkdirp.sync(path.dirname(path.resolve(dependsDist)))
      fs.writeFileSync(path.resolve(dependsDist), beautify(JSON.stringify(depends), {
        indent_size: 2
      }), 'utf-8')
    }
    const sitemapEntryDist = path.join(this.options.dependsDist, 'sitemap.json')
    let sitemap = {}
    if(fs.existsSync(path.resolve(sitemapEntryDist))){
      sitemap = JSON.parse(fs.readFileSync(path.resolve(sitemapEntryDist), 'utf-8'))
    }else {
      mkdirp.sync(path.dirname(path.resolve(sitemapEntryDist)))
    }
    let appConf = {}, appConfPath = path.join(this.options.pagesDir, this.options.prjName, 'config.json')
    if(fs.existsSync(path.resolve(appConfPath))){
      appConf = JSON.parse(fs.readFileSync(path.resolve(appConfPath), 'utf-8'))
    }

    sitemap[this.options.prjName] = _.defaultsDeep({
      depends: dependsDist,
      updateTime: formatTime('yyyy-MM-dd hh:mm:ss')
    },appConf)

    fs.writeFileSync(path.resolve(sitemapEntryDist), beautify(JSON.stringify(sitemap), {
      indent_size: 2
    }), 'utf-8')
    resolve(stats)
  })
}

exports.parse = parse
exports.output = output
exports.watch = watch
exports.sinclude = sinclude
exports.sitemap = sitemap