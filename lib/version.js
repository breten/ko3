const npmview = require('npmview')
const fs = require('fs')
const path = require('path')
const inquirer = require('inquirer')
const chalk = require('chalk')

function installKo (options) {
	const exec = require('child_process').exec
	let shellCode = 'npm install -g ko3@' + options.version + ' --registry=http://registry.npm.taobao.org --disturl=http://npm.taobao.org/mirrors/node'
	if (process.platform !== 'win32' && process.execPath === '\/usr\/local\/bin\/node') {
		shellCode = 'sudo ' + shellCode
  }
  const child = exec(shellCode, (error, stdout, stderr) => {
  	if(error !== null) {
  		console.log('Install error: ' + error)
  		console.log()
  		console.log(chalk.red('Try: ' + shellCode))
			options.onError && options.onError()
  		process.exit(1)
  	}
  	console.log(chalk.green('Install success!'))
  	options.onSuccess && options.onSuccess() 
  })

}

function getPkgVersion(){
	let info = {}
	try {
		info = JSON.parse(String(fs.readFileSync(path.join(__dirname, '../package.json'))))
	}catch(e){
		console.log(e)
	}
	return info["__version"] || info.version
}

function setPkgVersion(version){
	let info = {}
	try {
		info = JSON.parse(String(fs.readFileSync(path.join(__dirname, '../package.json'))))
	}catch(e){
	}
	info["__version"] = version
	fs.writeFileSync(path.join(__dirname, '../package.json'), JSON.stringify(info))
}

function versionToNum(version){
	const _r = version.split('.')
	let t = 0
	for(let i=_r.length - 1; i >= 0; i--){
		t += _r[i] * Math.pow(10, _r.length - i - 1)
	}
	return t
}

function checkAndUpdate(callback) {
	npmview('ko3', (err, version, moduleInfo) => {
		if (!err) {
	  	const currentPkgVersion = getPkgVersion()
	    if(versionToNum(currentPkgVersion) < versionToNum(version)){
	    	let prompt = []
	      prompt.push({
	        type: 'confirm',
	        name: 'isUpdate',
	        message: 'The lastest version is ' + version + '. Do you want to update?',
	        default: true
	      })
	      inquirer.prompt(prompt).then((answers) => {
	        if (answers.isUpdate) {
	          console.log()
	          console.log(chalk.green('  Installing...'))
	          installKo({
	          	version: version
	          })
	        } else {
	          setPkgVersion(version)
	        }
	      })	
	    }else {
	    	callback()
	    }
	  }else {
	  	callback()
	  }
	})
}

module.exports = checkAndUpdate