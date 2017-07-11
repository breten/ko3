<template>
	<h1>{{ greeting }} world!</h1>
</template>
<script>
	module.exports = {
		data: function () {
			return {
				greeting: 'hello'
			}
		}
	}
</script>
<style>
	h1 {
		font-size: 50px;
		text-align: center;
		color: #666;		
	}
</style>