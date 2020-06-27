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

class EncounterUI extends HTMLElement {
    constructor() {
        super();

        const report = error => {
            this.querySelector("main").textContent = `${error.constructor.name}: ${error.message} ${error.stack || "?"}`;
        };
        self.addEventListener("error", event => report(event.error));
        self.addEventListener("unhandledrejection", event => report(event.reason));

        this._encounters = null;
        this._scan = null;

        if (!navigator.bluetooth) {
            this.classList.add("encounter-browser");
            return;
        }

        document.querySelector("button").addEventListener("click", async () => {
            // const scan = await navigator.bluetooth.requestLEScan({acceptAllAdvertisements: true});
            this._encounters = new Map();
            const filters = [{services: [0xFD6F]}];
            this._scan = await navigator.bluetooth.requestLEScan({filters});
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
            let encounter = this._encounters.get(event.device.id);
            if (!encounter) {
                encounter = new Encounter(event.device.id, now, now, event.txPower, event.rssi);
                this._encounters.set(encounter.device, encounter);
            }
            encounter.endTime = now;
            encounter.powerOut = event.txPower;
            encounter.powerIn = event.rssi;

            const ul = this.querySelector("ul");
            ul.textContent = "";
            for (let encounter of this._encounters.values()) {
                const li = document.createElement("li");
                // li.textContent = `${encounter.device}: ${encounter.startTime} - ${encounter.endTime}`;
                const duration = Math.floor(
                    (encounter.endTime.valueOf() - encounter.startTime.valueOf()) / 1000
                );
                li.textContent = `${encounter.device}: ${duration} s ${encounter.powerIn}/${encounter.powerOut} dBm`;
                ul.appendChild(li);
            }
        });

        setInterval(() => {
            if (this._scan) {
                this.querySelector("div").textContent = this._scan.active;
            }
        }, 1000);
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
customElements.define("encounter-ui", EncounterUI);
