var fs    = require('fs'),
    path  = require('path');
function isEmptyObject(e) {  
    var t;  
    for (t in e)  
        return !1;  
    return !0  
} 
function run(dir, rootPath, tplPath){
	if(Object.prototype.toString.call(dir) !== '[object Object]'){
		throw 'Error: initDir.js param error'
	}
	for(var i in dir){
		if(typeof dir[i] === 'string'){
			// file
			var content = '';
			var _targetPath = path.join(rootPath, i);
			if(/\.tpl$/.test(dir[i])) {
				var _tplPath = path.join(tplPath, dir[i]);
				if(fs.existsSync(_tplPath)){
					content = fs.readFileSync(_tplPath, {encoding: 'utf-8'})
				}else {
					content = dir[i]
				}
			}else {
				content = dir[i]
			}
			fs.writeFileSync(_targetPath, content, 'utf-8');
		}else if(Object.prototype.toString.call(dir[i]) === '[object Object]'){
			// dir
			var _dir = path.join(rootPath, i);
			!fs.existsSync(_dir) && fs.mkdirSync(_dir)
			if(!isEmptyObject(dir[i])){
				run(dir[i], _dir, tplPath);
			}
		}
	}
}
module.exports = run;
