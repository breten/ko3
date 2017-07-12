/**
* ko配置
*
*/

module.exports = {
	pagesDir: 'page',
	distDir : 'dist',
	sftp    : { //SFTP发布配置
        host: '',
        username: '',
        password: '',
        port: 22,
        // js 路径
        remotePath: '',
        // html入口文件
        remotePathHtml: ''
    },
    staticDomain : ''
}