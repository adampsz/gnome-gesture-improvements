import GLib from 'gi://GLib';
import {
	GioSettings,
	PinchGestureType,
	SettingKeys,
	AppForwardBackKeyBinds,
} from './common/settings.js';
import * as Constants from './constants.js';
import { AltTabConstants, ExtSettings, TouchpadConstants } from './constants.js';
import { AltTabGestureExtension } from './src/altTab.js';
import { ForwardBackGestureExtension } from './src/forwardBack.js';
import { GestureExtension } from './src/gestures.js';
import { OverviewRoundTripGestureExtension } from './src/overviewRoundTrip.js';
import { CloseWindowExtension } from './src/pinchGestures/closeWindow.js';
import { ShowDesktopExtension } from './src/pinchGestures/showDesktop.js';
import { SnapWindowExtension } from './src/snapWindow.js';
import * as DBusUtils from './src/utils/dbus.js';
import * as VKeyboard from './src/utils/keyboard.js';

import { Extension, ExtensionMetadata } from 'resource:///org/gnome/shell/extensions/extension.js';

export default class extends Extension {
	private _extensions: { apply?: () => void; destroy: () => void }[];
	settings?: GioSettings;
	private _settingChangedId = 0;
	private _reloadWaitId = 0;
	private _addReloadDelayFor: SettingKeys[];

	constructor(metadata: ExtensionMetadata) {
		super(metadata);
		this._extensions = [];
		this._addReloadDelayFor = ['touchpad-speed-scale', 'alttab-delay', 'touchpad-pinch-speed'];
	}

	enable() {
		this.settings = this.getSettings() as GioSettings;
		this._settingChangedId = this.settings.connect('changed', this.reload.bind(this));
		this._enable();
	}

	disable() {
		if (this.settings) {
			this.settings.disconnect(this._settingChangedId);
		}

		if (this._reloadWaitId !== 0) {
			GLib.source_remove(this._reloadWaitId);
			this._reloadWaitId = 0;
		}

		this._disable();
		DBusUtils.drop_proxy();
	}

	reload(_settings: unknown, key: SettingKeys) {
		if (this._reloadWaitId !== 0) {
			GLib.source_remove(this._reloadWaitId);
			this._reloadWaitId = 0;
		}

		this._reloadWaitId = GLib.timeout_add(
			GLib.PRIORITY_DEFAULT,
			this._addReloadDelayFor.includes(key) ? Constants.RELOAD_DELAY : 0,
			() => {
				this._disable();
				this._enable();
				this._reloadWaitId = 0;
				return GLib.SOURCE_REMOVE;
			},
		);
	}

	_enable() {
		this._initializeSettings();
		this._extensions = [];
		if (this.settings === undefined) return;

		if (this.settings.get_boolean('enable-alttab-gesture'))
			this._extensions.push(new AltTabGestureExtension());

		if (this.settings.get_boolean('enable-forward-back-gesture')) {
			const appForwardBackKeyBinds = this.settings
				.get_value('forward-back-application-keyboard-shortcuts')
				.deepUnpack<AppForwardBackKeyBinds>();
			this._extensions.push(new ForwardBackGestureExtension(appForwardBackKeyBinds));
		}

		this._extensions.push(
			new OverviewRoundTripGestureExtension(this.settings.get_enum('overview-navifation-states')),
			new GestureExtension(),
		);

		if (this.settings.get_boolean('enable-window-manipulation-gesture'))
			this._extensions.push(new SnapWindowExtension());

		// pinch to show desktop
		const pinchToFingersMap = this._getPinchGestureTypeAndFingers();
		const showDesktopFingers = pinchToFingersMap.get(PinchGestureType.SHOW_DESKTOP);
		if (showDesktopFingers?.length)
			this._extensions.push(new ShowDesktopExtension(showDesktopFingers));

		// pinch to close window
		const closeWindowFingers = pinchToFingersMap.get(PinchGestureType.CLOSE_WINDOW);
		if (closeWindowFingers?.length)
			this._extensions.push(
				new CloseWindowExtension(closeWindowFingers, PinchGestureType.CLOSE_WINDOW),
			);

		// pinch to close document
		const closeDocumentFingers = pinchToFingersMap.get(PinchGestureType.CLOSE_DOCUMENT);
		if (closeDocumentFingers?.length)
			this._extensions.push(
				new CloseWindowExtension(closeDocumentFingers, PinchGestureType.CLOSE_DOCUMENT),
			);

		this._extensions.forEach((extension) => extension.apply?.());
	}

	_disable() {
		VKeyboard.extensionCleanup();
		DBusUtils.unsubscribeAll();
		this._extensions.reverse().forEach((extension) => extension.destroy());
		this._extensions = [];
	}

	_initializeSettings() {
		if (this.settings) {
			ExtSettings.DEFAULT_SESSION_WORKSPACE_GESTURE = this.settings.get_boolean(
				'default-session-workspace',
			);
			ExtSettings.DEFAULT_OVERVIEW_GESTURE = this.settings.get_boolean('default-overview');
			ExtSettings.ALLOW_MINIMIZE_WINDOW = this.settings.get_boolean('allow-minimize-window');
			ExtSettings.FOLLOW_NATURAL_SCROLL = this.settings.get_boolean('follow-natural-scroll');
			ExtSettings.DEFAULT_OVERVIEW_GESTURE_DIRECTION = this.settings.get_boolean(
				'default-overview-gesture-direction',
			);
			ExtSettings.APP_GESTURES = this.settings.get_boolean('enable-forward-back-gesture');

			TouchpadConstants.SWIPE_MULTIPLIER =
				Constants.TouchpadConstants.DEFAULT_SWIPE_MULTIPLIER *
				this.settings.get_double('touchpad-speed-scale');
			TouchpadConstants.PINCH_MULTIPLIER =
				Constants.TouchpadConstants.DEFAULT_PINCH_MULTIPLIER *
				this.settings.get_double('touchpad-pinch-speed');
			AltTabConstants.DELAY_DURATION = this.settings.get_int('alttab-delay');
			TouchpadConstants.HOLD_SWIPE_DELAY_DURATION = this.settings.get_int(
				'hold-swipe-delay-duration',
			);
		}
	}

	private _getPinchGestureTypeAndFingers(): Map<PinchGestureType, number[]> {
		if (!this.settings) return new Map();

		const pinch3FingerGesture = this.settings.get_enum('pinch-3-finger-gesture');
		const pinch4FingerGesture = this.settings.get_enum('pinch-4-finger-gesture');

		const gestureToFingersMap = new Map<PinchGestureType, number[]>();
		if (pinch3FingerGesture === pinch4FingerGesture)
			gestureToFingersMap.set(pinch3FingerGesture, [3, 4]);
		else {
			gestureToFingersMap.set(pinch3FingerGesture, [3]);
			gestureToFingersMap.set(pinch4FingerGesture, [4]);
		}

		return gestureToFingersMap;
	}
}
