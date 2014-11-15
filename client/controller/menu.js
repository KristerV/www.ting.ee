Template.menu.helpers({
	practicalList: function() {
		return WikiCollection.find({}, {sort: {topic: 1}})
	},
	circleList: function() {
		var circles = CircleCollection.find({type: {$in: ['open', 'closed']}}, {sort: {topic: 1}})
		return circles
	},
	peopleList: function() {
		return Meteor.users.find({_id: {$ne: Meteor.userId()}}, {sort: {'status.online': -1, 'status.lastLogin.date': -1, username: 1}})
	},
	isUserLimited: function() {
		var userProfile = Meteor.user().profile
		if (!isset(userProfile) || !isset(userProfile.access)) {
			return true
		}

		var allowed = ['normal', 'admin']
		var userRoles = typeof userProfile.access == 'object' ? userProfile.access : [userProfile.access]
		var diff = _.difference(userRoles, allowed)
		if (diff.length == 0) {
			return false
		}

		return true
	},
	admin: function() {
		return Meteor.user().profile.access == 'admin'
	}
})

Template.menu.events({
	'click .heading': function(e, tmpl) {
		Global.bigBlur(e.currentTarget)
		
		var list = $(e.currentTarget).nextAll('.list:first')

		if (list.is(":visible"))
			list.velocity('slideUp')
		else
			list.velocity('slideDown')
	},
	'click .new-circle': function(e, tmpl) {
		Global.bigBlur()
		var circleId = CircleCollection.insert({author: Meteor.userId(), type: 'closed', topic: Translate('new circle')})
		Session.set('module', {
			module: 'chat',
			id: circleId,
		})
	},
	'click .new-practical': function(e, tmpl) {
		Global.bigBlur()

		var wikiId = WikiCollection.insert({
			author: Meteor.userId(), 
			type: 'wiki', 
			topic: Translate('new wiki'), 
			module: 'wiki',
			locked: true,
			content: [{
				author: Meteor.userId(),
				text: 'Nimetu wiki',
				timestamp: TimeSync.serverTime(Date.now()),
			}]
		})
		Session.set('module', {
			module: 'wiki',
			id: wikiId,
		})
		Wiki.startEdit()
	},
	'click .new-email': function(e, tmpl) {
		Session.set('module', {module: 'bulkemail'})
	}
})