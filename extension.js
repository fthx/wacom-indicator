/*	Wacom Indicator
	Wacom tablet utility
	GNOME Shell extension
	(c) Francois Thirioux 2020
	License: GPLv3 */
	

const { Clutter, GLib, GObject, Shell, St, UPowerGlib: UPower} = imports.gi;
const Main = imports.ui.main;
const Util = imports.misc.util;
const PanelMenu = imports.ui.panelMenu;
const Lang = imports.lang;


// device model label
const SHOW_MODEL = true; // default = true
const MAX_LABEL_LENGTH = 20; // default = 20

// interval for tablet state refresh (s)
const REFRESH_TIMEOUT = 60; // default = 60

// update on hover
const UPDATE_ON_HOVER = true; // default = true

// show indicator if no tablet is connected
const SHOW_IF_DISCONNECTED = true; // default = true


var WacomIndicator = GObject.registerClass(
class WacomIndicator extends PanelMenu.Button {
	_init() {
		super._init(0.0, 'Wacom Indicator');
		
		// get power through upower client
		this.upowerClient = UPower.Client.new_full(null);
		
		// create icon+text
        this.hbox = new St.BoxLayout({style_class: 'panel-button', visible: true, reactive: true, can_focus: true, track_hover: true}); 
		this.icon = new St.Icon({ icon_name: 'input-tablet-symbolic', style_class: 'system-status-icon' });
        this.hbox.add_child(this.icon);
        this.text = new St.Label({y_align: Clutter.ActorAlign.CENTER});
        this.text.set_text("N/A");
        this.hbox.add_child(this.text);
        this._updateLabel();
        this.add_child(this.hbox);
        
        // ensure indicator update at extension startup (us)
        latestCallTime = -1000001;
        this._updateLabel();
        
        // refresh tablet state every REFRESH_TIMEOUT seconds
        GLib.timeout_add_seconds(GLib.PRIORITY_LOW, REFRESH_TIMEOUT, Lang.bind(this, this._updateLabel));
        
        // connect signals
        this.connect('button-press-event', Lang.bind(this, this._openSettings));
        if (UPDATE_ON_HOVER) {
        	this.connect('notify::hover', Lang.bind(this, this._updateLabel))
        }
	}
        
    // open GNOME Settings Wacom
    _openSettings() {
		try {
			Util.trySpawnCommandLine("gnome-control-center wacom");
		} catch(err) {
			Main.notify("Error: unable to open GNOME Settings Wacom");
		};
	}
	
	// menu : get Wacom device name and battery percentage
	_updateLabel() {
		this.currentCallTime = GLib.get_real_time();
		this.delay = this.currentCallTime - latestCallTime;
		// do not call refresh too many times on hover
		if (this.delay > 1000000) {
			this.devices = this.upowerClient.get_devices();
			this.wacom = "?";
			if (!SHOW_IF_DISCONNECTED) {
				this.hide();
			}
			for (var i=0; i < this.devices.length; i++){
				this.device = this.devices[i]
				if (this.device.kind == UPower.DeviceKind.TABLET) {
					this.wacom = "";
					if (SHOW_MODEL) {
						this.wacom += this.device.model.substring(0, MAX_LABEL_LENGTH) + " :: ";
					}
					this.wacom += this.device.percentage + " %";
					if (!SHOW_IF_DISCONNECTED) {
						this.show();
					}
				}
			};
			this.text.set_text(this.wacom);
			latestCallTime = this.currentCallTime
		}
		return true
	}
})

function init() {
}

var _indicator;
var latestCallTime;

function enable() {
    _indicator = new WacomIndicator();
    Main.panel.addToStatusArea('wacom-indicator', _indicator);
}

function disable() {
    _indicator.destroy();
}
