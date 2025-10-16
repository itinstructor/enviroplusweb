# 🌿 Enviro Plus Web - Installation and setup guide for Bullseye (legacy)

## Install

To start with, open your terminal and let's update the package list and upgrade them to the latest available version:

```terminal
sudo apt update && sudo apt upgrade -y
```

Then, install the necessary dependencies in your Raspberry Pi:

```terminal
sudo apt install -y git python3-venv python3-pip python3-cffi libportaudio2 python3-numpy python3-smbus python3-pil python3-setuptools python3-flask
```

After installation, enable i2c and SPI:

```terminal
sudo raspi-config nonint do_i2c 0
```

```terminal
sudo raspi-config nonint do_spi 0
```

Enable the serial login shell:

```terminal
sudo raspi-config nonint do_serial 1
```

Also edit your config.txt file by typing:

```terminal
sudo nano /boot/config.txt
```

and add the following lines at the end of the file. Check if you have already `enable_uart=0` and replace it by the value stated here:

```terminal
enable_uart=1
dtoverlay=pi3-miniuart-bt
dtoverlay=adau7002-simple
```

Reboot your Raspberry Pi to apply these changes:

```terminal
sudo reboot now
```

Now it's time to install the Python libraries in the "enviroplusweb" virtual environment. For that, create a new one:

```terminal
python3 -m venv --system-site-packages $HOME/.virtualenvs/enviroplusweb
```

After creation, it has to be activated:

```terminal
source ~/.virtualenvs/enviroplusweb/bin/activate
```

And now the Enviro libraries can be installed:

```terminal
python3 -m pip install enviroplus
```

The system is ready to clone the project in your Raspberry Pi. To achieve this, type:

```terminal
git clone https://gitlab.com/idotj/enviroplusweb.git
```

When cloned, go to the folder:

```terminal
cd enviroplusweb
```

And edit the Python app file to change two GPIO pins for the LCD setup. This change is needed due to a conflict with the new GPIO management in Bookworm in regards with Bullseye.

```terminal
nano enviroplusweb.py
```

Find the following line related with the LCD display:

```python
port=0, cs=1, dc="GPIO9", backlight="GPIO12", rotation=270, spi_speed_hz=10000000
```

and change it by:

```python
port=0, cs=1, dc=9, backlight=12, rotation=270, spi_speed_hz=10000000
```

Exit and save changes.

You can now proceed to the next section.

## Setup

Open the file `config.py` in the folder `enviroplusweb`. You will find the following options set by default. Customize them to your needs:

- Set your host ip address:

  ```python
  HOST = '0.0.0.0'
  ```

- Set your host port:

  ```python
  HOST_PORT = 8080
  ```

- Select the default language using the standard [ISO 639 language code](https://en.wikipedia.org/wiki/List_of_ISO_639_language_codes) (current languages supported: English, French, German, Spanish, Dutch, Catalan):

  ```python
  LANGUAGE_DEFAULT = 'en'
  ```

- Enable/Disable the Enviro LCD screen:

  ```python
  LCD_SCREEN_ENABLED = True
  ```

- Enable/Disable a fan plugged into the Raspberry Pi:

  ```python
  FAN_GPIO_ENABLED = False
  ```

- Set the GPIO pin for the fan:

  ```python
  FAN_GPIO_PIN = 4
  ```

- Displays values in the `metric` or `imperial` system. For example, the temperature is shown in degrees Celsius or degrees Farenheit:

  ```python
  SYSTEM_UNITS = 'metric'
  ```

- Enable/Disable temperature compensation based on the cpu temperature (useful if you have the Enviro board directly connected to the Raspberry Pi):

  ```python
  TEMP_CPU_COMPENSATION = True
  ```

- Modifies the multiplying factor on the values read by the temperature sensor:

  ```python
  TEMP_COMPENSATION_FACTOR = 3.10
  ```

- Modifies the multiplying factor on the values read by the humidity sensor:

  ```python
  HUMI_COMPENSATION_FACTOR = 1.40
  ```

- Modifies the sum factor on the values read by the barometric pressure sensor. Use the tool `pres_comp_calc.py` in the `/tools` folder to calculate the sum factor based on your altitude:

  ```python
  PRES_COMPENSATION_FACTOR = 0.00
  ```

- If you have an Enviro board with gas sensor, enable this option:

  ```python
  GAS_SENSOR = True
  ```

- If you have a particulate sensor [PMS5003](https://shop.pimoroni.com/products/pms5003-particulate-matter-sensor-with-cable?variant=29075640352851), enable this option:

  ```python
  PARTICULATE_SENSOR = True
  ```

- If you prefer your browser continuously update the readings even if the window/tab is not active, then disable this option:

  ```python
  BROWSER_UPDATES_WHILE_ACTIVE = True
  ```

- Show a button in the header to reboot your device:

  ```python
  REBOOT_BUTTON_ENABLED = True
  ```

- Show a button in the header to shutdown your device:

  ```python
  SHUTDOWN_BUTTON_ENABLED = True
  ```

- Enables reading of external Openweather data such as wind direction and wind speed (you need an API key for this feature to work):

  ```python
  OPENWEATHER_ENABLED = False
  ```

- Set the latitude of your location (required for Openweather if enabled):

  ```python
  LOCATION_LATITUDE = ''
  ```

- Set the longitude of your location (required for Openweather if enabled):

  ```python
  LOCATION_LONGITUDE = ''
  ```

- Set your generated API key from Openweathermap.org:

  ```python
  OPENWEATHER_API_KEY = ''
  ```

- Set Openweather API url:

  ```python
  OPENWEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/weather'
  ```

- Frequency of call in seconds to Openweather to update readings. This value may vary depending on the type of your API account (free/paid).

  ```python
  OPENWEATHER_CALL_INTERVAL = 600
  ```

- Enable/Disable debug mode to see more detail during the execution of the app:

  ```python
  DEBUG_LOGGING_ENABLED = False
  ```

### Run

To run the app, be sure to be in the folder `enviroplusweb` and type:

```terminal
python enviroplusweb.py
```

Open your browser and type the IP address of your Raspberry Pi followed by port :8080, example: `http://192.168.1.142:8080`

ℹ️ Remeber that if you reboot the Raspberry Pi, you will need to activate again the Python environment before you run the app:

```terminal
source ~/.virtualenvs/enviroplusweb/bin/activate
```

### Extra setup

You may want to launch Enviro Plus Web on every reboot. To do so, go to the application folder and type this command to run it as a service:

```terminal
sudo bash install-service.sh
```

And when you no longer need it, uninstall it typing:

```terminal
sudo bash uninstall-service.sh
```
