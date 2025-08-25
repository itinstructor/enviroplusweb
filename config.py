# -*- coding: utf-8 -*-

"""
Project: Enviro Plus Web
Description: Web interface for Enviro and Enviro+ sensor board plugged into a Raspberry Pi
Author: i.j
Version: 4.0.2
URL: https://gitlab.com/idotj/enviroplusweb
License: GNU
"""

# Please check the documentation to learn more about each setting and available parameters
class Config:
    HOST = "0.0.0.0"
    HOST_PORT = 8080
    LANGUAGE_DEFAULT = "en"
    LCD_SCREEN_ENABLED = True
    FAN_GPIO_ENABLED = False
    FAN_GPIO_PIN = 4
    SYSTEM_UNITS = "metric"
    TEMP_CPU_COMPENSATION = True
    TEMP_COMPENSATION_FACTOR = 3.10
    HUMI_COMPENSATION_FACTOR = 1.40
    PRES_COMPENSATION_FACTOR = 0.00
    GAS_SENSOR = True
    PARTICULATE_SENSOR = True
    BROWSER_UPDATES_WHILE_ACTIVE = True
    LOCATION_LATITUDE = ""
    LOCATION_LONGITUDE = ""
    OPENWEATHER_ENABLED = False
    OPENWEATHER_API_KEY = ""
    OPENWEATHER_API_URL = "https://api.openweathermap.org/data/2.5/weather"
    OPENWEATHER_CALL_INTERVAL = 600
    DEBUG_LOGGING_ENABLED = False
