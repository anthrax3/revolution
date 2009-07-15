/**
 * Loads a grid of Packages.
 * 
 * @class MODx.grid.Package
 * @extends MODx.grid.Grid
 * @param {Object} config An object of options.
 * @xtype modx-grid-package
 */
MODx.grid.Package = function(config) {
    config = config || {};
    this.exp = new Ext.grid.RowExpander({
        tpl : new Ext.Template(
            '<p style="padding: .7em 1em .3em;"><i>{readme}</i></p>'
        )
    });
    Ext.applyIf(config,{
        title: _('packages')
        ,id: 'modx-grid-package'
        ,url: MODx.config.connectors_url+'workspace/packages.php'
        ,fields: ['signature','created','updated','installed','state','workspace','provider','disabled','source','manifest','attributes','readme','menu']
        ,plugins: [this.exp]
        ,pageSize: 20
        ,columns: [this.exp,{
               header: _('package_signature') ,dataIndex: 'signature' }
            ,{ header: _('created') ,dataIndex: 'created' }
            ,{ header: _('updated') ,dataIndex: 'updated' }
            ,{ header: _('installed') ,dataIndex: 'installed' ,renderer: this._rins }
            ,{ 
                header: _('provider')
                ,dataIndex: 'provider'
                ,editor: { xtype: 'modx-combo-provider' ,renderer: true }
                ,editable: false
            },{
                header: _('disabled')
                ,dataIndex: 'disabled'
                ,editor: { xtype: 'combo-boolean' ,renderer: 'boolean' }
            }
        ]
        ,primaryKey: 'signature'
        ,paging: true
        ,autosave: true
        ,tbar: [{
            text: _('package_add')
            ,handler: { xtype: 'modx-window-package-downloader' }
        },{
            text: _('download_extras')
            ,handler: this.loadMainProvider
        }]
        ,tools: [{
            id: 'plus'
            ,qtip: _('expand_all')
            ,handler: this.expandAll
            ,scope: this
        },{
            id: 'minus'
            ,hidden: true
            ,qtip: _('collapse_all')
            ,handler: this.collapseAll
            ,scope: this
        }]
    });
    MODx.grid.Package.superclass.constructor.call(this,config);
};
Ext.extend(MODx.grid.Package,MODx.grid.Grid,{
    console: null
    
    ,loadMainProvider: function(btn,e) {
        MODx.Ajax.request({
            url: MODx.config.connectors_url+'workspace/providers.php'
            ,params: {
                action: 'get'
                ,name: 'modxcms.com'
            }
            ,listeners: {
                'success':{fn:function(r) {
                    var p = r.object;
                    var x = 'modx-window-package-downloader';
                    if (!this.windows[x]) {
                        this.windows[x] = MODx.load({ xtype: x  });
                    }
                    this.windows[x].on('ready',function() {
                        var pd = Ext.getCmp('modx-window-package-downloader');
                        pd.fireEvent('proceed','modx-pd-selpackage');
                        Ext.getCmp('modx-tree-package-download').setProvider(p.id);
                        Ext.getCmp('modx-pd-selpackage').provider = p.id;
                    },this,{single:true});
                    
                    this.windows[x].show(e.target);
                },scope:this}
            }
        });
    }
    
    ,update: function(btn,e) {        
        MODx.Ajax.request({
            url: this.config.url
            ,params: {
                action: 'update'
                ,signature: this.menu.record.signature
            }
            ,listeners: {
                'success': {fn:function(r) {           
                    this.loadWindow(btn,e,{
                        xtype: 'modx-window-package-update'
                        ,packages: r.object
                        ,record: this.menu.record
                        ,force: true
                        ,listeners: {
                            'success': {fn: function(o) {
                                this.refresh();
                                this.menu.record = o.a.result.object;
                                this.install(btn,e);
                            },scope:this}
                        }
                    });
                },scope:this}
            }
        });
    }
    
    ,_rins: function(d,c) {
        switch(d) {
            case '':
            case null:
                c.css = 'not-installed';
                return _('not_installed');
            default:
                c.css = '';
                return d;
        }
    }
    
    ,loadConsole: function(btn,topic) {
    	if (this.console === null) {
            this.console = MODx.load({
               xtype: 'modx-console'
               ,register: 'mgr'
               ,topic: topic
            });
        } else {
            this.console.setRegister('mgr',topic);
        }
        this.console.show(btn);
    }
    
    ,getConsole: function() {
        return this.console;
    }
    
    ,uninstall: function(btn,e) {
        this.loadWindow(btn,e,{
            xtype: 'modx-window-package-uninstall'
            ,listeners: {
                'success': {fn: function(va) { this._uninstall(this.menu.record,va,btn); },scope:this}
            }
        });
    }
    
    ,_uninstall: function(r,va,btn) {
        var r = this.menu.record;
        va = va || {};
        var topic = '/workspace/package/uninstall/'+r.signature+'/';
        this.loadConsole(btn,topic);
        Ext.apply(va,{
            action: 'uninstall'
            ,signature: r.signature
            ,register: 'mgr'
            ,topic: topic
        });
        
        MODx.Ajax.request({
            url: this.config.url
            ,params: va
            ,listeners: {
                'success': {fn:function(r) {
                    this.console.fireEvent('complete');
                    Ext.Msg.hide();
                    this.refresh();
                    parent.Ext.getCmp('modx-layout').refreshTrees();
                },scope:this}
                ,'failure': {fn:function(r) {
                    this.console.fireEvent('complete');
                    Ext.Msg.hide();
                    this.refresh();
                },scope:this}
            }
        });
    }
    
    ,remove: function(btn,e) {
    	var r = this.menu.record;
        var topic = '/workspace/package/remove/'+r.signature+'/';
        
        this.loadWindow(btn,e,{
            xtype: 'modx-window-package-remove'
            ,record: {
                signature: r.signature
                ,topic: topic
                ,register: 'mgr'
            }
        });
    }
    
    ,install: function(btn,e,r) {
        this.loadWindow(btn,e,{
            xtype: 'modx-window-package-installer'
            ,listeners: {
                'finish': {fn: function(va) { this._install(this.menu.record,va); },scope:this}
            }
        });
    }
    
    ,_install: function(r,va) {
        var topic = '/workspace/package/install/'+r.signature+'/';
        this.loadConsole(Ext.getBody(),topic);
        Ext.apply(va,{
            action: 'install'
            ,signature: r.signature
            ,register: 'mgr'
            ,topic: topic
        });
        
        MODx.Ajax.request({
            url: this.config.url
            ,params: va
            ,listeners: {
                'success': {fn:function() {
                    Ext.getCmp('modx-window-package-installer').hide();
                    this.refresh();
                    this.console.fireEvent('complete');
                    parent.Ext.getCmp('modx-layout').refreshTrees();
                },scope:this}
                ,'failure': {fn:function() {
                    Ext.Msg.hide();
                    this.refresh();
                    this.console.fireEvent('complete');
                },scope:this}
            }
        });
    }
});
Ext.reg('modx-grid-package',MODx.grid.Package);

