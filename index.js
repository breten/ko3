#!/usr/bin/env node
var argv = require('yargs');
var shelljs = require('shelljs');
var fs = require('fs');
var path = require('path');
var processpath = process.cwd();

if(!fs.existsSync(path.join(processpath, 'webpack.config.js'))){
	console.error( "ERR: Can not find the file webpack.config.js" );
}

function server(){
	shelljs.exec( 'npm run dev' )
}

function build(argv){
	shelljs.exec( 'npm run build -- --prj="'+ argv.project +'"' )
}

function publish(argv){
	shelljs.exec( 'npm run pub -- --prj="'+ argv.project +'"' )
}

function create(argv){
	shelljs.exec( 'npm run m "'+ argv.project +'"' )
}

function debug(){
	shelljs.exec( 'npm run debug' )
}

function load(){
	shelljs.exec( 'npm run load' )
}
argv
.command({
	command: 'new <project>',
	aliases: ['n'],
	desc: "Create a new project",
	handler: create
})
.command({
	command: 'server',
	aliases: ['s'],
	desc: "Serve all projects at 127.0.0.1:9000",
	handler: server
})
.command({
	command: 'build <project>',
	aliases: ['b'],
	desc: "Build the project",
	handler: build
})
.command({
	command: 'publish <project>',
	aliases: ['pu'],
	desc: "Publish the project",
	handler: publish
})
.command({
	command: 'debug',
	aliases: ['d'],
	desc: "The same as run webpack watch",
	handler: debug
})
.command({
	command: 'load',
	aliases: ['l'],
	desc: "Load the dependencies from legos",
	handler: load
})
.command({
	command: '*',
	handler: function(){
		console.log('No such command,try ko -h')

	}
})
.usage( 'Usage: $0 <command> [options]' )
.help( 'h' )
.argv;

if (!process.argv.slice(2).length) {
    argv.showHelp();
}
