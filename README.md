# Ajax2MQTT

**Note:** this project is not affiliated with Ajax Systems.

I made this project during a couple of weekends. Something could've been done better — but it is what it is. Pull requests are welcome.

## What is it?
This app takes messages from [ajax security modules](https://ajax.systems) and sends them via MQTT, making possible to use Ajax devices in your Homeassistant or Homebridge, save telemetry to InfluxDB, etc.

It **doesn’t use Ajax cloud services**, doesn’t require internet connection and doesn’t expose any data outside of local network. However it requires special hardware module to interface Ajax wireless protocol (see [Required Hardware](#required-hardware) section below).

### Supported devices
- uartBridge
- [FireProtect](https://ajax.systems/products/fireprotect)
- ~~FireProtect Plus~~
- ~~MotionProtect (MotionProtect Plus)~~
- ~~DoorProtect~~
- ~~SpaceControl~~
- ~~GlassProtect~~
- ~~CombiProtect~~
- ~~LeaksProtect~~

### Homeassistant integration
All your Ajax devices will be accessible in HASS thanks to the MQTT discovery. If you don’t need this feature, you can set `hass.enabled` config value to `false`.

<img src="./img_hass.png" width="300">

## Required Hardware
- [Ajax uartBridge](https://ajax.systems/products/uartbridge) to interface wireless Ajax devices. Costs about $30 ([where to buy](https://ajax.systems/where-to-buy)).
- USB-UART adapter. Any cheap adapter will work fine, I am using [this one](https://a.aliexpress.com/_mscVzYx). Costs about $1.

### Connecting everything together
- Connect **TX** pin on bridge to **RX** pin on USB-UART adapter
- Connect **RX** pin on bridge to **TX** pin on adapter
- Connect **GND** pins together
- Connect **+5V** pins together
- Plug the adapter into USB port on your computer

## Installation
I will use the [PM2](https://pm2.keymetrics.io/docs/usage/quick-start/) as an example, but you can use any process manager (upstart, systemd, etc).

**1. Clone the repository**
```
git clone https://github.com/ingria/ajax-security-mqtt
```

**2. Install the dependencies**
```
cd ajax-security-mqtt && npm install
```

**3. Change the config file**
```
cp config.yaml.example config.yaml
nano config.yaml # Or open config.yaml in any text editor
```

**4. Launch the process**
```
pm2 start --no-automation --name ajax-uart-bridge npm -- run start --prefix /path/to/ajax-security-mqtt/
```

## License
The Unlicense License. Please see [License File](LICENSE.md) for more information.
