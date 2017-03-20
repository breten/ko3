#!/usr/bin/env node
var argv = require('yargs');
var program = require('commander');
var shelljs = require('shelljs');
var fs = require('fs');
var path = require('path');
var chalk = require('chalk');
var processPath = process.cwd();
var initDir = require('./lib/initDir.js');

function findWebpackRoot(thePath){
	if(thePath == '/'){
		return null;
	}
	if(fs.existsSync(path.join(thePath, 'webpack.config.js'))){
		return thePath;
	}else{
		return findWebpackRoot(path.join(thePath, '../'));
	}
}

function getScriptParam(prj){
	if(prj){
		return ' -- --prj="' + prj + '"';
	}
	return '';
}

var conf,
	webpackRoot = findWebpackRoot(processPath);

program
	.command('new [name]')
	.alias('n')
	.description('Create a new project or file')
	.option('-p, --page', 'create a new html file')
	.action(function(name, option){
		if(!option.page){
			var _dir = {};
				_dir[name] = conf.moduleInit.newPrj;
			if(fs.existsSync(path.join(webpackRoot, 'page', name))){
				console.log(chalk.red('    Warn: The project already exists.'));
			}else{
				initDir(_dir, path.join(webpackRoot, 'page'), webpackRoot);
				console.log(chalk.green(name + ' created!'))
			}
		}else{
			var _dir = {}
				_tarName = name + '.shtml';
				_dir[_tarName] = conf.moduleInit.newHtml;
			if(fs.existsSync(path.join(processPath, _tarName))){
				console.log(chalk.red('    Warn: The file already exists.'));
			}else{
				initDir(_dir, processPath, webpackRoot)
				console.log(chalk.green(_tarName + ' created!'))
			}
		}
	})

program
	.command('serve [project]')
	.alias('s')
	.description('Serve the project at localhost:9000')
	.action(function(project){
		shelljs.exec( 'cd ' + webpackRoot );
		shelljs.exec( 'npm run dev' + getScriptParam(project) );
	})

program
	.command('build [project]')
	.alias('b')
	.option('-p, --publish', 'publish the project after build')
	.description('Build the project')
	.action(function(project, option){
		shelljs.exec( 'npm run build' + getScriptParam(project) )
		if(option.publish){
			shelljs.exec( 'npm run pub' + getScriptParam(project) )
		}
	})

program
	.command('debug [project]')
	.alias('d')
	.description('The same as run webpack watch')
	.action(function(project){
		shelljs.exec( 'npm run debug' + getScriptParam(project) )
	})

program
	.command('load')
	.alias('l')
	.action(function(project){
		shelljs.exec( 'npm run load' )
	})

program
	.command('*')
	.action(function(){
		console.log("Invalid command. See 'ko --help'.")
	})

if(!webpackRoot){
	console.log( chalk.red("    ERR: Invalid project. Check the path!") );
}else {
	conf = require(path.join(webpackRoot, 'webpack.config.js'));
	program.parse(process.argv);
	if (!process.argv.slice(2).length) {
		program.outputHelp();
	}
}