/**
 * @class MODx.window.RemovePackage
 * @extends MODx.Window
 * @param {Object} config An object of configuration parameters
 * @xtype modx-window-package-remove
 */
MODx.window.RemovePackage = function(config) {
    config = config || {};
    Ext.applyIf(config,{
        title: _('package_remove')
        ,url: MODx.config.connectors_url+'workspace/packages.php'
        ,baseParams: {
            action: 'uninstall'
        }
        ,defaults: { border: false }
        ,fields: [{
            xtype: 'hidden'
            ,name: 'signature'
            ,id: 'modx-rpack-signature'
            ,value: config.signature
        },{
            html: _('package_remove_confirm')
        },MODx.PanelSpacer,{
            html: _('package_remove_force_desc') 
            ,border: false
        },MODx.PanelSpacer,{
            xtype: 'checkbox'
            ,name: 'force'
            ,boxLabel: _('package_remove_force')
            ,id: 'modx-rpack-force'
            ,labelSeparator: ''
            ,inputValue: 'true'
        }]
        ,saveBtnText: _('package_remove')
    });
    MODx.window.RemovePackage.superclass.constructor.call(this,config);
};
Ext.extend(MODx.window.RemovePackage,MODx.Window,{
    submit: function() {
        var r = this.config.record;
        if (this.fp.getForm().isValid()) {            
            Ext.getCmp('modx-grid-package').loadConsole(Ext.getBody(),r.topic);
            this.fp.getForm().baseParams = {
                action: 'remove'
                ,signature: r.signature
                ,register: 'mgr'
                ,topic: r.topic
                ,force: Ext.getCmp('modx-rpack-force').getValue()
            };
            
            this.fp.getForm().submit({ 
                waitMsg: _('saving')
                ,scope: this
                ,failure: function(frm,a) {
                    this.fireEvent('failure',frm,a);
                    var g = Ext.getCmp('modx-grid-package');
                    g.getConsole().fireEvent('complete');
                    g.refresh();
                    Ext.Msg.hide();
                    this.hide();
                }
                ,success: function(frm,a) {
                    this.fireEvent('success',{f:frm,a:a});
                    var g = Ext.getCmp('modx-grid-package');
                    g.getConsole().fireEvent('complete');
                    g.refresh();
                    Ext.Msg.hide();
                    this.hide();
                }
            });
        }
    }
});
Ext.reg('modx-window-package-remove',MODx.window.RemovePackage);