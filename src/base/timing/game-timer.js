import Timer from "./timer.js";
import RenderTimer from "./render-timer.js";

const DEFAULT_UPDATE_RATE = 1000 / 60;

export default class GameTimer extends RenderTimer {
	constructor(logicTimer, renderFunc, logicFunc) {
		super();

		this.renderFunc = renderFunc || (() => {});
		this.logicFunc = logicFunc || (() => {});

        this.logicInterval = DEFAULT_UPDATE_RATE;
        this.logicTimer = logicTimer || new Timer();

        this.renderTime = 0;
        this.updateTime = 0;
        this.fps = 0;
        this.tempFPS = 0;

        this.ups = 0;
        this.tempUPS = 0;

		this.catchup = 4;
		this._dynamicCatchup = this.catchup;
		this.lastUpdateDuration = 0;

		this.setMaxDeltaTime(100);
    }

	setRenderFunction(func) {
		this.renderFunc = func;
	}

	setLogicFunction(func) {
		this.logicFunc = func;
	}

	setUpdateRate(updateRate) {
        this.logicInterval = 1000.0 / updateRate;
    }

	setMaxCatchup(catchup) {
		this.catchup = catchup;
		this._dynamicCatchup = this.catchup;
	}

	getDebugString() {
        return "Tick: "+this.logicTimer.tick+"<br /> Time (ms): "+this.logicTimer.time+"<br /> FPS: "+this.fps+"<br /> UPS: "+this.ups;
    }

	update() {
		let i = 0;

		let start = Date.now();
		if (this.updateTime > 100) {
			//console.log(this.updateTime);
		}
		while (this.updateTime >= this.logicInterval && i < this.catchup) {
			if (!this.logicTimer.update(() => {
				this.logicFunc(this.logicTimer.tick);

				this.updateTime -= this.logicInterval;
				this.tempUPS++;

				i++;

				return true;
			})) {
				this.updateTime -= this.logicInterval;
			}
		}

		this.lastUpdateDuration = Date.now() - start;
	}

	render() {
		return super.update(() => {
            this.update();
			this.renderFunc();

            this.renderTime += this.deltaTime;
            this.updateTime += this.deltaTime;
            this.tempFPS++;

            if (this.renderTime >= 1000) {
                this.fps = this.tempFPS;
                this.ups = this.tempUPS;

                this.renderTime = 0;
                this.tempFPS = 0;
                this.tempUPS = 0;
            }

            return true;
        });
	}
}
