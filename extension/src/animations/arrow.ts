import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import St from 'gi://St';

import { easeActor } from '../utils/environment.js';
import { WIGET_SHOWING_DURATION } from '../../constants.js';

import * as Util from 'resource:///org/gnome/shell/misc/util.js';

type IconList = 'arrow1-right-symbolic.svg' | 'arrow1-left-symbolic.svg';

interface Circle extends InstanceType<typeof Circle> {}
const Circle = GObject.registerClass(
	class Circle extends St.Widget {
		constructor(styleClass: string) {
			super({ styleClass: `gie-circle ${styleClass}` });
			this.set_pivot_point(0.5, 0.5);
		}
	},
);

export interface ArrowIconAnimation extends InstanceType<typeof ArrowIconAnimation> {}
export const ArrowIconAnimation = GObject.registerClass(
	class ArrowIconAnimation extends St.Widget {
		private _inner_circle: Circle;
		private _outer_circle: Circle;
		private _arrow_icon: St.Icon;
		private _transition?: {
			arrow: { from: number; end: number };
			outer_circle: { from: number; end: number };
		};

		constructor() {
			super();

			this._inner_circle = new Circle('gie-inner-circle');
			this._outer_circle = new Circle('gie-outer-circle');
			this._arrow_icon = new St.Icon({ styleClass: 'gie-arrow-icon' });

			this._inner_circle.set_clip_to_allocation(true);
			this._inner_circle.add_child(this._arrow_icon);

			this.add_child(this._outer_circle);
			this.add_child(this._inner_circle);
		}

		gestureBegin(_icon_name: IconList, from_left: boolean) {
			this._transition = {
				arrow: {
					from: this._inner_circle.width * (from_left ? -1 : 1),
					end: 0,
				},
				outer_circle: {
					from: 1,
					end: 2,
				},
			};

			this._arrow_icon.translationX = this._transition.arrow.from;
			this._outer_circle.scaleX = this._transition.outer_circle.from;
			this._outer_circle.scaleX = this._outer_circle.scaleY;
			this._arrow_icon.opacity = 255;

			// animating showing widget
			this.opacity = 0;
			this.show();
			easeActor(this as St.Widget, {
				opacity: 255,
				mode: Clutter.AnimationMode.EASE_OUT_QUAD,
				duration: WIGET_SHOWING_DURATION,
			});

			// TODO
			//this._arrow_icon.set_gicon(Gio.Icon.new_for_string(`${ExtMe.dir.get_uri()}/assets/${icon_name}`));
		}

		gestureUpdate(progress: number) {
			if (this._transition === undefined) return;

			this._arrow_icon.translationX = Util.lerp(
				this._transition.arrow.from,
				this._transition.arrow.end,
				progress,
			);
			this._outer_circle.scaleX = Util.lerp(
				this._transition.outer_circle.from,
				this._transition.outer_circle.end,
				progress,
			);
			this._outer_circle.scaleY = this._outer_circle.scaleX;
		}

		gestureEnd(duration: number, progress: number, callback: () => void) {
			if (this._transition === undefined) return;

			easeActor(this as St.Widget, {
				opacity: 0,
				mode: Clutter.AnimationMode.EASE_OUT_QUAD,
				duration,
			});

			const translationX = Util.lerp(
				this._transition.arrow.from,
				this._transition.arrow.end,
				progress,
			);
			easeActor(this._arrow_icon, {
				translationX,
				duration,
				mode: Clutter.AnimationMode.EASE_OUT_EXPO,
				onStopped: () => {
					callback();
					this.hide();
					this._arrow_icon.opacity = 0;
					this._arrow_icon.translationX = 0;
					this._outer_circle.scaleX = 1;
					this._outer_circle.scaleY = 1;
				},
			});

			const scale = Util.lerp(
				this._transition.outer_circle.from,
				this._transition.outer_circle.end,
				progress,
			);
			easeActor(this._outer_circle, {
				scaleX: scale,
				scaleY: scale,
				duration,
				mode: Clutter.AnimationMode.EASE_OUT_EXPO,
			});
		}
	},
);
