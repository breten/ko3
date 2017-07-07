const glob = require('glob')
const path = require('path')
const fs = require('fs')

function getEntries (globPath) {
  let files = []
  if (Object.prototype.toString.call(globPath) === '[object Array]') {
    globPath.forEach(function(o, i) {
      files = files.concat(glob.sync(o))
    })
  } else {
    files = glob.sync(globPath)
  }
  let _entries = {}
  let entry, dirname, basename
  for (let i = 0; i < files.length; i++) {
    entry = files[i]
    dirname = path.dirname(entry)
    basename = path.basename(entry, '.js')
    _entries[path.join(dirname, basename).replace(/\\/g, '/')] = path.resolve(entry)
  }

  _entries['vendor'] = ['vue']
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

exports.getEntries = getEntries
exports.rmFolder = rmFolder