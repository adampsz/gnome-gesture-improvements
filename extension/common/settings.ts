import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

// define enum
export enum PinchGestureType {
	NONE = 0,
	SHOW_DESKTOP = 1,
	CLOSE_WINDOW = 2,
	CLOSE_DOCUMENT = 3,
}

// define enum
export enum OverviewNavigationState {
	CYCLIC = 0,
	GNOME = 1,
	WINDOW_PICKER_ONLY = 2,
}

export enum ForwardBackKeyBinds {
	Default = 0,
	'Forward/Backward' = 1,
	'Page Up/Down' = 2,
	'Right/Left' = 3,
	'Audio Next/Prev' = 4,
	'Tab Next/Prev' = 5,
}

export type AppForwardBackKeyBinds = Record<string, [ForwardBackKeyBinds, boolean]>;

export type BooleanSettings =
	| 'default-session-workspace'
	| 'default-overview'
	| 'allow-minimize-window'
	| 'follow-natural-scroll'
	| 'enable-alttab-gesture'
	| 'enable-forward-back-gesture'
	| 'enable-window-manipulation-gesture'
	| 'default-overview-gesture-direction';

export type IntegerSettings = 'alttab-delay' | 'hold-swipe-delay-duration';

export type DoubleSettings = 'touchpad-speed-scale' | 'touchpad-pinch-speed';

export type EnumSettings = {
	'pinch-3-finger-gesture': PinchGestureType;
	'pinch-4-finger-gesture': PinchGestureType;
	'overview-navifation-states': OverviewNavigationState;
};

export type MiscSettings = {
	'forward-back-application-keyboard-shortcuts': ForwardBackKeyBinds;
};

export type SettingKeys =
	| BooleanSettings
	| IntegerSettings
	| DoubleSettings
	| keyof EnumSettings
	| keyof MiscSettings;

export interface GioSettings extends Gio.Settings {
	get_boolean(key: BooleanSettings): boolean;
	set_boolean(key: BooleanSettings, value: boolean): boolean;
	get_int(key: IntegerSettings): number;
	set_int(key: IntegerSettings, value: number): boolean;
	get_double(key: DoubleSettings): number;
	set_double(key: DoubleSettings, value: number): boolean;
	get_enum<K extends keyof EnumSettings>(key: K): EnumSettings[K];
	set_enum<K extends keyof EnumSettings>(key: K, value: EnumSettings[K]): boolean;
	// TODO: maybe stronger typing?
	get_value<K extends keyof MiscSettings>(key: K): GLib.Variant;
	set_value<K extends keyof MiscSettings>(key: K, value: GLib.Variant): boolean;
}
