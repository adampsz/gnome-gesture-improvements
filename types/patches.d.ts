import Meta from 'gi://Meta';
import St from 'gi://St';

import 'resource:///org/gnome/shell/ui/altTab.js';
declare module 'resource:///org/gnome/shell/ui/altTab.js' {
	module WindowSwitcherPopup {
		interface Item extends St.Widget {
			window: Meta.Window;
		}

		interface Switcher extends St.Widget {
			_scrollView: { hscroll: { adjustment: St.Adjustment } };
		}
	}

	export interface WindowSwitcherPopup {
		_items: WindowSwitcherPopup.Item[];
		_switcherList: WindowSwitcherPopup.Switcher;
		_noModsTimeoutId: number;
		_initialDelayTimeoutId: number;
		_selectedIndex: number;
	}
}

import 'resource:///org/gnome/shell/ui/windowManager.js';
declare module 'resource:///org/gnome/shell/ui/windowManager.js' {
	import { WorkspaceAnimationController } from 'resource:///org/gnome/shell/ui/workspaceAnimation.js';

	export interface WindowManager {
		skipNextEffect(actor: Meta.WindowActor): void;
		_workspaceAnimation: WorkspaceAnimationController;
	}
}
