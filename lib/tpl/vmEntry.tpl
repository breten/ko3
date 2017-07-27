const Vue = require('vue')
<% _.forEach(components, function(component) { %>
import <%= component.name %> from '<%= component.pathAsJs %>';<% }); %>
<%= render %>
new Vue({
    el: '[vm-container="<%= vid %>"]',
    render: render,
    components:{
			<% _.forEach(components, function(component) { %><%= component.name %>,<% }); %> 
		}
});
