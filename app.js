/*global console, Ext, EDA */

Ext.namespace('EDA');

EDA.config = {
	apihost: 'http://stratum.registercentrum.se/api/',
	apikey: 'bK3H9bwaG4o='
};

Ext.define('EDA.store.RegisterStore', {
	extend: 'Ext.data.Store',
	autoLoad: true,
	autoDestroy: true,
	sorters: 'RegisterName',
	proxy: {
		type: 'ajax',
		url: EDA.config.apihost + 'metadata/registers',
		reader: {
			type: 'json',
			rootProperty: 'data'
		}
	},
	fields: [
		{ name: 'RegisterID',	type: 'int'  },
		{ name: 'RegisterName',	type: 'string'  },
		{ name: 'ShortName',	type: 'string'  }
	]
});

Ext.define('EDA.store.FormStore', {
	extend: 'Ext.data.Store',
	autoLoad: false,
	autoDestroy: true,
	proxy: {
		type: 'ajax',
		url: EDA.config.apihost + 'metadata/forms/register',
		reader: {
			type: 'json',
			rootProperty: 'data'
		}
	},
	fields: [
		{ name: 'FormID',		type: 'int'  },
		{ name: 'FormTitle',	type: 'string'  },
		{ name: 'FormName',		type: 'string'  }
	],
	
	setSource: function(aRegisterID) {
		var me = this;
		
		me.load({
			url: me.getProxy().url + '/' + aRegisterID
		});
	}
	
});

Ext.define('EDA.store.QuestionStore', {
	extend: 'Ext.data.Store',
	autoLoad: false,
	autoDestroy: true,
	proxy: {
		type: 'ajax',
		url: EDA.config.apihost + 'metadata/questions/form',
		reader: {
			type: 'json',
			rootProperty: 'data'
		}
	},
	fields: [
		{ name: 'QuestionID',	type: 'int' },
		{ name: 'ColumnName',	type: 'string' },
		{ name: 'PrefixText',	type: 'string' },
		{ name: 'SuffixText',	type: 'string' },
		{ name: 'Level',		type: 'int' },
		{ name: 'Form',			type: 'auto' },
		{ name: 'Domain',		type: 'auto' },
		{ name: 'Generation',	type: 'int' }
	],
	filters: [
		function(anItem) {
			return ['Section','Text','Note','Email','Registration'].indexOf(anItem.get('Domain').DomainName) < 0;
		}
	],
	
	setSource: function(aFormID) {
		var me = this;
		
		if (!aFormID) {
			me.removeAll();
			me.formID = null;
		} else {
			if (me.formID === aFormID) {
				return;
			}
			me.formID = aFormID;
			// Load form in detail since it contains all questions and parent's questions.
			Ext.Ajax.request({
				url: EDA.config.apihost + 'metadata/forms/' + aFormID,
				method: 'GET',
				failure: function (aResponse) {
				},
				success: function (aResponse) {
					var ro = Ext.decode(aResponse.responseText).data,
						cf = ro,
						gn = 0, // Number of "ancestry generations" to current.
						fq = function(aQuestion) {
							aQuestion.Form = cf;
							aQuestion.Generation = gn;
						};
					me.removeAll();
					while (cf) {
						Ext.Array.forEach(cf.Questions, fq); // Add Form reference to all questions.
						me.loadData(cf.Questions, true);
						cf = cf.Parent;
						gn = gn + 1;
					}
				}
			});
		}
	}
});

Ext.define ('EDA.widget.RegisterSelector', {
	extend: 'Ext.form.field.ComboBox',
	xtype: 'registerselector',
	
	initComponent: function() {
		Ext.apply (this, {
			store: Ext.create('EDA.store.RegisterStore'),
			editable: false,
			queryMode: 'local',
			emptyText: 'Välj register',
			fieldLabel: 'Register',
			displayField: 'RegisterName',
			valueField: 'RegisterID'
		});
		this.callParent(arguments);
	}
	
});

Ext.define ('EDA.widget.FormSelector', {
	extend: 'Ext.form.field.ComboBox',
	xtype: 'formselector',
	
	initComponent: function() {
		Ext.apply (this, {
			store: Ext.create('EDA.store.FormStore'),
			fieldLabel: 'Formulär',
			queryMode: 'local',
			editable: false,
			displayField: 'FormTitle',
			valueField: 'FormID'
		});
		this.callParent(arguments);
	},
	
	setSource: function(aRegisterID) {
		if (aRegisterID) {
			this.getStore().setSource(aRegisterID);
			this.emptyText = 'Välj formulär';
			this.select();
		} else {
			this.getStore().setSource();
			this.emptyText = ' '; // Won't be set if empty or undefined.
			this.reset();
		}
	}
	
});

