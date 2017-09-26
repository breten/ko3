const glob = require('glob')
const path = require('path')
const chalk = require('chalk')
const fs = require('fs')
const _ = require('lodash')
const os = require('os')
const beautify = require('js-beautify').js_beautify

function getEntries (globPath, pagesDir, tmpDir) {
  let files = []
  if (Object.prototype.toString.call(globPath) === '[object Array]') {
    globPath.forEach(function(o, i) {
      files = files.concat(glob.sync(o))
    })
  } else {
    files = glob.sync(globPath)
  }
  let _entries = {}
  let entry, dirname, filename, target
  for (let i = 0; i < files.length; i++) {
    entry = files[i]
    dirname = path.dirname(entry)
    filename = path.basename(entry)
    target = path.relative(pagesDir ,path.join(dirname, filename))
    tmpDir && (target = path.join(tmpDir, target))
    _entries[target] = path.resolve(entry)
  }

  return _entries
}

function walk(path) {
  path += !/\/$/.test(path) ? '/' : '';
  let files = [],
    directs = [];
  const _temp = fs.readdirSync(path);
  _temp.forEach(function(o, i) {
    const thepath = path + o;
    const stats = fs.statSync(thepath);
    if (stats.isDirectory()) {
      const _detail = walk(thepath);
      directs = directs.concat(_detail.directs);
      files = files.concat(_detail.files);
      directs.push(thepath);
    } else {
      files.push(thepath);
    }
  });
  return {
    files: files,
    directs: directs
  }
}

function rmFolder(path, onlycontent) {
  if (!fs.existsSync(path)) {
    return;
  }
  const files = walk(path);
  files.files.forEach((o, i) => {
    fs.unlinkSync(o);
  });

  files.directs.forEach((o, i) => {
    fs.rmdirSync(o);
  });
  !onlycontent && fs.rmdirSync(path);
}

function unifyPath(str) {
  return str.replace(/\\/g, '/')
}

function mergeArray(o, p) {
  return (o || []).concat(p || [])
}

function mergeWpConf(defaultConf, custom) {
  if(!_.isObject(defaultConf) || !_.isObject(custom)){
    return defaultConf
  }

  if(custom.resolve) {
    !defaultConf.resolve && (defaultConf.resolve = {})

    if(custom.resolve.extensions){
      if(!_.isArray(custom.resolve.extensions)){
        throw `Err: config value ${custom.resolve.extensions} shuld be Array`
      }
      defaultConf.resolve.extensions = mergeArray(defaultConf.resolve.extensions, custom.resolve.extensions)
    }
    if(custom.resolve.alias) {
      if(!_.isObject(custom.resolve.alias)){
        throw `Err: config value ${custom.resolve.alias} shuld be Object`
      }
      defaultConf.resolve.alias = _.defaultsDeep(custom.resolve.alias, defaultConf.resolve.alias || {})
    }
    if(custom.resolve.modules){
      if(!_.isArray(custom.resolve.modules)){
        throw `Err: config value ${custom.resolve.modules} shuld be Array`
      }
      defaultConf.resolve.modules = mergeArray(defaultConf.resolve.modules, custom.resolve.modules)
    }
  }

  if(custom.module) {
    !defaultConf.module && (defaultConf.module = {})
    if(custom.module.rules){
      if(!_.isArray(custom.module.rules)){
        throw `Err: config value ${custom.module.rules} shuld be Array`
      }
      defaultConf.module.rules = mergeArray(defaultConf.module.rules, custom.module.rules)
    }
    if(custom.module.plugins){
      if(!_.isArray(custom.module.plugins)){
        throw `Err: config value ${custom.module.plugins} shuld be Array`
      }
      defaultConf.module.plugins = mergeArray(defaultConf.module.plugins, custom.module.plugins)
    }
  }
  if(custom.entry) {
    defaultConf.entry = custom.entry
  }
  return defaultConf
}

const homedir = function () {
  function homedir() {
    var env = process.env;
    var home = env.HOME;
    var user = env.LOGNAME || env.USER || env.LNAME || env.USERNAME;

    if (process.platform === 'win32') {
      return env.USERPROFILE || env.HOMEDRIVE + env.HOMEPATH || home || null;
    }

    if (process.platform === 'darwin') {
      return home || (user ? '/Users/' + user : null);
    }

    if (process.platform === 'linux') {
      return home || (process.getuid() === 0 ? '/root' : (user ? '/home/' + user : null));
    }

    return home || null;
  }
  return typeof os.homedir === 'function' ? os.homedir : homedir;
} ()

function objToJson (obj) {
  return beautify(JSON.stringify(obj || {}), {
    indent_size: 2
  })
}

function formatTime(format, dateObj){
  var dateObj = dateObj || new Date();

  var o = {
      "M+": dateObj.getMonth() + 1, //month
      "d+": dateObj.getDate(), //day
      "h+": dateObj.getHours(), //hour
      "m+": dateObj.getMinutes(), //minute
      "s+": dateObj.getSeconds(), //second
      "q+": Math.floor((dateObj.getMonth() + 3) / 3), //quarter
      "S": dateObj.getMilliseconds() //millisecond
    }

    if (/(y+)/.test(format)) format = format.replace(RegExp.$1, (dateObj.getFullYear() + "").substr(4 - RegExp.$1.length));
    for (var k in o)
      if (new RegExp("(" + k + ")").test(format))
        format = format.replace(RegExp.$1,
          RegExp.$1.length == 1 ? o[k] :
          ("00" + o[k]).substr(("" + o[k]).length));
    return format;
}

function getApis(content) {
  const apiReg = /[\'\"](https?)?\/\/[^\.\'\"\n]+(\.[^\.\'\"\n]+)+[^\'\"\n]*[\'\"]/g
  const res = content.match(new RegExp(apiReg, 'g'))
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

exports.getEntries = getEntries
exports.rmFolder = rmFolder
exports.unifyPath = unifyPath
exports.mergeWpConf = mergeWpConf
exports.homedir = homedir
exports.objToJson = objToJson
exports.formatTime = formatTime
exports.getApis = getApis
