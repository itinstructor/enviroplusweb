# -*- coding: utf-8 -*-

"""
Project: Enviro Plus Web
Description: Web interface for Enviro and Enviro+ sensor board plugged into a Raspberry Pi
Author: i.j
Version: 4.1.2
URL: https://gitlab.com/idotj/enviroplusweb
License: GNU
"""

from flask import Flask, render_template, request, redirect, abort
import RPi.GPIO as GPIO
import st7735
import struct
from fonts.ttf import RobotoMedium as UserFont
from PIL import Image, ImageDraw, ImageFont
from pms5003 import PMS5003
from enviroplus.noise import Noise
from enviroplus import gas
from bme280 import BME280
from smbus2 import SMBus

try:
    from ltr559 import LTR559

    ltr559 = LTR559()
except ImportError:
    import ltr559
import logging
import os
import glob
import threading
import json
import requests
from math import ceil, floor
from time import sleep, time, asctime, localtime
from datetime import datetime, timedelta
from config import Config

print("")
print("************************")
print(" Enviro plus web v4.1.2 ")
print("************************")
print("")

# Logging
if Config.DEBUG_LOGGING_ENABLED:
    logging.basicConfig(
        level=logging.DEBUG,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    logging.getLogger().setLevel(logging.DEBUG)
    logging.getLogger("werkzeug").setLevel(logging.DEBUG)
    logging.debug("Logging initialized")
else:
    logging.disable(logging.CRITICAL)

logging.debug(f"Initializing app with the following config:\n{vars(Config)}")

# Language
logging.debug("Loading dictionary folder")
language_list = glob.glob("i18n/*.json")
languages = {}
# App config
app = Flask(__name__)
app.config["TEMPLATES_AUTO_RELOAD"] = True
app_data_folder = "enviroplusweb-data"
app_main_url = "/dashboard"
app_error_template = "error.html"
save_readings_interval = 15
next_save_time = 0
idle_time = 2
run_flag = True
# Sensors
assert Config.GAS_SENSOR or not Config.PARTICULATE_SENSOR
bus = SMBus(1)
bme280 = BME280(i2c_dev=bus)
pms5003 = PMS5003()
noise = Noise()
cpu_temps = []


if Config.FAN_GPIO_ENABLED:
    logging.debug(f"Setting up GPIO fan on pin {Config.FAN_GPIO_PIN}")
    GPIO.setmode(GPIO.BCM)
    GPIO.setwarnings(False)
    GPIO.setup(Config.FAN_GPIO_PIN, GPIO.OUT)
    pwm = GPIO.PWM(Config.FAN_GPIO_PIN, 1000)
    pwm.start(100)


if Config.LCD_SCREEN_ENABLED:
    logging.debug("Setting up LCD Screen")
    disp = st7735.ST7735(
        port=0,
        cs=1,
        dc="GPIO9",
        backlight="GPIO12",
        rotation=270,
        spi_speed_hz=10000000,
    )

    disp.begin()

    WIDTH = disp.width
    HEIGHT = disp.height

    color_above_threshold = (255, 0, 128)
    color_below_threshold = (64, 220, 220)
    color_within_threshold = (64, 220, 64)

    img = Image.new("RGB", (WIDTH, HEIGHT), color=(0, 0, 0))
    draw = ImageDraw.Draw(img)

    path = os.path.dirname(os.path.realpath(__file__)) + "/static/fonts"
    smallfont = ImageFont.truetype(path + "/asap/Asap-Bold.ttf", 10)
    x_offset = 2
    y_offset = 2
    unitTemp = "°C" if Config.SYSTEM_UNITS == "metric" else "°F"
    unitPres = "hPa" if Config.SYSTEM_UNITS == "metric" else "inHg"
    units = [unitTemp, "%", unitPres, "Lux", "u", "u", "u", "u"]

    if Config.GAS_SENSOR:
        units += ["kΩ", "kΩ", "kΩ"]

    if Config.PARTICULATE_SENSOR:
        units += ["μg/m3", "μg/m3", "μg/m3"]

    previous_readings = {}

    def lcd_draw_readings():
        global previous_readings
        draw.rectangle((0, 0, WIDTH, HEIGHT), (0, 0, 0))
        column_count = 2
        row_count = ceil(len(units) / column_count)
        variables = list(current_readings.keys())
        tolerance = 1.01
        if not previous_readings:
            previous_readings = current_readings.copy()

        for i in range(len(units)):
            variable = variables[i + 1]
            data_value = current_readings[variable]
            last_value = previous_readings[variable]

            if data_value is None or last_value is None:
                logging.debug(f"Skipping '{variable}' because of None value")
                continue

            unit = units[i]
            x = x_offset + (WIDTH // column_count) * (i // row_count)
            y = y_offset + (HEIGHT // row_count) * (i % row_count)
            message = "{}: {:s} {}".format(variable[:4], str(data_value), unit)

            if data_value > last_value * tolerance:
                rgb = color_above_threshold
            elif data_value < last_value / tolerance:
                rgb = color_below_threshold
            else:
                rgb = color_within_threshold

            previous_readings[variable] = data_value
            draw.text((x, y), message, font=smallfont, fill=rgb)
        disp.display(img)


def get_cpu_temperature():
    with open("/sys/class/thermal/thermal_zone0/temp", "r") as f:
        temp = f.read()
        temp = int(temp) / 1000.0
    return temp


if Config.TEMP_CPU_COMPENSATION:
    cpu_temps = [get_cpu_temperature()] * 5


def get_temperature_readings():
    global cpu_temps
    raw_temp = bme280.get_temperature()
    if Config.TEMP_CPU_COMPENSATION:
        cpu_temp = get_cpu_temperature()
        cpu_temps = cpu_temps[1:] + [cpu_temp]
        avg_cpu_temp = sum(cpu_temps) / float(len(cpu_temps))
        temperature_scaled = raw_temp - (
            (avg_cpu_temp - raw_temp) / Config.TEMP_COMPENSATION_FACTOR
        )
        temperature = (
            temperature_scaled
            if Config.SYSTEM_UNITS == "metric"
            else temperature_scaled * 1.8 + 32
        )
    else:
        temp_compensated = raw_temp * Config.TEMP_COMPENSATION_FACTOR
        temperature = (
            temp_compensated
            if Config.SYSTEM_UNITS == "metric"
            else temp_compensated * 1.8 + 32
        )

    return {"temp": round(temperature, 1)}


def get_humidity_readings():
    raw_humi = bme280.get_humidity()
    humidity = raw_humi * Config.HUMI_COMPENSATION_FACTOR
    return {"humi": round(humidity, 1)}


def get_pressure_readings():
    raw_pressure = bme280.get_pressure()
    is_system_metric = Config.SYSTEM_UNITS == "metric"
    unit_factor = 1 if is_system_metric else 0.02953
    pressure = raw_pressure * unit_factor + Config.PRES_COMPENSATION_FACTOR
    return {"pres": round(pressure, 1 if is_system_metric else 2)}


def get_light_readings():
    lux = ltr559.get_lux()
    return {"lux": round(lux)}


def fetch_weather_data(url):
    try:
        response = requests.get(url, timeout=5)

        if response.status_code == 200:
            return response.json()
        else:
            logging.error(
                f"Error fetching weather API data: {response.status_code}"
            )
            return {"error": f"Received error code {response.status_code}"}

    except requests.exceptions.Timeout:
        logging.error("Error: The request to weather API timed out")
        return {"error": "The request timed out. Please try again later"}

    except requests.exceptions.ConnectionError:
        logging.error("Error: Unable to connect to the weather API")
        return {
            "error": "Unable to connect to the weather API. Check your network connection"
        }

    except requests.exceptions.RequestException as e:
        logging.error(f"Error: An unexpected error occurred: {e}")
        return {"error": f"An unexpected error occurred: {e}"}


if Config.OPENWEATHER_ENABLED:
    openweather_url = f"{Config.OPENWEATHER_API_URL}?lat={Config.LOCATION_LATITUDE}&lon={Config.LOCATION_LONGITUDE}&appid={Config.OPENWEATHER_API_KEY}&units={Config.SYSTEM_UNITS}"
    openweather_data = []


def get_openweather_readings():
    global openweather_data

    if not hasattr(get_openweather_readings, "last_call_time"):
        get_openweather_readings.last_call_time = 0
        openweather_data = fetch_weather_data(openweather_url)
        return openweather_data

    if (
        time() - get_openweather_readings.last_call_time
        >= Config.OPENWEATHER_CALL_INTERVAL
    ):
        get_openweather_readings.last_call_time = time()
        openweather_data = fetch_weather_data(openweather_url)
        return openweather_data
    else:
        return openweather_data


def get_wind_readings():
    data = get_openweather_readings()
    if "error" in data:
        wind_direction = None
        wind_speed = None
    else:
        try:
            wind_direction = data["wind"]["deg"]
            wind_speed_raw = data["wind"]["speed"]
            if Config.SYSTEM_UNITS == "metric":
                wind_speed = round(wind_speed_raw * 3.6, 1)
            else:
                wind_speed = wind_speed_raw

        except KeyError:
            wind_direction = None
            wind_speed = None

    return {
        "windDir": wind_direction,
        "windSp": wind_speed,
    }


def get_noise_readings():
    low, mid, high, amp = noise.get_noise_profile()
    low *= 128
    mid *= 128
    high *= 128
    amp *= 64
    return {
        "high": round(high, 2),
        "mid": round(mid, 2),
        "low": round(low, 2),
        "amp": round(amp, 2),
    }


def get_gas_readings():
    gases = gas.read_all()
    oxi = round(gases.oxidising / 1000, 1)
    red = round(gases.reducing / 1000)
    nh3 = round(gases.nh3 / 1000)
    return {
        "oxi": oxi,
        "red": red,
        "nh3": nh3,
    }


def get_particles_readings():
    while True:
        try:
            particles = pms5003.read()
            break
        except (RuntimeError, struct.error) as e:
            logging.error(
                "Particle read failed: %s - %s", type(e).__name__, str(e)
            )
            if not run_flag:
                raise e
            pms5003.reset()
            sleep(30)
    pm1 = particles.pm_ug_per_m3(1.0)
    pm25 = particles.pm_ug_per_m3(2.5)
    pm10 = particles.pm_ug_per_m3(10)

    return {
        "pm1": pm1,
        "pm25": pm25,
        "pm10": pm10,
    }


def get_current_readings():
    readings = {"time": asctime(localtime(time()))}
    readings.update(get_temperature_readings())
    readings.update(get_humidity_readings())
    readings.update(get_pressure_readings())
    readings.update(get_light_readings())
    readings.update(get_noise_readings())

    if Config.OPENWEATHER_ENABLED:
        readings.update(get_wind_readings())

    if Config.GAS_SENSOR:
        readings.update(get_gas_readings())

    if Config.PARTICULATE_SENSOR:
        readings.update(get_particles_readings())

    return readings


current_readings = get_current_readings()


def update_readings():
    global current_readings
    current_readings = get_current_readings()
    if Config.LCD_SCREEN_ENABLED:
        lcd_draw_readings()


def save_readings_file():
    current_date_str = datetime.now().strftime("%Y-%m-%d")
    file_path = os.path.join(app_data_folder, f"{current_date_str}.json")

    try:
        if os.path.exists(file_path):
            with open(file_path, "r+", encoding="utf-8") as f:
                try:
                    data = json.load(f)
                    if isinstance(data, list):
                        data.append(current_readings)
                    else:
                        data = [current_readings]
                except json.JSONDecodeError:
                    logging.error(
                        f"⚠️ Warning: Corrupt file detected, resetting {file_path}"
                    )
                    data = [current_readings]

                f.seek(0)
                json.dump(data, f, indent=4)
                f.truncate()
        else:
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump([current_readings], f, indent=4)

        logging.debug(f"Readings saved at {datetime.now().strftime('%H:%M')}")

    except Exception as e:
        logging.error(f"Error saving readings: {e}")


def create_data_folder():
    if not os.path.isdir(app_data_folder):
        os.makedirs(app_data_folder)


def load_downsample_readings(arg):
    now = datetime.now()
    if arg == "day" or arg == "":
        past_time = now - timedelta(hours=24)
        max_readings = None
    elif arg == "week":
        past_time = now - timedelta(days=7)
        max_readings = 192
    elif arg == "month":
        past_time = now - timedelta(days=30)
        max_readings = 192
    elif arg == "year":
        past_time = now - timedelta(days=365)
        max_readings = 192
    else:
        return "[{}]"

    readings = []
    past_timestamp = past_time.timestamp()
    days_to_check = (now - past_time).days + 1  # +1 to include today
    files_to_check = [now - timedelta(days=i) for i in range(days_to_check)]

    for file_date in files_to_check:
        file_path = os.path.join(
            app_data_folder, file_date.strftime("%Y-%m-%d.json")
        )

        if os.path.exists(file_path):
            with open(file_path, "r", encoding="utf-8") as f:
                try:
                    data = json.load(f)
                    day_readings = [
                        entry
                        for entry in data
                        if datetime.strptime(
                            entry["time"], "%a %b %d %H:%M:%S %Y"
                        ).timestamp()
                        >= past_timestamp
                    ]

                    readings.extend(day_readings)

                except json.JSONDecodeError:
                    logging.error(f"Error reading {file_path}, skipping")

    readings.sort(
        key=lambda x: datetime.strptime(x["time"], "%a %b %d %H:%M:%S %Y")
    )

    # Downsample if max_readings is set
    if max_readings and len(readings) > max_readings:
        step = len(readings) // max_readings
        readings = readings[::step]  # Take evenly spaced readings

    return json.dumps(readings, indent=4)


def set_next_save_readings():
    global next_save_time
    next_save_time = datetime.now().replace(second=0, microsecond=0)
    if datetime.now().minute < save_readings_interval:
        next_save_time = next_save_time.replace(minute=save_readings_interval)
    else:
        next_save_time = next_save_time.replace(minute=0) + timedelta(hours=1)


def check_next_save_readings():
    global next_save_time
    if datetime.now() >= next_save_time:
        save_readings_file()
        next_save_time += timedelta(minutes=save_readings_interval)


def background():
    logging.debug("Initializing background tasks")
    set_next_save_readings()
    sleep(idle_time)
    while run_flag:
        update_readings()
        check_next_save_readings()
        sleep(idle_time)


background_thread = threading.Thread(target=background)


def load_languages():
    logging.debug(f"Loading {len(language_list)} dictionaries")
    for lang in language_list:
        lang_code = os.path.splitext(os.path.basename(lang))[0]

        with open(lang, "r", encoding="utf8") as file:
            languages[lang_code] = json.loads(file.read())


def init_app():
    create_data_folder()
    load_languages()
    background_thread.start()
    logging.debug(
        f"Background thread started with a loop interval of {idle_time} seconds"
    )


def kill_app():
    global run_flag
    run_flag = False
    if Config.FAN_GPIO_ENABLED:
        GPIO.cleanup()
    if Config.LCD_SCREEN_ENABLED:
        disp.set_backlight(0)
    logging.debug("Waiting for background tasks to quit...")
    background_thread.join()


@app.route("/")
@app.route(app_main_url, strict_slashes=False)
def redirect_dashboard():
    return redirect(f"{app_main_url}/{Config.LANGUAGE_DEFAULT}")


@app.route(f"{app_main_url}/<language>")
def main_page(language):
    if len(language) != 2:
        logging.error("Wrong url/path for language code")
        return abort(404)

    if not language.isalpha() or language not in languages:
        logging.error(
            "Language code in url/path not available, redirecting to default language"
        )
        return redirect(f"{app_main_url}/{Config.LANGUAGE_DEFAULT}")

    logging.debug("Rendering main page")
    return render_template(
        "index.html",
        **languages[language],
        gas_sensor=Config.GAS_SENSOR,
        particulate_sensor=Config.PARTICULATE_SENSOR,
        fan_gpio=Config.FAN_GPIO_ENABLED,
        system_units=Config.SYSTEM_UNITS,
        browser_updates=Config.BROWSER_UPDATES_WHILE_ACTIVE,
        openweather=Config.OPENWEATHER_ENABLED,
        reboot_button=Config.REBOOT_BUTTON_ENABLED,  # This controls reboot button visibility
        shutdown_button=Config.SHUTDOWN_BUTTON_ENABLED,  # This controls button visibility
    )


@app.route("/readings", strict_slashes=False)
def readings():
    if Config.FAN_GPIO_ENABLED:
        arg = request.args.get("fan", "")
        pwm.ChangeDutyCycle(int(arg))
    return current_readings


@app.route("/graph", strict_slashes=False)
def graph():
    arg = request.args.get("time", "")
    return load_downsample_readings(arg)


@app.route("/reboot", methods=["POST"])
def reboot():
    import subprocess

    try:
        subprocess.Popen(["sudo", "reboot"])
        return "<html><body><h2>Rebooting...</h2></body></html>"
    except Exception as e:
        return f"<html><body><h2>Reboot failed: {e}</h2></body></html>", 500


@app.route("/shutdown", methods=["POST"])
def shutdown():
    import subprocess

    try:
        subprocess.Popen(["sudo", "shutdown", "now"])
        return "<html><body><h2>Shutting down...</h2></body></html>"
    except Exception as e:
        return f"<html><body><h2>Shutdown failed: {e}</h2></body></html>", 500


@app.errorhandler(401)
def unauthorized(e):
    return render_template(app_error_template, error_message=e), 401


@app.errorhandler(403)
def forbidden(e):
    return render_template(app_error_template, error_message=e), 403


@app.errorhandler(404)
def page_not_found(e):
    return render_template(app_error_template, error_message=e), 404


@app.errorhandler(500)
def internal_server_error(e):
    return render_template(app_error_template, error_message=e), 500


if __name__ == "__main__":
    init_app()
    try:
        app.run(
            debug=Config.DEBUG_LOGGING_ENABLED,
            host=Config.HOST,
            port=Config.HOST_PORT,
            use_reloader=False,
        )
    except Exception as e:
        logging.error("Failed to start the app", exc_info=True)
    finally:
        kill_app()
