let _trans = new Ammo.btTransform(); // taking this out of the loop below us reduces the leaking

const DEFAULT_UPDATE_RATE = 1000/60;

class World extends Timer {
    constructor(renderer, physics, updatePool) {
        super();

        this.objects = [];
        this.renderer = renderer;
        this.physics = physics;
        //this.networking = networking;
        this.updatePool = updatePool;

        this.updateInterval = DEFAULT_UPDATE_RATE;
        this.updateTimer = new Timer();

        this.picker = new Picker(this.renderer, this.physics, this.updateTimer);

        this.renderTime = 0;
        this.updateTime = 0;
        this.fps = 0;
        this.tempFPS = 0;

        this.ups = 0;
        this.tempUPS = 0;
    }

    init() {
        this.renderer.init();
        this.physics.init();
    }

    destroy() {
        this.renderer.destroy();
        this.physics.destroy();
    }

    reset(state) {
        let newObjects = [];

        for (let object of this.objects) {
            newObjects.push(object.copy());
        }

        this.removeAll(true);
        this.physics.reset();

        for (let object of newObjects) {
            this.addObject(object);
        }

        if (state)
            this.physics.setAllObjectProps(state);
    }

    addObject(object) {
        object.init(this.physics);

        this.objects.push(object);

        this.renderer.addObject(object);
        this.physics.addObject(object);
    }

    removeAll(destroy) {
        this.physics.removeAll(destroy);
        this.renderer.removeAll();

        this.objects = [];
    }

    setUpdateRate(updateRate) {
        this.updateInterval = 1000/updateRate;
    }

    getDebugString() {
        return "Tick: "+this.updateTimer.tick+"<br /> Time (ms): "+this.updateTimer.time+"<br /> FPS: "+this.fps+"<br /> UPS: "+this.ups+" <br />Net updates: "+this.updatePool.processedUpdates;
    }

    update() {
        return super.update(() => {
            const dt = this.updateInterval/1000.0;
            let t = 0;
            while (this.updateTime >= this.updateInterval && t < 7) { // < 7 so it can catch up and doesn't go crazy
                if (!this.updateTimer.update(() => {
                    //if (this.networking)
                    //    this.networking.update();

                    this.picker.update();
                    this.updatePool.update(this.updateTimer.tick);
                    this.physics.update(dt);

                    t++;

                    this.updateTime -= this.updateInterval;
                    this.tempUPS++;

                    return true;
                })) {
                    this.updateTime -= this.updateInterval;
                    //console.log("DD");
                }
            }

            for (let obj of this.objects) {
                let body = obj.physicsData.body;
                let mesh = obj.renderData.mesh;
                let mS = body.getMotionState();
                if (mS) {
                    mS.getWorldTransform(_trans);

                    let origin = _trans.getOrigin();
                    let rotation = _trans.getRotation();

                    mesh.position.set(origin.x(), origin.y(), origin.z());
                    mesh.quaternion.set(rotation.x(), rotation.y(), rotation.z(), rotation.w());
                }
            }

            this.renderer.render();

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
