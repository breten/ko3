KO - 快速开始Web开发的脚手架工具

## 配置项

- pagesDir

	默认： `page`，用于放置项目的目录

- distDir
	
	默认： `dist`，用于放置build结果的目录

- staticDomain

	默认： `空`，静态资源域


- jsDir

	默认：`_js`，用于放置生成的js入口文件


- jsEntryDir

	默认：`js`，js入口文件存放目录

- tpls `Object`
	
	- inlineJsTpl  默认 `<script type="text/javascript">\n<%= content %></script>\n`,
  - asyncJsTpl   默认 `<script async type="text/javascript" src="<%= url %>"></script>\n`,
  - defaultJsTpl 默认 `<script type="text/javascript" src="<%= url %>"></script>\n`,

- webpack `Object`
	
	用于扩展webpack配置


## 引入js文件


1、在`js`(可通过**jsEntryDir**配置)目录里添加`main.js`文件：

```js
alert('hello world')
```

2、在html中引入：

```html
<html>
// ...
<body>
  <%= Sinclude('main', 'inline') %>
</body>
</html>
```


## 使用SCSS预处理器

默认配置Webpack了`sass-loader`插件，支持我们在项目中使用SCSS预处理器，例如：

在.vue组件中，

```html
...
<style lang="scss">

</style>
```

在入口.js文件中，

```html
import 'xxx.scss'
```

> 使用其它预处理器，可自行扩展webpack配置

## 在.html入口页中引入资源

用原生的写法在html文件中引入即可：

```html
<html>
<head>
	<meta charset="utf-8">
	<title>helloworld</title>
	<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.1.1/jquery.min.js"></script>
</head>
<body>

	<div vm-container="bundle1">
      <hello vm-type="component"></hello>
  </div>
  <%= Sinclude('bundle1', 'inline') %>
  
</body>
</html>
```

> **`注意`**
build过程中只会处理 带有`vm-container`属性的节点 及 `<%= %>`包括的部分。因此如果在`html`文件中直接引用项目里的资源将不会被打包。务必在vue组件或js入口文件中引入静态资源。



## 扩展webpack配置：添加一个插件

通过 `ko.config.js` 文件中的`webpack`配置项来扩展

```js
module.exports = {
	// ...
	webpack: {
		plugins:[
			new webpackPlugin({
				// ...
			})
		]
	}
}
```
