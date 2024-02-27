import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Shell from 'gi://Shell';

import { ExtSettings, OverviewControlsState } from '../constants.js';
import { createSwipeTracker, TouchpadSwipeGesture } from './swipeTracker.js';
import { SyntheticEvent } from './utils/dbus.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {
	SwipeTracker,
	TouchpadSwipeGesture as GnomeTouchpadSwipeGesture,
} from 'resource:///org/gnome/shell/ui/swipeTracker.js';
import { WindowManager } from 'resource:///org/gnome/shell/ui/windowManager.js';
import { WorkspaceAnimationController } from 'resource:///org/gnome/shell/ui/workspaceAnimation.js';
import { OverviewAdjustment } from 'resource:///org/gnome/shell/ui/overviewControls.js';

interface ShallowSwipeTracker {
	orientation: Clutter.Orientation;
	confirmSwipe(
		distance: number,
		snapPoints: number[],
		currentProgress: number,
		cancelProgress: number,
	): void;
}

interface ShellSwipeTracker {
	swipeTracker: SwipeTracker;
	nfingers: number[];
	disableOldGesture: boolean;
	modes: Shell.ActionMode;
	followNaturalScroll: boolean;
	gestureSpeed?: number;
	checkAllowedGesture?: (event: Clutter.Event | SyntheticEvent) => boolean;
}

function connectTouchpadEventToTracker(tracker: GnomeTouchpadSwipeGesture) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(global.stage as any).connectObject(
		'captured-event::touchpad',
		tracker._handleEvent.bind(tracker),
		tracker,
	);
}

function disconnectTouchpadEventFromTracker(tracker: GnomeTouchpadSwipeGesture) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(global.stage as any).disconnectObject(tracker);
}

abstract class SwipeTrackerEndPointsModifer {
	protected _firstVal = 0;
	protected _lastVal = 0;
	protected abstract _swipeTracker: SwipeTracker;

	public apply(): void {
		this._swipeTracker.connect('begin', this._gestureBegin.bind(this));
		this._swipeTracker.connect('update', this._gestureUpdate.bind(this));
		this._swipeTracker.connect('end', this._gestureEnd.bind(this));
	}

	protected abstract _gestureBegin(tracker: SwipeTracker, monitor: unknown): void;
	protected abstract _gestureUpdate(tracker: SwipeTracker, progress: number): void;
	protected abstract _gestureEnd(tracker: SwipeTracker, duration: number, progress: number): void;

	protected _modifySnapPoints(
		tracker: SwipeTracker,
		callback: (tracker: ShallowSwipeTracker) => void,
	) {
		const _tracker: ShallowSwipeTracker = {
			orientation: Clutter.Orientation.HORIZONTAL,
			confirmSwipe: (distance, snapPoints, currentProgress, cancelProgress) => {
				this._firstVal = snapPoints[0];
				this._lastVal = snapPoints[snapPoints.length - 1];

				snapPoints.unshift(this._firstVal - 1);
				snapPoints.push(this._lastVal + 1);

				tracker.orientation = _tracker.orientation;
				tracker.confirmSwipe(distance, snapPoints, currentProgress, cancelProgress);
			},
		};
		callback(_tracker);
	}

	public destroy(): void {
		this._swipeTracker.enabled = false;
	}
}

class WorkspaceAnimationModifier extends SwipeTrackerEndPointsModifer {
	private _workspaceAnimation: WorkspaceAnimationController;
	protected _swipeTracker: SwipeTracker;

	constructor(wm: WindowManager) {
		super();
		this._workspaceAnimation = wm._workspaceAnimation;
		this._swipeTracker = createSwipeTracker(
			global.stage,
			ExtSettings.DEFAULT_SESSION_WORKSPACE_GESTURE ? [3] : [4],
			Shell.ActionMode.NORMAL,
			Clutter.Orientation.HORIZONTAL,
			ExtSettings.FOLLOW_NATURAL_SCROLL,
			1,
			{ allowTouch: false },
		);
	}

	apply(): void {
		if (this._workspaceAnimation._swipeTracker._touchpadGesture) {
			disconnectTouchpadEventFromTracker(this._workspaceAnimation._swipeTracker._touchpadGesture);
		}
		super.apply();
	}

	protected _gestureBegin(tracker: SwipeTracker, monitor: number): void {
		super._modifySnapPoints(tracker, (shallowTracker) => {
			this._workspaceAnimation._switchWorkspaceBegin(shallowTracker, monitor);
			tracker.orientation = shallowTracker.orientation;
		});
	}

	protected _gestureUpdate(tracker: SwipeTracker, progress: number): void {
		if (progress < this._firstVal) {
			progress = this._firstVal - (this._firstVal - progress) * 0.05;
		} else if (progress > this._lastVal) {
			progress = this._lastVal + (progress - this._lastVal) * 0.05;
		}
		this._workspaceAnimation._switchWorkspaceUpdate(tracker, progress);
	}

