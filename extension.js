/*	Wacom Indicator
	Wacom tablet utility
	GNOME Shell extension
	(c) Francois Thirioux 2021
	License: GPLv3 */
	

const { Clutter, GLib, GObject, Shell, St, UPowerGlib: UPower } = imports.gi;

const Main = imports.ui.main;
const Util = imports.misc.util;
const PanelMenu = imports.ui.panelMenu;


// device model label
var SHOW_MODEL = false; // default = false
var MAX_LABEL_LENGTH = 20; // default = 20

// interval for tablet state refresh (s)
var AUTO_REFRESH = true; // default = true
var REFRESH_TIMEOUT = 60; // default = 60

// update on hover
var UPDATE_ON_HOVER = true; // default = true

// show indicator if no tablet is connected
var SHOW_IF_DISCONNECTED = true; // default = true


var WacomIndicator = GObject.registerClass(
class WacomIndicator extends PanelMenu.Button {
	_init() {
		super._init(0.0, 'Wacom Indicator');
		
		// get power through upower client
		this.upower_client = UPower.Client.new_full(null);
		
		// create icon+text
        this.box = new St.BoxLayout({visible: true, reactive: true, can_focus: true, track_hover: true}); 
		this.box.icon = new St.Icon({icon_name: 'input-tablet-symbolic', style_class: 'system-status-icon'});
        this.box.add_child(this.box.icon);
        this.box.text = new St.Label({style: "font-size: smaller", y_align: Clutter.ActorAlign.CENTER});
        this.box.text.set_text("N/A");
        this.box.add_child(this.box.text);
        this._update_label();
        this.add_child(this.box);
        
        // ensure indicator update at extension startup (us)
        this.latest_call_time = -1000001;
        this.latest_call_time = this._update_label(this.latest_call_time);
        
        // refresh tablet state every REFRESH_TIMEOUT seconds
        if (AUTO_REFRESH) {
        	this.refresh_timeout = GLib.timeout_add_seconds(GLib.PRIORITY_LOW, REFRESH_TIMEOUT, 
        													() => {this.latest_call_time = this._update_label(this.latest_call_time)});
        }
        
        // connect signals
        this.box.click = this.connect('button-press-event', this._open_settings.bind(this));
        if (UPDATE_ON_HOVER) {
        	this.box.hover = this.connect('notify::hover', () => {this.latest_call_time = this._update_label(this.latest_call_time)});
        }
	}
        
    // open GNOME Settings Wacom
    _open_settings() {
		try {
			Util.trySpawnCommandLine("gnome-control-center wacom");
		} catch(err) {
			Main.notify("Error: unable to open GNOME Settings Wacom");
		}
	}
	
	// menu : get Wacom device name and battery percentage
	_update_label(latest_call_time) {
		this.current_call_time = GLib.get_real_time();
		this.delay = this.current_call_time - latest_call_time;
		// do not call refresh too many times on hover
		if (this.delay > 1000000) {
			this.devices = this.upower_client.get_devices();
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
			}
			this.box.text.set_text(this.wacom);
			latest_call_time = this.current_call_time;
		}
		return latest_call_time;
	}
	
	_destroy() {
		if (this.refresh_timeout) {
        	GLib.source_remove(this.refresh_timeout);
        }
        if (this.hover) {
        	this.disconnect(this.box.hover);
        }
        this.disconnect(this.box.click);
        super.destroy();
    }
})

class Extension {
    constructor() {
    }
    
    enable() {
		this._indicator = new WacomIndicator();
    	Main.panel.addToStatusArea('wacom-indicator', this._indicator);
    }

    disable() {
		this._indicator._destroy();
    }
}

function init() {
	return new Extension();
}

