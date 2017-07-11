<html>
<head>
	<title>helloworld</title>
</head>
<body>

	<div vm-container="bundle1">
      <hello vm-type="component"></hello>
  </div>
  <%= Sinclude('bundle1', 'inline') %>

	<div vm-container="bundle2">
      <hello vm-type="component"></hello>
  </div>
  <%= Sinclude('bundle2', 'async') %>
  
</body>
</html>