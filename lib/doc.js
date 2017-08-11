const path = require('path')
const fs = require('fs')
const glob = require('glob')
const mkdirp = require('mkdirp')
const async = require('async')
const _ = require('lodash')
const cmtParser = require('comment-parser')
const objToJson = require('./utils').objToJson
const formatTime = require('./utils').formatTime
function parseFile(filePath) {
	return new Promise((resolve, reject) => {
		fs.readFile(filePath, 'utf-8', (err, data) => {
			if(err) {
				return reject(err)
			}
			resolve(data)
		})
	})
}

function parseFiles(files) {
	return new Promise((resolve, reject) => {
		let res = {}
		async.each(files, (filePath, callback) => {
			parseFile(filePath)
				.then(data => {
					res[filePath] = cmtParser(data)
					callback()
				})
				.catch(err => {
					console.log(err)
					callback()
				})

		}, err => {
			if(err){
				reject(err)
			}else {
				resolve(res)
			}
		})

	})
}

function getFiles(dir) {
	const globPath = path.join(dir, '**/*.js')
	return new Promise((resolve, reject) => {
		glob(globPath, (err, data) => {
			if(err)
				return reject(err)
			resolve(data, dir)
		})
	})
}

function parseDir(dir) {
	return getFiles(dir)
		.then(parseFiles)
}

function generateDocAsJson(options) {
	const filePath = options.filePath, 
				data = options.data,
				indexFilePath = options.indexFilePath
	return new Promise((resolve, reject) => {
		if(!fs.existsSync(path.resolve(filePath))){
      mkdirp.sync(path.dirname(path.resolve(filePath)))
    }
    let allConf = {}
    if(fs.existsSync(path.resolve(indexFilePath))){
    	allConf = JSON.parse(fs.readFileSync(indexFilePath, 'utf-8') || '{}')
    }
    allConf[filePath] = {
    	path: filePath,
    	updateTime: formatTime('yyyy-MM-dd hh:mm:ss')
    }

    fs.writeFileSync(indexFilePath, objToJson(allConf), 'utf-8')

    fs.writeFile(filePath, objToJson(data), 'utf-8', err => {
    	if(err)
    		return reject(err)
    	resolve()
    })
	})
}

exports.parseDir = parseDir
exports.generateDocAsJson = generateDocAsJson
