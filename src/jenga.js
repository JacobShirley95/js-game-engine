import Ammo from "./components/ammothree/ammo/ammo.js";
import Physics from "./components/ammothree/ammo/physics.js";
import GameObject from "./components/game-object.js";
import Game from "./base/game.js";

import World from "./components/ammothree/world.js";
import Picker from "./components/ammothree/picker/picker.js";
import PickerCore from "./components/ammothree/picker/picker-core.js";

import MouseController from "./base/controller/mouse.js";

import ThreeRenderer from "./components/ammothree/rendering/three/renderer.js";

const BRICKS = 30;

if (typeof window !== 'undefined') {
    var $debugPane = $("#debug");
}

function setDebugText(text) {
    $debugPane.html(text);
}

export default class Jenga extends Game {
    constructor(config) {
        super(config);

        this.inited = false;

        if (!this.config.headless) {
            this.renderer = new ThreeRenderer(document.body);
            this.initRenderer();
        }

        if (typeof window != 'undefined') {
            $(document).keypress((e) => {
                if (e.key != "a")
                    return;

                console.log("requesting reset");
                //this.engine.restart();
                this.queue.push({name: "RESET22"});
            });
        }
    }

    initRenderer() {
        //create the lighting

        var light = new THREE.DirectionalLight(0xFFFFFF, 1.8);
        light.position.set(10, 50, 10);
        light.position.multiplyScalar(1.3);

        light.castShadow = false;

        light.shadow.mapSize.width = 512 * 4;
        light.shadow.mapSize.height = 512 * 4;

        var d = 50;

        light.shadow.camera.left = -d;
        light.shadow.camera.right = d;
        light.shadow.camera.top = d;
        light.shadow.camera.bottom = -d;

        light.shadow.camera.far = 300;

        this.renderer.init();
        this.renderer.createOrbitControls();
        this.renderer.addObject(light);
        this.renderer.addObject(new THREE.AmbientLight(0xFFFFFF));

        $(document).keypress((k) => {
            if (k.key != "a")
                return;

            this.queue.pushFramed({name: "RESET"});
        });
    }

    createShapes() {
        let size = new Ammo.btVector3(50, 1, 50);
        this.floorShape = new Ammo.btBoxShape(size);
        this.floorShape.setMargin(0.04);

        size = new Ammo.btVector3(1 / 3, 1, 0.15);
        this.pieceShape = new Ammo.btBoxShape(size);
        this.pieceShape.setMargin(0.04);
    }

    reset(state) {
        this.physics.reset();
        this.createShapes();
        this.createObjects(this.config.headless, state);
        this.world.setWorldState(state);
        this.world.update();
    }

    createPiece(position, rotation, useRenderer) {
        var props = {size: {width: 1 / 3, height: 1, length: 0.15},
                     shape: this.pieceShape,
                     color: 0xFFD737,
                     mass: 50,
                     friction: 2,
                     cashShadow: true,
                     receiveShadow: true};

        props.position = position;
        props.rotation = rotation;

        let phys = this.physics.createBlock(props);

        if (useRenderer) {
            var rend = this.renderer.createCube(props);
        }

        return new GameObject(phys, rend);
    }

    createObjects(headless, states) {
        var props2 = {size: {width: 50, height: 1, length: 50},
                      position: {x: 0, y: -1, z: 0},
                      mass: 0,
                      shape: this.floorShape,
                      material: headless ? undefined : new THREE.MeshPhongMaterial({color: 0x136CCC}),
                      friction: 1,
                      cashShadow: true,
                      receiveShadow: true};

        let floor = new GameObject(this.physics.createBlock(props2), headless ? undefined : this.renderer.createCube(props2));
        if (states) {
            this.world.objects[0].physicsObj = floor.physicsObj;
            this.physics.addObject(floor.physicsObj);
        } else
            this.world.addObject(floor);

        if (!headless)
            this.picker.setFloor(floor);

        let w = 1 / 1.5;

        for (let i = 0; i < 1 * BRICKS; i++) {
            let mod = Math.floor(i / 3);
            let height = mod * 0.30;

            if (mod % 2 == 1) {
                var position = {x: -w + ((i % 3) * w), y: 0.15 + height, z: w};
                var rotation = {x: (Math.PI / 2), y: 0, z: 0};
            } else {
                var position = {x: 0, y: 0.15 + height, z: (i % 3) * w};
                var rotation = {x: (Math.PI / 2), y: (Math.PI / 2), z: 0};
            }

            let b = null;
            if (headless) {
                b = this.createPiece(position, rotation, false);
            } else if (typeof states == 'undefined') {
                b = this.createPiece(position, rotation, true);
            } else {
                b = this.createPiece(position, rotation, false);
            }

            if (states) {
                this.world.objects[i + 1].physicsObj = b.physicsObj;
                this.physics.addObject(b.physicsObj);
            } else
                this.world.addObject(b);
        }
    }

    getDebugString() {
        return this.engine.getDebugString();/* + "<br /> Picker updates: " + this.picker.us + "<br /> Applied: " + this.queue.app;*/
    }

    init() {
        this.physics = new Physics();
        this.physics.init();

        this.world = new World(this.engine, this.renderer, this.physics);

        if (!this.config.headless) {
            let mouse = new MouseController(0, false);
            this.engine.controllers.add(mouse);

            this.picker = new Picker(this.queue, this.renderer, this.physics, mouse);
        } else {
            this.picker = new PickerCore(this.physics);
        }

        this.world.addComponent(this.picker);
        this.queue.addProcessor(this.picker);
        this.queue.addProcessor(this);

        //Ammo.destroy(size);

        this.createShapes();
        if (this.isServer) {
            this.createObjects(this.config.headless);
        }
    }

    restart() {
        //this.inited = false;
        console.log("restarting");
        this.physics.reset();
        this.createShapes();
        this.createObjects(this.config.headless, true);
    }

    destroy() {
        this.inited = false;
        this.world.destroy();
    }

    process(update) {
		if (update.name == "CREATE_WORLD") {
            if (!this.isServer && !this.inited) {
                this.inited = true;
                this.createObjects(this.config.headless);
                this.world.setWorldState(update.states);
            } else {
                console.log("reset");
                this.reset(update.states);
            }
		} else if (update.name == "SET_CLOCK") {
			if (!this.queue.isHost) {
                //this.engine.clientInterface.clear();
				this.queue.push({name: "INIT_WORLD"}, true);
			}
		} else if (update.name == "INIT_WORLD") {
			if (this.queue.isHost) {
				let states = this.world.getWorldState();

				this.queue.pushFramed({name: "CREATE_WORLD", states}, true);
			}
		} else if (update.name == "RESET22") {
            console.log("Reset22");
            this.engine.restart();
        }
	}

    logic(frame) {
        this.world.update(frame);
    }

    render() {
        this.world.render();

        setDebugText(this.getDebugString());
    }
}
