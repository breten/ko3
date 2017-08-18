const path = require('path')
const fs = require('fs')
const glob = require('glob')
const mkdirp = require('mkdirp')
const async = require('async')
const _ = require('lodash')
const md5 = require('md5')
const cmtParser = require('comment-parser')
const objToJson = require('./utils').objToJson
const unifyPath = require('./utils').unifyPath
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
	let globPath
	const stats = fs.statSync(dir);
  if (stats.isDirectory()) {
  	globPath = path.join(dir, '**/*.@(js|vue)')
  }else {
  	globPath = dir
  }
	return new Promise((resolve, reject) => {
		glob(globPath, (err, data) => {
			if(err)
				return reject(err)
			resolve(data)
		})
	})
}

function generateDocAsJsonFile(doc) {
	const filePath = doc.filePath
	const data = doc.data

	if(!fs.existsSync(path.resolve(filePath))){
    mkdirp.sync(path.dirname(path.resolve(filePath)))
  }
	return new Promise((resolve, reject) => {
		fs.writeFile(filePath, objToJson(data), 'utf-8', err => {
    	if(err)
    		return reject(err)
    	resolve()
    })
	})
}

function generateDocs(dir, options) {
	return getFiles(dir)
		.then(files => {
			let res = []
			const pathIgnore = '/(' + options.docsIgnore.join('|') + ')/'
			const reg = new RegExp(pathIgnore)
			files.forEach(o => {
				o = unifyPath(o)
				if(!reg.test('/' + o + '/'))
					res.push(o)
			})
			console.log(res)
			return Promise.resolve(res)
		})
		.then(files => {
			return new Promise((resolve, reject) => {
				let res = {}
				async.each(files, (filePath, callback) => {
					parseFile(filePath)
						.then(data => {
							res[filePath] = {
								doc: path.join(options.docsDist, filePath.replace(/\.(js|vue)$/, '.json')),
								hash: md5(data)
							}
							return Promise.resolve({
								filePath: res[filePath].doc,
								data: cmtParser(data)
							})
						})
						.then(generateDocAsJsonFile)
						.then(data => {
							callback()
						})
						.catch(err => {
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
		})
		.then(data => {
			const docsMapFilePath = path.join(options.docsDist, 'docs.map.json')
			let r = {}
			if(fs.existsSync(docsMapFilePath)) {
				r = JSON.parse(fs.readFileSync(docsMapFilePath, 'utf-8'))
			}

			for(const i in data) {
				const PTList = i.split('/')
				const len = PTList.length
				let step = r 
				let k = null
				while(k = PTList.shift()){
					if(PTList.length){
						if(step[k] === undefined){
							step[k] = {};
						}
						step = step[k];
					}else{
						if(step[k] != undefined && step[k].hash == data[i].hash){

						}else {
							step[k] = {
								hash: data[i].hash,
								updateTime: formatTime('yyyy-MM-dd hh:mm:ss'),
								doc: data[i].doc
							}
						}
					}
				}
			}
			return Promise.resolve({
				filePath: docsMapFilePath,
				data: r
			})
		})
		.then(generateDocAsJsonFile)

}

exports.generateDocs = generateDocs
