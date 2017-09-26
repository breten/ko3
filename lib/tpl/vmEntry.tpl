const Vue = require('vue')
<% _.forEach(components, function(component) { %>
import <%= component.name %> from '<%= component.pathAsJs %>';<% }); %>
<%= mixin %>
new Vue({
    el: '[vm-container="<%= vid %>"]',
    mixins: [mixin],
    components:{
			<% _.forEach(components, function(component) { %><%= component.name %>,<% }); %> 
		}
});
