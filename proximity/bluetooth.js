/* TODO **/

class BluetoothAdvertisingEvent extends Event {
    constructor(type, init) {
        super(type, init);
        this.device = init.device;
        this.txPower = init.txPower;
        this.rssi = init.rssi;
    }
}

class BluetoothLEScan {
    constructor() {
        function advertise(device, txPower) {
            const rssi = Math.floor(Math.random() * (txPower * 2 / 3 - txPower / 3) + txPower / 3);
            navigator.bluetooth.dispatchEvent(
                new BluetoothAdvertisingEvent(
                    "advertisementreceived", {device: {id: device}, txPower, rssi}
                )
            );
        }
        this._intervalFoo = setInterval(() => advertise("foo", 150), 500);
        this._intervalFoo = setInterval(() => advertise("bar", 130), 1000);
        this.active = true;
    }

    stop() {
        clearInterval(this._intervalFoo);
        clearInterval(this._intervalBar);
        this.active = false;
    }
}

class Bluetooth extends EventTarget {
    async requestLEScan() {
        return new BluetoothLEScan();
    }
};

navigator.bluetooth = new Bluetooth();
