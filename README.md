KO - 快速开始Web开发的脚手架工具

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

# 初始化工程的时候会自动创建一个名为helloworld的项目
# 预览helloworld项目
$ cd demo && ko3 serve helloworld

# 查看 help
$ ko3 --help
```

## 介绍

- KO 是一个可以快速开始Web开发的脚手架工具。
- 它基于Webpack，除了基本的打包构建，还定制了组件拼装、加载性能优化、资源管理等许多实用功能。


### 基础目录结构

```sh
demo                     //工程目录
	├── mod                //通用模块
	├── page               //业务入口
	│   ├── helloworld     //项目名
	│       ├── _js        //js入口文件，由工具自动生成，请忽略
	│       ├── mod        //业务私有模块vue文件
	│       │   └── *.vue 
	│       ├── utils      //业务私有工具/JS逻辑
	│       └── *.shtml    //入口文件
	└── ko.config.js  //基础配置文件，包括项目发布路径的配置
```

### 组件开发

#### 1. 在项目的 `./page/helloworld/mod` 目录下添加一个文件hello2.vue：
```html
<template>
  <h1>Hello {{ name }}!</h1>
</template>

<script>
export default {
  data () {
    return { name: 'world2' }
  }
}
</script>

<style lang="scss">
	$red: #e4393c;
	h1 {
		color: $red;
	}
</style>
```

> - 关于 Vue 单文件组件 - 文档参考 [http://cn.vuejs.org/](http://cn.vuejs.org/)
> - 默认配置了Babel、Sass编译，可以直接使用ES6语法及Sass语法



### 引入组件

#### 1. 新建组件容器
```html
<div vm-container="bundle"></div>
```
Vue 组件的引入，必须依赖设置了 `vm-container` 属性值的容器，编译后会自动打包到 `vm-container` 属性值命名的 js 文件里。

#### 2. 引入Vue组件
```html
<div vm-container="bundle">  	
	<hello vm-type="component"></hello>
	<hello2 vm-type="component"></hello2>
</div>
```

例如：引入一个名为 **hello.vue** 的组件(*标签名等同文件名*)，同时需设置 `vm-type` 值为 `"component"`。

#### 3. 指定引入组件的目录

默认加载对应项目的 **mod** 目录文件，如需指定组件源目录，可通过 `vm-source` 属性设置。例如：引入一个与page同级的mod目录下的common.vue组件

```html
<div vm-container="bundle">  	
	<common vm-type="component" vm-source="../../mod"></common>
</div>
```

#### 4. 设置组件块加载方式

```js
<%= Sinclude("bundle", "inline") %>
```
- inline：js 资源将会内联在 html 页面中
- async：js 资源异步加载
- 不传参：默认 script 标签外链

### 项目预览

```sh
$ ko3 serve helloworld     // http://localhost:9000
```

### 项目部署

```sh
$ ko3 build helloworld     // 对page目录下的helloworld项目进行编译
```
编译后的文件会打包到对应的 **dist** 目录中

```sh
$ ko3 build helloworld -d     // 编译完成成自动通过Sftp发布到配置好的目录
```

