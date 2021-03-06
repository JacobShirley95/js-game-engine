import UpdateStream from "../base/updates/streamed/stream.js";
import StreamUpdateQueue from "../base/updates/streamed/stream-update-queue.js";
import LockstepQueueError from "./lockstep-queue-error.js";
import EventEmitter from "../shims/events.js";

const LATENCY = 20;

export default class LockstepUpdateQueue extends StreamUpdateQueue {
	constructor(local, clients) {
		super(local, clients);

		this.updates = [];
		this.app = 0;
	}

	queueLocalUpdates() {
		this.updates = this.updates.concat(this.local.localUpdates.splice(0));
	}

	queueUpdates(frame) {
		let applied = [];

		//process host first

		let stream = this.clients.host();
		let it = stream.iterator();

		while (it.hasNext()) {
			let u = it.next();

			u.__clId = stream.id();
			if (u.frame == frame) {
				it.remove();

				if (u.name == "APPLY") {
					this.app++;
					let data = u.updateMeta;
					for (let d of data) {
						let cl = this.clients.get(d.id);

						cl.toBeRead = d.count;
						//console.log(u);
					}
				}

				this.updates.push(u);
			} else if (u.frame < frame) {
				//console.log("frame behind: "+u.frame+" < "+frame+": "+u.name);
				it.remove();
			} else if (!u.frame) {
				it.remove();

				this.updates.push(u);
			}
		}

		//every other stream
		let clients = this.clients.iterator();

		while (clients.hasNext()) {
			stream = clients.remove();

			if (!stream.host()) {
				let it = stream.iterator();

				if (this.isHost) {
					let i = 0;
					let updated = false;

					while (it.hasNext()) {
						let u = it.remove();
						u.__clId = stream.id();
						if (typeof u.frame != 'undefined') {
							updated = true;
							i++;
						}

						this.updates.push(u);
					}

					if (updated) {
						//console.log("applied "+i+ " on frame "+frame);
						this.app++;
						applied.push({id: stream.id(), count: i});
					}
				} else {
						//console.log("applied "+stream.toBeRead+" on frame "+frame);
					while (it.hasNext()) {
						let u = it.next();
						u.__clId = stream.id();

						if (typeof u.frame != 'undefined') {
							if (stream.toBeRead > 0) {
								it.remove();
								
							 	this.updates.push(u);
								stream.toBeRead--;
							}
						} else {
							it.remove();
							this.updates.push(u);
						}
					}

					if (stream.toBeRead > 0) {
						console.log("Has not received " + stream.toBeRead + " updates from client " + stream.id());
						throw new LockstepQueueError(-1);
					}
				}
			}
		}

		if (this.isHost && applied.length > 0) {
			this.local.push({name: "APPLY", frame, updateMeta: applied}, true);
		}
	}

	handleUpdates(frame) {
		while (this.updates.length > 0) {
			this.processUpdate(this.updates.shift());
		}
	}

	processUpdate(u) {
		for (let processor of this.processors) {
			processor.process(u);
		}

		this.processedUpdates++;
	}

	update(frame) {
		super.update();

		this.queueLocalUpdates(frame);
		this.queueUpdates(frame);
		this.handleUpdates(frame);
	}
}
