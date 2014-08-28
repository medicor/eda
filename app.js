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
		url: EDA.config.apihost + 'metadata/registers?apikey',
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
		{ name: 'PrefixText',	type: 'string'  },
		{ name: 'SuffixText',	type: 'string'  },
		{ name: 'Level',		type: 'int' },
		{ name: 'Form',			type: 'auto' },
		{ name: 'Domain',		type: 'auto' }
	]
});

Ext.define('EDA.view.MainView', {
	extend: 'Ext.container.Viewport',
	itemId: 'mainView',
	layout: {
		type: 'center',
	},
//	style: 'margin: 100px auto; width: 720px',
	initComponent: function () {
        'use strict';
		this.items = [{
			xtype: 'panel',
			itemId: 'filterPanel',
            width: '75%',
            height: '90%',
			bodyPadding: 10,
            border: false,
			defaults: {
				padding: '0 0 10 10'
			},
			items: [{
				xtype: 'form',
				border: false,
				defaults: {
					padding: '0 10 10 0',
					labelAlign: 'top'
				},
				layout: 'column',
				items: [{
					xtype: 'combobox',
					columnWidth: 1,
					emptyText: 'Välj register',
					itemId: 'registerList',
					fieldLabel: 'Register',
					queryMode: 'local',
					editable: false,
					displayField: 'RegisterName',
					valueField: 'RegisterID',
					store: Ext.create('EDA.store.RegisterStore'),
					listeners: {
						scope: this,
						change: this.onSelectRegister
					}
				}, {
					xtype: 'combobox',
					columnWidth: 1,
					itemId: 'formList',
					fieldLabel: 'Formulär',
					queryMode: 'local',
					editable: false,
					displayField: 'FormTitle',
					valueField: 'FormID',
					store: Ext.create('EDA.store.FormStore'),
					listeners: {
						scope: this,
						change: this.onSelectForm
					}
				}, {
					xtype: 'container',
					columnWidth: 0.4,
					items: [{
						xtype: 'label',
						text: 'Variabler:',
						columnWidth: 0.4
					}, {
						xtype: 'gridpanel',
						columnWidth: 0.4,
						itemId: 'questionList',
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
								var si, pf;
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
								pf = aMeta.record.get('Form');
								return '<img class="iconLevel" src="images/' + si + '">' + aValue;
							}
						}],
						viewConfig: {
							frame: true,
							height: 210,
							autoScroll: false,
							loadingText: 'Laddar ...',
							plugins: [
								Ext.create('Ext.grid.plugin.DragDrop', {
									ddGroup: 'variable-selection',
									enableDrop: false
								})
							]
						}
					}]
				}, {
					xtype: 'textfield',
					columnWidth: 0.3,
					fieldLabel: 'X-axel',
					readOnly: true,
					listeners: {
						scope: this,
						boxready: this.onSourceBoxReady
					}
				}, {
					xtype: 'textfield',
					columnWidth: 0.3,
					fieldLabel: 'Y-axel',
					readOnly: true,
					listeners: {
						scope: this,
						boxready: this.onSourceBoxReady
					}
				}]
			}, {
				xtype: 'panel',
				flex: 1,
				itemId: 'todoPanel',
				bodyPadding: 10,
				header: false,
				html:
					'<ol>' +
					'<li>Lägg till referens till alla Form(s) för alla Questions i QuestionStore.</li>' +
					'<li>Lägg till ikoner för arv i listan med variabler innan ikon för nivå.</li>' +
					'<li>Lägg till etikett som visar prefixText + suffixText för vald variabel.</li>' +
					'<li>Filtrera bort sektioner från Questions.</li>' +
					'</ol>'
			}, {
				xtype: 'panel',
				flex: 1,
				itemId: 'resultPanel',
				bodyPadding: 10,
				header: false
			}]
		}];
//		this.callParent();
		this.superclass.initComponent.call(this);
	},
	
	onSourceBoxReady: function (aSourceCOmponent) {
		'use strict';
		this.dropTarget = new Ext.dd.DropTarget(aSourceCOmponent.el, {
			ddGroup: 'variable-selection',
			notifyEnter: function () {
				aSourceCOmponent.inputEl.addCls('dropTargetEntered');
			},
			notifyOut: function () {
				aSourceCOmponent.inputEl.removeCls('dropTargetEntered');
			},
			notifyDrop: function (aDragSource) {
				aSourceCOmponent.inputEl.removeCls('dropTargetEntered');
				aSourceCOmponent.setValue(aDragSource.dragData.records[0].get('RegisterName'));
				return true;
			}
		});
	},
	
	onSelectRegister: function (aComponent, aRegisterID) {
		'use strict';
		var fc = this.down('#formList'),
			fs = fc.getStore();
		
		fs.load({
			url: fs.getProxy().url + '/' + aRegisterID,
			callback: function () {
				fc.emptyText = 'Välj formulär';
				fc.select();
			}
		});
	},
	
	onSelectForm: function (aComponent, aFormID) {
		'use strict';
		var qc = this.down('#questionList'),
			qs = qc.getStore(),
			cf;
		
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
					var ro = Ext.decode(aResponse.responseText).data;
					qc.setLoading(false);
					qs.removeAll();
					qs.loadData(ro.Questions);
					cf = ro.Parent;
					while (cf) {
						qs.loadData(cf.Questions, true);
						cf = cf.Parent;
					}
				}
			});
		}
	}
	
});

// Only when used as am application and not a widget ...
Ext.application({
	name: 'EDA',
	launch: function () {
		'use strict';
		Ext.Ajax.setExtraParams({ apikey: EDA.config.apikey });
		Ext.create('EDA.view.MainView');
	}
});
