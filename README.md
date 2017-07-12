KO - 快速开始Web开发的命令行工具

## 安装

> **`提醒`**
由于依赖的包比较多，第一次安装耗时很长很长，请稍微耐心等待一下。
推荐使用淘宝的 npm 镜像进行安装，执行 npm 安装命令时带上 `--registry=https://registry.npm.taobao.org`。
另外 `node-sass` 这个包需要编译，可以设置 `SASS_BINARY_SITE=https://npm.taobao.org/mirrors/node-sass/`，安装已经编译好的版本。

```sh
# 全局安装 Node >= 6
# mac/linux
$ SASS_BINARY_SITE=https://npm.taobao.org/mirrors/node-sass/ npm install -g ko3 --registry=https://registry.npm.taobao.org
```

## 使用

```sh
# 初始化工程
$ ko3 init demo

# 预览helloworld项目
$ cd demo && ko3 serve helloworld

# 查看 help
$ ko3 --help
```

## 介绍

### 主要功能

- .vue单文件组件快捷拼装(默认基于Vue开发，适合于组件逻辑相对独立并且可能会被多个页面引用的项目开发场景)
- 定制的Webpack配置(Sass、babel、file-loader、代码压缩合并等)，**无需配置即可进行开发**，同样支持自定义配置
- 页面资源分块打包、加载管理及版本号控制

### 基础目录结构

```sh
	├── mod                //通用模块
	├── page               //业务入口
	│   ├── xxx            //项目名
	│       ├── _js        //js入口文件，由工具自动生成，请忽略
	│       ├── mod        //业务私有模块vue文件
	│       │   └── *.vue 
	│       ├── utils      //业务私有工具/JS逻辑
	│       └── *.shtml    //入口文件
	└── ko.config.js  //基础配置文件，包括项目发布路径的配置
```

### 组件开发

#### 1. 使用 Vue 单文件组件
- 文档参考 [http://cn.vuejs.org/](http://cn.vuejs.org/)

#### 2. 使用 ES6 语法
- 参考Babel文档

#### 3. 文件存放目录
- `*.vue` 文件默认存放在 `/page/projectName/mod` 目录下，其它目录在引入的时候需要指定路径

### 如何引入组件

#### 1. 新建组件容器
```html
<div vm-container="firstScreen"></div>
```
Vue 组件的引入，必须依赖设置了 `vm-container` 属性值的容器，编译后会自动打包到 `vm-container` 属性值命名的 js 文件里。

#### 2. 引入Vue组件
```html
<div vm-container="firstScreen">  	
	<banner vm-type="component"></banner>
	<goodlist vm-type="component"></goodlist>
</div>
```

例如：引入一个名为 **banner.vue** 的组件(*标签名等同文件名*)，同时需设置 `vm-type` 值为 `"component"`。

默认加载对应项目的 **mod** 目录文件，如需指定组件源目录，可通过 `vm-source` 属性设置。

#### 3. 设置组件加载方式
```js
<%= Sinclude("firstScreen", "inline") %>
```
- inline：js 资源将会内联在 html 页面中
- async：js 资源异步加载
- 不传参：默认 script 标签外链

### 项目部署

```js
$ ko3 build helloworld     // 对page目录下的helloworld项目进行编译
```
编译后的文件会打包到对应的 **dist** 目录中

```js
$ ko3 build helloworld -d     // 编译完成成自动通过Sftp发布到配置好的目录
```

