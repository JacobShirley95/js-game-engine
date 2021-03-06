import Counter from "./counter.js";

export default class Timer extends Counter {
	constructor() {
		super();

		this.delayCounter = new Counter();
		this.delays = [];

		this.intervals = [];

		this.delayed = false;
		this.paused = false;
	}

	static get currentTime() {
		return Date.now();
	}

	reset() {
		this.tick = 0;
		this.delays = [];
		this.intervals = [];
	}

	addDelay(delay) {
		delay.start(this.delayCounter);

		this.delays.push(delay);
	}

	addInterval(interval) {
		interval.reset(this);

		this.intervals.push(interval);
	}

	setTick(newTick) {
		this.tick = newTick;

		for (let interval of this.intervals) {
			interval.reset(this);
		}
	}

	getTick() {
		return this.tick;
	}

	update(main) {
		if (!this.paused) {
			this.delayCounter.update(this);

			let delayed = false;
			let delays = this.delays;

			for (var i = 0; i < delays.length; i++) {
				let delay = delays[i];
				if (!delay.complete(this.delayCounter))
					delayed = true;
				else if (delay.delete()) {
					delays.splice(i, 1);
				}
			}

			if (delayed) {
				return false;
			}

			if (!this.parent) {
				super.update();
			} else {
				this.tick = this.parent.tick;
				this.time = this.parent.time;
			}

			for (let interval of this.intervals) {
				interval.update(this);
			}

			if (main)
				return main();
		}

		return false;
	}
}
