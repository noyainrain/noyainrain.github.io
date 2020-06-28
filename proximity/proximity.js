/* TODO */

class Encounter {
    constructor(device, startTime, endTime, powerOut, powerIn) {
        this.device = device;
        this.startTime = startTime;
        this.endTime = endTime;
        this.powerOut = powerOut;
        this.powerIn = powerIn;
    }
}

class Scan {
    constructor(startTime, bleScan) {
        this.startTime = startTime;
        this.endTime = null;
        this.encounters = new Map();
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

        this._scan = null;
        this._renderInterval = null;

        if (!navigator.bluetooth) {
            this.classList.add("proximity-ui-incompatible");
            return;
        }

        document.querySelector("button").addEventListener("click", async () => {
            if (this._scan && !this._scan.endTime) {
                this._scan.bleScan.stop();
                this._scan.endTime = new Date();
                clearInterval(this._renderInterval);
            } else {
                const filters = [{services: [0xFD6F]}];
                // this._scan = await navigator.bluetooth.requestLEScan({acceptAllAdvertisements: true});
                const bleScan = await navigator.bluetooth.requestLEScan({filters});
                this._scan = new Scan(new Date(), bleScan);
                this.classList.add("proximity-ui-has-scan");
                this._renderInterval = setInterval(() => this._render(), 1000);
                this._render();
            }
            this.classList.toggle("proximity-ui-scanning", !this._scan.endTime);
        });
    }

    connectedCallback() {
        if (!navigator.bluetooth) {
            return;
        }

        navigator.bluetooth.addEventListener("advertisementreceived", event => {
            // const decoder = new TextDecoder();
            // const KEY = "0000fd6f-0000-1000-8000-00805f9b34fb";
            // li = new HTMLLIElement();
            // if (KEY in event.serviceData) {
                // data = decoder.decode(event.serviceData[key]);
            /*const keys = Array.from(event.serviceData.keys()).map(k => [k, typeof k]);
            let data = new DataView(event.serviceData.get(KEY).buffer, 0, 16);
            data = decoder.decode(data);
            const encounter = `${event.device.id} ${data}`;
            if (!encounters.has(encounter)) {
                encounters.add(encounter);
                // li.textContent = `${event.device.id} ${event.name} ${event.device.name} ${event.uuids} | ${keys} | ${data} .`;
                const li = document.createElement("li");
                li.textContent = encounter;
                document.querySelector("ul").appendChild(li);
            }*/

            const now = new Date();
            let encounter = this._scan.encounters.get(event.device.id);
            if (!encounter) {
                encounter = new Encounter(event.device.id, now, now, event.txPower, event.rssi);
                this._scan.encounters.set(encounter.device, encounter);
            }
            encounter.endTime = now;
            encounter.powerOut = event.txPower;
            encounter.powerIn = event.rssi;
        });

        // this.querySelector("button").click();
    }

    _render() {
        const p = this.querySelector(".proximity-ui-scan");
        const endTime = this._scan.endTime || new Date();
        const duration = Math.floor((endTime.valueOf() - this._scan.startTime.valueOf()) / 1000);
        // p.textContent = `Scan on ${this._scan.startTime.toLocaleString()} for ${duration} s with ${this._scan.encounters.size} device(s):`;
        p.textContent = `${this._scan.encounters.size} device(s) on ${this._scan.startTime.toLocaleString()} in ${duration} s`;

        const ul = this.querySelector("ul");
        ul.textContent = "";
        for (let encounter of this._scan.encounters.values()) {
            // li.textContent = `${encounter.device}: ${encounter.startTime} - ${encounter.endTime}`;
            /*const duration = Math.floor(
                (encounter.endTime.valueOf() - encounter.startTime.valueOf()) / 1000
            );*/
            // li.textContent = `${encounter.device}: ${duration} s ${encounter.powerIn}/${encounter.powerOut} dBm`;

            const li = document.importNode(document.querySelector("template").content, true);
            li.querySelector("span").textContent = encounter.device;
             li.querySelector("small").textContent = `${encounter.powerIn} / ${encounter.powerOut} dBm`;
            ul.appendChild(li);
        }
    }

    /*async connectedCallback() {
        const scan = await navigator.bluetooth.requestLEScan({acceptAllAdvertisements: true});
        navigator.bluetooth.addEventListener("advertisementreceived", event => {
            // li = new HTMLLIElement();
            const li = document.createElement("li");
            li.textContent = event;
            document.querySelector("ul").appendChild(li);
        });
    }*/
}
customElements.define("proximity-ui", ProximityUI);