Ext.define ('EDA.widget.QuestionSelector', {
	extend: 'Ext.form.field.ComboBox',
	xtype: 'questionselector',
	
	initComponent: function() {
		Ext.apply (this, {
			displayField: 'ColumnName',
			valueField: 'QuestionID',
			forceSelection: true,
			selectOnFocus: true,
			tpl: Ext.create('Ext.XTemplate',
				'<tpl for=".">',
					'<div class="x-boundlist-item variable-item-wrapper">{[this.getIcons(values)]}{ColumnName}<div class="variable-item-note">{PrefixText}</div></div>',
				'</tpl>',
				{
					getIcons: function (aQuestion) {
						var si, gn, vs;
						switch (aQuestion.Level) {
							case 1:
								si = 'IconLevelNominal.png';
								break;
							case 2:
								si = 'IconLevelOrdinal.png';
								break;
							case 3:
								si = 'IconLevelScale.png';
								break;
						}
						vs = '';
						gn = aQuestion.Generation;
						while (gn) { // Add one icon for each generation.
							vs = vs + '<img class="icon-level" src="images/IconLevelParent.png">';
							gn = gn-1;
						}
						vs = vs + '<img class="icon-level" src="images/' + si + '">';
						return vs;
					}
				}
			),
			listeners: {
				select: function(t,r) {
					console.log(r.data); //TODO: remove!
				}
			}
		});
//		this.superclass.initComponent.call(this);
		this.callParent(arguments);
	},

	doQuery: function(aQueryString) {
		var me = this,
			qs = aQueryString.toLowerCase();

		me.queryFilter = {
			id: 'query',
			filterFn: function(anItem) {
				var sp = (anItem.data.PrefixText || "").toLowerCase(),
					sc = (anItem.data.ColumnName || "").toLowerCase();
				
				if (sp.indexOf(qs) >= 0 || sc.indexOf(qs) >= 0) {
					return true;
				}
			}
		};
		me.getStore().suspendEvents(); // Suspending events makes it possible to share a store between combos.
		me.getStore().addFilter([me.queryFilter]);
		me.getStore().resumeEvents();
		if (me.getStore().getCount() || me.getPicker().emptyText) {
			me.getPicker().refresh();
			me.expand();
		} else {
			me.collapse();
		}
//		me.doTypeAhead();
		me.doAutoSelect();
		me.checkChange();
		return true;
	},
	
	setSource: function(aFormID) {
		if (aFormID) {
			this.emptyText = 'Välj variabel';
			this.getStore().setSource(aFormID);
			this.select();
		} else {
			this.emptyText = ' ';
			this.getStore().setSource();
			this.reset();
		}
	}

});

Ext.define('EDA.view.MainView', {
	extend: 'Ext.container.Viewport',
	itemId: 'mainView',
	referenceHolder: true,
	layout: {
		type: 'center',
	},
	initComponent: function () {
		var me = this,
			qs = Ext.create('EDA.store.QuestionStore'); // This store is shared by x and y variables.

		this.items = [{
			xtype: 'panel',
			itemId: 'filterPanel',
			bodyPadding: 10,
			border: false,
			layout: 'auto',
			defaults: {
				padding: '0 0 10px 0',
				labelAlign: 'top',
				width: '100%'
			},
			plugins: [
				'responsive'
			],
			responsiveConfig: {
				'width <= 800': {
					width: '90%'
				},
				'width > 800 && width < 1000': {
					width: 640
				},
				'width >= 1000': {
					width: 820
				}
			},
			items: [{
				xtype: 'form',
				border: false,
				layout: 'column',
				defaults: {
					labelAlign: 'top'
				},
				items: [{
					xtype: 'registerselector',
					reference: 'registerSelector',
					columnWidth: 1.0,
					listeners: {
						change: function (aComponent, aRegisterID) {
							me.lookupReference('formSelector').setSource(aRegisterID);
							me.lookupReference('questionXSelector').setSource();
							me.lookupReference('questionYSelector').setSource();
						}

					}
				},{
					xtype: 'formselector',
					reference: 'formSelector',
					columnWidth: 1.0,
					listeners: {
						change: function (aComponent, aFormID) {
							me.lookupReference('questionXSelector').setSource(aFormID);
							me.lookupReference('questionYSelector').setSource(aFormID);
						}
					}
				},{
					xtype: 'questionselector',
					store: qs,
					reference: 'questionXSelector',
					columnWidth: 0.333,
					padding: '0 10 0 0',
					fieldLabel: 'X-axel'
				},{
					xtype: 'questionselector',
					store: qs,
					reference: 'questionYSelector',
					columnWidth: 0.333,
					padding: '0 10 0 0',
					fieldLabel: 'Y-axel'
				},{
					xtype: 'combobox',
					columnWidth: 0.333,
					fieldLabel: 'Metod'
				}]
			},{
				xtype: 'panel',
				itemId: 'resultPanel',
				height: 400,
				bodyPadding: 10,
				header: false
			},{
				xtype: 'textfield',
				itemId: 'resultURI',
				fieldLabel: 'Länk till denna sida',
				readOnly: true
			},{
				xtype: 'textfield',
				itemId: 'apiURI',
				fieldLabel: 'Länk till JSON-underlag',
				readOnly: true
			},{
				xtype: 'panel',
				itemId: 'todoPanel',
				bodyPadding: 10,
				title: 'Att göra',
				frame: true,
				collapsed: true,
				collapsible: true,
				html:
					'<ol>' +
					'<li>Sortera listan med register i namnordning.</li>' +
					'<li>Sortera listan med formulär i sequence-ordning (eller är den det redan?)</li>' +
					'<li>Skall det finnas en z-variabel och sedan val av aggregeringsmetod under denna?</li>' +
					'</ol>'
			}]
		}];
		this.callParent(arguments);
	}
	
});

// Only when used as an application and not a widget ...
Ext.application({
	name: 'EDA',
	launch: function () {
		'use strict';
		Ext.Ajax.setExtraParams({ apikey: EDA.config.apikey });
		Ext.create('EDA.view.MainView');
	}
});
