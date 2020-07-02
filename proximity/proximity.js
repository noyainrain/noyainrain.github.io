/* TODO */

class Scan {
    constructor(startTime, bleScan) {
        this.startTime = startTime;
        this.endTime = null;
        this.devices = new Map();
        this.bleScan = bleScan;
    }
}

class ProximityUI extends HTMLElement {
    constructor() {
        super();

        const report = error => {
            this.querySelector("main").textContent = `${error.constructor.name}: ${error.message} ${error.stack || "?"}`;
        };
        self.addEventListener("error", event => report(event.error));
        self.addEventListener("unhandledrejection", event => report(event.reason));

        (async () => {
            await navigator.serviceWorker.register("service.js");
        })();

        this._scan = null;
        this._renderInterval = null;

        document.querySelector(".proximity-ui-scan").addEventListener("click", async () => {
            if (!navigator.bluetooth) {
                this.classList.add("proximity-ui-in-compatibility");
                return;
            }

            if (this._scan && !this._scan.endTime) {
                this._scan.bleScan.stop();
                this._onStop();
            } else {
                try {
                    const filters = [{services: [0xFD6F]}];
                    const bleScan = await navigator.bluetooth.requestLEScan({filters});
                    this._scan = new Scan(new Date(), bleScan);
                    this.classList.add("proximity-ui-has-scan");
                } catch (e) {
                    if (e instanceof DOMException && e.name === "NotAllowedError") {
                        return;
                    }
                    // Chrome errors contradicting spec:
                    // - InvalidStateError if user cancels
                    // - NotFoundError if bluetooth off
                    throw e;
                }
                this._renderInterval = setInterval(() => this._render(), 1000);
                this.classList.add("proximity-ui-scanning");
                this._render();
            }
        });

        document.querySelector("button").addEventListener(
            "click", () => this.classList.add("proximity-ui-in-about")
        );
        document.querySelector(".proximity-ui-dialogs").addEventListener(
            "click", () => {
                if (!this.querySelector(".proximity-ui-dialog-selectable").contains(event.target)) {
                    this.classList.remove("proximity-ui-in-about", "proximity-ui-in-compatibility")
                }
            }
        );
    }

    connectedCallback() {
        if (!navigator.bluetooth) {
            return;
        }

        navigator.bluetooth.addEventListener("advertisementreceived", event => {
            this._scan.devices.set(event.device.id, {id: event.device.id, rssi: event.rssi});
            // const KEY = "0000fd6f-0000-1000-8000-00805f9b34fb";
            // let data = new DataView(event.serviceData.get(KEY).buffer, 0, 16);
            // const decoder = new TextDecoder();
            // data = decoder.decode(data);
        });

        addEventListener("blur", () => {
            if (this._scan && !this._scan.endTime) {
                this._onStop();
            }
        });
    }

    _onStop() {
        this._scan.endTime = new Date();
        clearInterval(this._renderInterval);
        this.classList.remove("proximity-ui-scanning");
        this._render();
    }

    _render() {
        const p = this.querySelector(".proximity-ui-scan-info");
        const endTime = this._scan.endTime || new Date();
        const duration = Math.floor((endTime.valueOf() - this._scan.startTime.valueOf()) / 1000);
        const startTime = this._scan.startTime.toLocaleString("en", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "numeric",
            hour12: false
        });
        p.textContent = `${this._scan.devices.size} device(s) on ${startTime} in ${duration} s`;

        const ul = this.querySelector("ul");
        ul.textContent = "";
        for (let device of this._scan.devices.values()) {
            const li = document.importNode(document.querySelector("template").content, true);
            li.querySelector("span").textContent = device.id;
            li.querySelector("small").textContent = `${device.rssi} dBm`;
            ul.appendChild(li);
        }
    }
}
customElements.define("proximity-ui", ProximityUI);
