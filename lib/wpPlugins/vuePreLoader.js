const path = require('path')
const queryToJson = require('query-to-json').queryToJson

function pathToDot(str) {
	return str.replace(/\//g, '.')
}

module.exports = function (content) {
	this.cacheable()

	const exportReg = /(export\s+default\s+|module\.exports\s*\=\s*)\{/
  const filePath = this.resourcePath
  const query = queryToJson(this.query)
  const fileName = path.basename(filePath)
  const rootDir = path.resolve('.')
  const relPath = path.relative(rootDir, filePath)
  
	if(new RegExp('^' + query.pagesDir).test(relPath)){
		content = content.replace(exportReg, function(a, b, c){
			return a + '\n' + '"modloc": "' + pathToDot(relPath) + '",\n'
		})

	}

	return content;
}