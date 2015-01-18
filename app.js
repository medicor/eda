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
	]
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
			return anItem.get('Domain').DomainName !== 'Section';
		}
	]
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
			valueField: 'RegisterID',
			listeners: {
				change: this.onSelectionChange
			}
		});
		this.superclass.initComponent.call(this);
	},
	
	onSelectionChange: function (aComponent, aRegisterID) {
		var fc = this.that.lookupReference('formSelector'),
			fs = fc.getStore();
		
		fs.load({
			url: fs.getProxy().url + '/' + aRegisterID,
			callback: function () {
				fc.emptyText = 'Välj formulär';
				fc.select();
			}
		});
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
			valueField: 'FormID',
			listeners: {
				change: function (aComponent, aFormID) {
					//TODO: this handling should be variableSelector:s responsibility. Move it there.
					var qc = this.that.lookupReference('questionSelector'),
						qs = qc.getStore();
					
					if (!aFormID) {
						qs.removeAll();
					} else {
						// Load form in detail since it contains all questions and parent's questions.
						qc.setLoading(true);
						Ext.Ajax.request({
							url: EDA.config.apihost + 'metadata/forms/' + aFormID,
							method: 'GET',
							failure: function (aResponse) {
								qc.setLoading(false);
							},
							success: function (aResponse) {
								var ro = Ext.decode(aResponse.responseText).data,
									cf = ro,
									gn = 0, // Number of "ancestry generations" to current.
									fq = function(aQuestion) {
										aQuestion.Form = cf;
										aQuestion.Generation = gn;
									};
								qs.removeAll();
								while (cf) {
									Ext.Array.forEach(cf.Questions, fq); // Add Form reference to all questions.
									qs.loadData(cf.Questions, true);
									cf = cf.Parent;
									gn = gn + 1;
								}
								qc.setLoading(false);
							}
						});
					}
				}
			}
		});
		this.superclass.initComponent.call(this);
	}
});
/*
Ext.define ('EDA.widget.QuestionSelector', {
	extend: 'Ext.grid.Panel',
	xtype: 'questionselector',
	
	initComponent: function() {
		Ext.apply (this, {
			frameHeader: false,
			syncRowHeight: false,
			enableColumnHide: false,
			enableColumnMove: false,
			enableColumnResize: false,
			hideHeaders: true,
			rowLines: false,
			scroll: 'vertical',
			sortableColumns: false,
			store: Ext.create('EDA.store.QuestionStore'),
			columns: [{
				xtype: 'gridcolumn',
				dataIndex: 'ColumnName',
				flex: 1,
				renderer: function (aValue, aMeta) {
					var si, gn, vs;
					switch (aMeta.record.get('Level')) {
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
					gn = aMeta.record.get('Generation' );
					while (gn) { // Add one icon for each generation.
						vs = vs + '<img class="iconLevel" src="images/IconLevelParent.png">';
						gn = gn-1;
					}
					vs = vs + '<img class="iconLevel" src="images/' + si + '">' + aValue;
					return vs;
				}
			}],
			viewConfig: {
				frame: true,
				height: 210,
				autoScroll: false,
				loadingText: 'Laddar ...',
				plugins: [
					'gridviewdragdrop'
				]
			}
		});
		this.superclass.initComponent.call(this);
	}
});
*/
Ext.define('EDA.view.MainView', {
	extend: 'Ext.container.Viewport',
	itemId: 'mainView',
	referenceHolder: true,
	layout: {
		type: 'center',
	},
	initComponent: function () {
		this.items = [{
			xtype: 'panel',
			itemId: 'filterPanel',
			bodyPadding: 10,
			border: false,
			defaults: {
				padding: '0 0 10 10'
			},
			plugins: [
				'responsive'
			],
			responsiveConfig: {
				'width <= 800': {
					width: '90%'
				},
				'width > 800 && width < 1000': {
					width: 720
				},
				'width >= 1000': {
					width: 960
				}
			},
			items: [{
				xtype: 'form',
				border: false,
				layout: 'column',
				defaults: {
					padding: '0 10 10 0',
					labelAlign: 'top'
				},
				items: [{
					that: this,
					xtype: 'registerselector',
					reference: 'registerSelector',
					columnWidth: 1.0
				},{
					that: this,
					xtype: 'formselector',
					reference: 'formSelector',
					columnWidth: 1.0
				}/*,{
					xtype: 'container',
					columnWidth: 0.4,
					items: [{
						xtype: 'label',
						text: 'Variabler:',
						columnWidth: 0.4
					},{
						that: this,
						xtype: 'questionselector',
						reference: 'questionSelector',
						columnWidth: 0.4
					}]
				}*/,{
					xtype: 'combobox',
					columnWidth: 0.333,
					fieldLabel: 'X-axel',
					store: questionStore,
					listConfig: {
						getInnerTpl: this.questionRenderer
					}
				},{
					xtype: 'combobox',
					columnWidth: 0.333,
					fieldLabel: 'Y-axel',
					store: questionStore,
					listConfig: {
						getInnerTpl: this.questionRenderer
					}
				},{
					xtype: 'combobox',
					columnWidth: 0.333,
					fieldLabel: 'Metod'
				}]
			},{
				xtype: 'panel',
				flex: 1,
				itemId: 'todoPanel',
				bodyPadding: 10,
				header: false,
				html:
					'<ol>' +
					'<li>Gör x,y och z som tre typeaheads med olika tab panels beroende på typ av variabel.</li>' +
					'<li>Använda <code>ViewController</code> istället för references?</li>' +
					'<li>Ikon saknas i variabellista för domän kommentar/text.</li>' +
					'<li>Lägg till rad för URL till aktuellt resultat.</li>' +
					'<li>Lägg till rad för URL till aktuellt api-anrop.</li>' +
					'<li>Fixa DD för variabellistan.</li>' +
					'<li>Lägg till etikett som visar prefixText + suffixText för vald variabel.</li>' +
					'</ol>'
			}, {
				xtype: 'panel',
				flex: 1,
				itemId: 'resultPanel',
				bodyPadding: 10,
				header: false
			}]
		}];
		this.superclass.initComponent.call(this);
	},
	
	questionRenderer: function(aBoundsList) {
		return '{[values.name.replace(this.field.getRawValue(), "" + this.field.getRawValue() + "")]}';
	}
/*
	onSourceBoxReady: function (aSourceComponent) {
		'use strict';
		this.dropTarget = new Ext.dd.DropTarget(aSourceComponent.el, {
			ddGroup: 'variable-selection',
			notifyEnter: function () {
				aSourceComponent.inputEl.addCls('dropTargetEntered');
			},
			notifyOut: function () {
				aSourceComponent.inputEl.removeCls('dropTargetEntered');
			},
			notifyDrop: function (aDragSource) {
				aSourceComponent.inputEl.removeCls('dropTargetEntered');
				aSourceComponent.setValue(aDragSource.dragData.records[0].get('RegisterName'));
				return true;
			}
		});
	}
*/
});

var questionStore = Ext.create('EDA.store.QuestionStore');

// Only when used as application and not a widget ...
Ext.application({
	name: 'EDA',
	launch: function () {
		'use strict';
		Ext.Ajax.setExtraParams({ apikey: EDA.config.apikey });
		Ext.create('EDA.view.MainView');
	}
});
