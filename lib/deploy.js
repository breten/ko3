var path = require('path');
var vfs = require('vinyl-fs');
var ssh = require('./ssh');
var rootPath = process.cwd();
var glob = require('glob');
var gutil = require('gulp-util');

function deploy () {
	var koOptions = this.options;
	var conf = koOptions.sftp;
	var gulpSSH = new ssh({
	  sshConfig: conf
	});
	var htmlPaths = [koOptions.prjName];
	var jsPaths = [path.join(koOptions.distDir, koOptions.pagesDir, koOptions.prjName || '*', koOptions.jsDir, '*.js'),
				path.join(koOptions.distDir, koOptions.pagesDir, koOptions.prjName || '*', '*.js')];
	function pathInWin(str){
		return str.replace(/\\/g, '/');
	}

	function getPublist(){
		var _rPath = path.join(rootPath, koOptions.distDir, koOptions.pagesDir);
		var files = glob.sync(path.join(_rPath, koOptions.prjName, '*.js')).concat(glob.sync(path.join(_rPath, (koOptions.prjName || '*'), koOptions.jsDir, '*.*')));
		console.log(gutil.colors.green('The uploaded list:'))
		files.forEach(function(o, i){
			console.log('    ' + gutil.colors.bgCyan(o.replace(pathInWin(_rPath),/.shtml$/.test(o) ? conf.remotePathJsi : conf.remotePath)));
		});

		var _rPathHtml = path.join(rootPath, koOptions.pagesDir);
		var filesHtml = glob.sync(path.join(_rPathHtml, (koOptions.prjName || '*'), '*.@(shtml|html)'));
		
		filesHtml.forEach(function(o, i){
			console.log('    ' + gutil.colors.bgCyan(o.replace(pathInWin(_rPathHtml), conf.remotePathHtml)));
		});
		console.log('');
	}
	function sendJs() {
		return new Promise(function(resolve, reject){
			vfs.src(jsPaths,{
				base: path.join(rootPath, koOptions.distDir, koOptions.pagesDir)
			})
			.pipe(gulpSSH.dest(conf.remotePath))
			.on('finish', function () {
				resolve();
			})
		})
	}

	function getSend(prj, type) {
		var gPath = path.join(koOptions.distDir, koOptions.pagesDir, prj, type, '*.@(shtml|html)' );
		return function(){
			return new Promise(function(resolve, reject){
				vfs.src(gPath,{
					base: path.join(rootPath, koOptions.distDir, koOptions.pagesDir, prj, type)
				})
				.pipe(gulpSSH.dest(path.join(conf.remotePathHtml, prj)))
				.on('finish', function () {
					 resolve();
				})
			})
		}
	}
	function sshEnd() {
		gulpSSH.close();
		getPublist();
	}
	var arr = [sendJs];
	htmlPaths.forEach(function(o, i){
		arr.push(getSend(o, 'html'));
	})
	arr.push(sshEnd);

	return arr.reduce(function(cur, next){
		return cur.then(next);
	}, Promise.resolve())

}

module.exports = deploy