	protected _gestureEnd(tracker: SwipeTracker, duration: number, progress: number): void {
		progress = Math.clamp(progress, this._firstVal, this._lastVal);
		this._workspaceAnimation._switchWorkspaceEnd(tracker, duration, progress);
	}

	destroy(): void {
		this._swipeTracker.destroy();
		const swipeTracker = this._workspaceAnimation._swipeTracker;
		if (swipeTracker._touchpadGesture) {
			connectTouchpadEventToTracker(swipeTracker._touchpadGesture);
		}

		super.destroy();
	}
}

export class GestureExtension {
	private _stateAdjustment: OverviewAdjustment;
	private _swipeTrackers: ShellSwipeTracker[];
	private _workspaceAnimationModifier: WorkspaceAnimationModifier;

	constructor() {
		this._stateAdjustment = Main.overview._overview._controls._stateAdjustment;
		this._swipeTrackers = [
			{
				swipeTracker: Main.overview._overview._controls._workspacesDisplay._swipeTracker,
				nfingers: [3, 4],
				disableOldGesture: true,
				followNaturalScroll: ExtSettings.FOLLOW_NATURAL_SCROLL,
				modes: Shell.ActionMode.OVERVIEW,
				gestureSpeed: 1,
				checkAllowedGesture: (event: Clutter.Event | SyntheticEvent) => {
					if (Main.overview._overview._controls._searchController.searchActive) {
						return false;
					}
					if (event.get_touchpad_gesture_finger_count() === 4) {
						return true;
					} else {
						return this._stateAdjustment.value === OverviewControlsState.WINDOW_PICKER;
					}
				},
			},
			{
				swipeTracker: Main.overview._overview._controls._appDisplay._swipeTracker,
				nfingers: [3],
				disableOldGesture: true,
				followNaturalScroll: ExtSettings.FOLLOW_NATURAL_SCROLL,
				modes: Shell.ActionMode.OVERVIEW,
				checkAllowedGesture: () => {
					if (Main.overview._overview._controls._searchController.searchActive) {
						return false;
					}
					return this._stateAdjustment.value === OverviewControlsState.APP_GRID;
				},
			},
		];

		this._workspaceAnimationModifier = new WorkspaceAnimationModifier(Main.wm);
	}

	apply(): void {
		this._workspaceAnimationModifier.apply();

		this._swipeTrackers.forEach((entry) => {
			const {
				swipeTracker,
				nfingers,
				disableOldGesture,
				followNaturalScroll,
				modes,
				checkAllowedGesture,
			} = entry;
			const gestureSpeed = entry.gestureSpeed ?? 1;
			const touchpadGesture = new TouchpadSwipeGesture(
				nfingers,
				modes,
				swipeTracker.orientation,
				followNaturalScroll,
				checkAllowedGesture,
				gestureSpeed,
			);

			this._attachGestureToTracker(swipeTracker, touchpadGesture, disableOldGesture);
		});
	}

	destroy(): void {
		this._swipeTrackers.reverse().forEach((entry) => {
			const { swipeTracker, disableOldGesture } = entry;
			swipeTracker._touchpadGesture?.destroy();
			swipeTracker._touchpadGesture = swipeTracker.__oldTouchpadGesture;
			swipeTracker.__oldTouchpadGesture = undefined;
			if (swipeTracker._touchpadGesture && disableOldGesture) {
				connectTouchpadEventToTracker(swipeTracker._touchpadGesture);
			}
		});

		this._workspaceAnimationModifier.destroy();
	}

	_attachGestureToTracker(
		swipeTracker: SwipeTracker,
		touchpadSwipeGesture: TouchpadSwipeGesture,
		disablePrevious: boolean,
	): void {
		if (swipeTracker._touchpadGesture && disablePrevious) {
			disconnectTouchpadEventFromTracker(swipeTracker._touchpadGesture);
			swipeTracker.__oldTouchpadGesture = swipeTracker._touchpadGesture;
		}

		swipeTracker._touchpadGesture = touchpadSwipeGesture;
		swipeTracker._touchpadGesture.connect('begin', swipeTracker._beginGesture.bind(swipeTracker));
		swipeTracker._touchpadGesture.connect('update', swipeTracker._updateGesture.bind(swipeTracker));
		swipeTracker._touchpadGesture.connect(
			'end',
			swipeTracker._endTouchpadGesture.bind(swipeTracker),
		);
		swipeTracker.bind_property('enabled', swipeTracker._touchpadGesture, 'enabled', 0);
		swipeTracker.bind_property(
			'orientation',
			swipeTracker._touchpadGesture,
			'orientation',
			GObject.BindingFlags.SYNC_CREATE,
		);
	}
}
