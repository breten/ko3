<template>
  <h1>Hello {{ name }}!</h1>
</template>

<script>
export default {
  data: () => {
    return { name: 'world' }
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