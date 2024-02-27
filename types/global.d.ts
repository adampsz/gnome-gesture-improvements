/// <reference types="@girs/gjs" />
/// <reference types="@girs/gjs/dom" />
/// <reference types="@girs/gnome-shell/ambient" />
/// <reference types="@girs/gnome-shell/extensions/global" />

// Modules missing from `@girs/gnome-shell`

declare module 'resource:///org/gnome/shell/misc/util.js' {
	export function spawn(argv: string[]): void;
	export function lerp(start: number, end: number, progress: number): number;
}

declare module 'resource:///org/gnome/shell/ui/main.js' {
	import Shell from 'gi://Shell';

	export const actionMode: Shell.ActionMode;
}

declare module 'resource:///org/gnome/shell/ui/overviewControls.js' {
	import Clutter from 'gi://Clutter';
	import St from 'gi://St';

	import { SwipeTracker } from 'resource:///org/gnome/shell/ui/swipeTracker.js';

	export enum ControlsState {
		HIDDEN,
		WINDOW_PICKER,
		APP_GRID,
	}

	export class OverviewAdjustment extends St.Adjustment {
		getStateTransitionParams(): {
			transitioning: boolean;
			initialState: ControlsState;
			finalState: ControlsState;
			currentState: number;
			progress: number;
		};
	}

	export class OverviewControlsManager extends St.Widget {
		_stateAdjustment: OverviewAdjustment;
		layoutManager: Clutter.BoxLayout & {
			_searchEntry: St.Bin;
		};

		_toggleAppsPage(): void;

		_workspacesDisplay: {
			_swipeTracker: SwipeTracker;
		};

		_appDisplay: {
			_swipeTracker: SwipeTracker;
		};

		_searchController: {
			searchActive: boolean;
		};
	}
}

declare module 'resource:///org/gnome/shell/ui/swipeTracker.js' {
	import Clutter from 'gi://Clutter';
	import Shell from 'gi://Shell';
	import GObject from 'gi://GObject';

	export class TouchpadSwipeGesture extends GObject.Object {
		destroy(): void;
		_handleEvent(actor: Clutter.Actor | undefined, event: Clutter.Event): boolean;
	}

	export class SwipeTracker extends GObject.Object {
		constructor(config?: GObject.Object.ConstructorProperties, ...props: unknown[]);

		orientation: Clutter.Orientation;
		enabled: boolean;
		allowLongSwipes: boolean;
		confirmSwipe(
			distance: number,
			snapPoints: number[],
			currentProgress: number,
			cancelProgress: number,
		): void;
		destroy(): void;

		_touchGesture?: Clutter.GestureAction;
		_touchpadGesture?: TouchpadSwipeGesture;
		// custom
		__oldTouchpadGesture?: TouchpadSwipeGesture;
		//
		_allowedModes: Shell.ActionMode;

		_progress: number;
		_beginGesture(): void;
		_updateGesture(): void;
		_endTouchpadGesture(): void;
		_history: {
			reset(): void;
		};
	}
}

declare module 'resource:///org/gnome/shell/ui/workspaceAnimation.js' {
	import Clutter from 'gi://Clutter';
	import Meta from 'gi://Meta';

	import { SwipeTracker } from 'resource:///org/gnome/shell/ui/swipeTracker.js';

	export class WorkspaceAnimationController {
		_swipeTracker: SwipeTracker;
		_switchWorkspaceBegin(
			tracker: {
				orientation: Clutter.Orientation;
				confirmSwipe: typeof prototype.confirmSwipe;
			},
			monitor: number,
		);

		_switchWorkspaceUpdate(tracker: SwipeTracker, progress: number);
		_switchWorkspaceEnd(tracker: SwipeTracker, duration: number, progress: number);

		movingWindow: Meta.Window | undefined;
	}
}
