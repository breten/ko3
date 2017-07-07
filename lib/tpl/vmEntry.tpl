const Vue = require('vue')
<% _.forEach(components, function(component) { %>
import <%= component.name %> from '<%- component.pathAsJs %>';<% }); %>

new Vue({
    el: '[vm-container="<%- vid %>"]',
    components:{
			<% _.forEach(components, function(component) { %><%= component.name %>,<% }); %> 
		}
});
