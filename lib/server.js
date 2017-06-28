const http = require('http')
const connect = require('connect')
const path = require('path')

class Server {
	constructor () {

		this.app = connect()
		this.server = http.createServer(this.app)

		this.useMiddleware(this.render.bind(this))
		return this
	}

	useMiddleware (m) {

	}

	render (req, res, next) {

		return this
	}

	listen (port, host) {
		host = host || '127.0.0.1'
    port = port || 3000
    this.server.listen(port, host, () => {
      console.log('Ready on http://%s:%s', host, port)
    })
    return this
	}

	close (callback) {
		return this.server.close(callback)
	}
}

module.exports = Server