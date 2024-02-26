import Adw from 'gi://Adw';

import { buildPrefsWidget } from './common/prefs.js';
import { GioSettings } from './common/settings.js';

import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class extends ExtensionPreferences {
	fillPreferencesWindow(prefsWindow: Adw.PreferencesWindow) {
		const UIDirPath = this.dir.get_child('ui').get_path() ?? '';
		const settings = this.getSettings();
		buildPrefsWidget(prefsWindow, settings as GioSettings, UIDirPath);
	}
}
