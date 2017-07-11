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

let vmCache = {}

/**
 * 解析template
 *
 */
function sinclude(str, targetPath, dev) {
  const compile = _.template(str)
  const ko = this
  let result = compile({
    'Sinclude': function(vmId, includeType) {
      let r = ''
      if (vmCache[targetPath] && vmCache[targetPath][vmId] && vmCache[targetPath][vmId]['jsPath']) {
        const jsPath = vmCache[targetPath][vmId]['jsPath']
        const dir = jsPath.replace(ko.options.distDir, '')
        const dirForDev = jsPath.replace(ko.options.distDir, '')
        let _c 
        if(dev) {
          if(dev.outputFileSystem.existsSync(path.resolve(jsPath)))
          _c = dev.outputFileSystem.readFileSync(path.resolve(jsPath), 'utf-8')
        }else{
          _c = fs.readFileSync(path.resolve(jsPath), {
            encoding: 'utf-8'
          })
        }
        switch (includeType) 
        {
        case 'inline':            
          r += _.template(ko.options.tpls.inlineJsTpl)({
            content: _c
          }) + '\n'
          break
        case 'async':
          let _url
          if(dev) {
            _url = dirForDev
          }else {
            _url = ko.options.jsDomain + dir + '?_v=' + md5(_c).slice(0, 8)
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
            _src = ko.options.jsDomain + dir + '?_v=' + md5(_c).slice(0, 8)
          }
          r += _.template(ko.options.tpls.defaultJsTpl)({
            url: _src
          }) + '\n'
        }
      }
      if(_.isFunction(ko.options.parseVmConfAsDev) && vmCache[targetPath][vmId]){
        r = ko.options.parseVmConfAsDev(vmCache[targetPath][vmId]) + r
      }
      return r
    }
  })
  
  // vendor插入到body标签的后面
  result = result.replace(/(\<body[^\>]*\>)/, function(a, b, c, d){
    const vendorPath = path.join(ko.options.distDir, 'vendor.bundle.js')
    let _c
    if(dev) {
      if(dev.outputFileSystem.existsSync(path.resolve(vendorPath)))
      _c = dev.outputFileSystem.readFileSync(path.resolve(vendorPath), 'utf-8')
    }else{
      _c = fs.readFileSync(path.resolve(vendorPath), {
        encoding: 'utf-8'
      })
    }
    return b + '\n' + _.template(ko.options.tpls.inlineJsTpl)({
      content: _c
    }) + '\n'
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
					const reg = new RegExp('\<\%\=[\\s]*Sinclude\\([\\s]*[\'\"]' + _vid + '[\'\"][\\s]*\,[\\s]*[\'\"]([^\\s\'\"]*)[\'\"][\\s]*\\)[\\s]*\%\>')
					const _r = html.match(reg)
					const _includeType = _r && _r[1]

					vms.push({
						node: o,
						vid: o.attribs['vm-container'],
						include: _includeType,
						pid: pid,
						components: [],
						ppmsDatas: []
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
							pathAsJs: _pathAsJs.replace(/\\/g, '/'),
							pathAsHtml: _pathAsHtml.replace(/\\/g, '/'),
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
  const ko = this
  const _dirPath = path.dirname(filePath)
  const _contents = content.toString()
  const _vms = getVms(_contents, filePath)
  if (_vms.length > 0) {
    if (!fs.existsSync(path.join(_dirPath, ko.options.jsDir))) {
      fs.mkdirSync(path.join(_dirPath, ko.options.jsDir))
    }
    _vms.forEach((vm, i) => {
      const _tarJsPath = path.join(_dirPath, ko.options.jsDir, (_.camelCase(vm.pid + '-' + vm.vid) + (vm.include ? '.' + vm.include : '') + '.js'))
      const _distJsPath = path.join(ko.options.distDir, path.relative(ko.options.pagesDir ,_dirPath), ko.options.jsDir, (_.camelCase(vm.pid + '-' + vm.vid) + (vm.include ? '.' + vm.include : '') + '.js'))
      fs.writeFileSync(_tarJsPath, getJs(vm, ko.options.tpls.vmEntryTpl), 'utf-8')
      // 设置缓存
      !vmCache[filePath] && (vmCache[filePath] = {})
      vmCache[filePath][vm.vid] = {
        components: vm.components,
        ppmsDatas: vm.ppmsDatas,
        jsPath: _distJsPath
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
    vid: vm.vid
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
      const _content = this.mfs.readFileSync(tarPath).toString()
      const content = sinclude.call(this, _content, file)
      // mfs -> fs
      mkdirp(path.dirname(distTarPath), function(err) {
        if (err) {
          reject(err)
          return
        }
        fs.writeFileSync(distTarPath, content, 'utf-8')
      })
    }.bind(this))
    resolve()
  })
}

exports.parse = parse
exports.output = output
exports.watch = watch
exports.sinclude = sinclude