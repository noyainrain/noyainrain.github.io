/* TODO **/

class BluetoothAdvertisingEvent extends Event {
    constructor(type, init) {
        super(type, init);
        this.device = init.device;
        this.rssi = init.rssi;
    }
}

class BluetoothLEScan {
    constructor() {
        this._intervals = [250, 500, 1000].map(t => {
            const data = new Uint8Array(16);
            crypto.getRandomValues(data);
            const id = btoa(String.fromCharCode(...data));
            return setInterval(() => {
                const rssi = Math.floor(Math.random() * -25 - 75);
                navigator.bluetooth.dispatchEvent(
                    new BluetoothAdvertisingEvent(
                        "advertisementreceived", {device: {id}, rssi}
                    )
                );
            }, t);
        });
        this.active = true;
    }

    stop() {
        for (let interval of this._intervals) {
            clearInterval(interval);
        }
        this.active = false;
    }
}

class Bluetooth extends EventTarget {
    async requestLEScan() {
        return new BluetoothLEScan();
    }
};

Object.defineProperty(navigator, "bluetooth", {value: new Bluetooth()});
