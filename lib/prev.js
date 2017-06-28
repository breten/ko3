const path = require('path')
const fs = require('fs')
const _ = require('lodash')
const glob = require('glob')
const htmlParser = require('htmlparser2')
const mkdirp = require('mkdirp')
const chalk = require('chalk')
const conf = {
	ssiTmp: '<!--#include virtual="<%= path %>"-->',
  sincludePath: '/sinclude/jsi/wxsq/'
}
let vmCache = {}
/**
 * 解析template
 *
 */
function parseSHTML(str, targetPath) {
  
  var ssiTmp = conf.ssiTmp;
  var compile = _.template(str);
  var result = compile({
    'Sinclude': function(vmId, includeType) {
      var r = '';
      if (vmId == 'vendor') {
        r += _.template(ssiTmp)({
          path: pathInWin(path.join(conf.sincludePath, conf.vendorPath, vmId + (includeType ? '.' + includeType : '') + '.shtml'))
        }) + '\n';
        // if(vmCache[targetPath] && vmCache[targetPath]['preLoad'] && vmCache[targetPath]['preLoad'].length > 0){
        r += '<script>\n' + getPreLoadJs(vmCache[targetPath]['preLoad'] || []) + '\n</script>';
        // }
      } else if (vmCache[targetPath] && vmCache[targetPath][vmId]) {
        vmCache[targetPath][vmId]['ppmsDatas'] && vmCache[targetPath][vmId]['ppmsDatas'].forEach(function(o, i) {
          r += _.template(ssiTmp)({
            path: pathInWin(o)
          }) + '\n';
        })
        vmCache[targetPath][vmId]['jsPath'] && (r += _.template(ssiTmp)({
          path: pathInWin(vmCache[targetPath][vmId]['jsPath'])
        }) + '\n')
      }
      return r;
    }
  })
  return cleanHtml(result);
}

function cleanHtml(html) {
  html = html.replace(/\sppms\-data\=\"[^\"\>]*\"/g, '');
  html = html.replace(/\svm\-type\=\"component\"/g, '');
  html = html.replace(/\svm\-source\=\"[^\"\>]*\"/g, '');
  html = html.replace(/\<\!\-\-[^\#][^\>]*\-\-\>/g, '');
  return html;
}

function pathInWin(str){
  return str.replace(/\\/g, '/');
}

function getVms(html, filePath) {
	var vms = [];
	var pid = path.basename(filePath, '.shtml');
	var handler = new htmlParser.DomHandler(function(error, dom) {
		if (error) {
			console.log(err);
			return;
		}
		function find(arr) {
			arr.forEach(function(o, i) {
				if (o.attribs && o.attribs['vm-container']) {
					var _vid = o.attribs['vm-container'];
					var reg = new RegExp('\<\%\=[\\s]*Sinclude\\([\\s]*[\'\"]' + _vid + '[\'\"][\\s]*\,[\\s]*[\'\"]([^\\s\'\"]*)[\'\"][\\s]*\\)[\\s]*\%\>');
					var _r = html.match(reg);
					var _includeType = _r && _r[1];

					vms.push({
						node: o,
						vid: o.attribs['vm-container'],
						include: _includeType,
						pid: pid,
						components: [],
						ppmsDatas: []
					});
				}
				if (o.children && o.children.length > 0) {
					find(o.children)
				}
			})
		}
		find(dom)
		if (vms.length > 0) {
			vms.forEach(function(vm, i) {
				var components = [];
				vm.node.children.forEach(function(o, i) {
					if (o.type == 'tag' && o.attribs['vm-type'] == 'component') {
						var _name = _.camelCase(o.name);
						var _pathAsJs = o.attribs['vm-source'] ? path.join('../', o.attribs['vm-source'], _name + '.vue') : path.join('../mod/', _name + '.vue');
						var _pathAsHtml = o.attribs['vm-source'] ? path.join('./', o.attribs['vm-source'], _name + '.vue') : path.join('./mod/', _name + '.vue');

						vm.components.push({
							name: _name,
							pathAsJs: _pathAsJs.replace(/\\/g, '/'),
							pathAsHtml: _pathAsHtml.replace(/\\/g, '/'),
						});
						o.attribs['ppms-data'] && (vm.ppmsDatas = vm.ppmsDatas.concat(o.attribs['ppms-data'].split(',')))
					}
				})
			})
		}
	})
	var parser = new htmlParser.Parser(handler);
	parser.write(html)
	parser.done();
	return vms;
}

function parseVm(content, filePath) {
  var _dirPath = path.dirname(filePath);
  var _contents = content.toString();
  var _vms = getVms(_contents, filePath);
  if (_vms.length > 0) {
    if (!fs.existsSync(path.join(_dirPath, '_js'))) {
      fs.mkdirSync(path.join(_dirPath, '_js'));
    }
    _vms.forEach(function(vm, i) {
      var _tarJsPath = path.join(_dirPath, '_js', (_.camelCase(vm.pid + '-' + vm.vid) + (vm.include ? '.' + vm.include : '') + '.js'));
      fs.writeFileSync(_tarJsPath, getJs(vm), 'utf-8');
      // 设置缓存
      !vmCache[filePath] && (vmCache[filePath] = {});
      vmCache[filePath][vm.vid] = {
        components: vm.components,
        ppmsDatas: vm.ppmsDatas,
        jsPath: getJsSincludePath(_tarJsPath)
      };
     
    })
  }
  console.log(vmCache)
}

function preParseVms(globPath) {
  var files = glob.sync(globPath);
  files.forEach(function(file, i) {
    
    const content = fs.readFileSync(file, {
       encoding: 'utf-8'
    });
    parseVm(content, path.resolve(file));

      var _dirPath = path.dirname(file),
        _basename = path.basename(file);

      var tarContent = parseSHTML(content, path.resolve(file)),
        tarPath = path.resolve('dist', _dirPath, 'html', _basename);
       console.log(tarContent,2,path.dirname(tarPath))
      mkdirp(path.dirname(tarPath), function(err) {
        if (err) {
          console.log(err);
          return;
        }
        fs.writeFileSync(tarPath, cleanHtml(tarContent), 'utf-8');
      })
  })
}

function cleanJsdir(globPath) {
  var files = glob.sync(globPath);
  files.forEach(function(file, i) {
    var absolutePath = path.join(conf.processPath, file),
      _dirPath = path.dirname(absolutePath);
    fs.existsSync(path.join(_dirPath, '_js')) && rmfolder(path.join(_dirPath, '_js'), true);
  })
}

function getJs(vm) {
  var _tpl = fs.readFileSync(path.resolve(__dirname, 'tpl/vmEntry.tpl'), {
    encoding: 'utf-8'
  });
  return _.template(_tpl)({
    components: vm.components,
    vid: vm.vid
  });
}

function getJsSincludePath(localPath) {
  var _path = localPath.replace(path.resolve('.'), '')
  return path.join(conf.sincludePath, _path).replace(/\.js/g, '.shtml');
}

function prev () {
	return new Promise((resolve, reject) => {
		const prjPath = path.join(this.options.pagesDir, this.options.prjName)
    if(!fs.existsSync(prjPath)) {
      return reject(chalk.red(`${prjPath} not found`));
    }

    const entryGlob = path.join(prjPath, '*.html')
    console.log(entryGlob)
    preParseVms(entryGlob);
    console.log(3)
    resolve()
	})
}

module.exports = prev