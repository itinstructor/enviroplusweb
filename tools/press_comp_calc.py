#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Name: press_comp_calc.py
Author: William A Loring
Created: 08/25/25
Purpose: Calculate pressure compensation for EnviroPi
"""
##
# Standard Pressure Altitude Formula (Barometric Formula):
#
#   P = P0 * exp(-h / H)
#
# Where:
#   P  = pressure at altitude h (in hPa)
#   P0 = standard sea level pressure (1013.25 hPa)
#   h  = altitude above sea level (in meters)
#   H  = scale height (approx. 8434.5 meters for Earth's atmosphere)
#
# This formula estimates how atmospheric pressure decreases with altitude.

import math


# ---------------------- PRESSURE AT ALTITUDE ----------------------------- #
def pressure_at_altitude(altitude_m):
    """
    Calculate the standard atmospheric pressure at a given altitude in meters.
    Uses the barometric formula for a quick estimate.
    altitude_m: Altitude in meters
    Returns: Pressure in hPa (hectopascals)
    """
    # hPa, standard sea level pressure
    P0 = 1013.25

    # The formula below estimates how pressure drops as you go higher
    pres = P0 * math.exp(-altitude_m / 8434.5)
    return pres


# --------------- PRESSURE COMPENSATION FACTOR ----------------------------- #
def pres_compensation_factor(altitude, unit="feet"):
    """
    Calculate the pressure compensation factor for a given altitude.
    altitude: The altitude value (in feet or meters)
    unit: 'feet' or 'meters' (default is feet)
    Returns: Compensation factor in hPa
    """
    if unit == "feet":
        # Convert feet to meters if needed
        altitude_m = altitude * 0.3048
    else:
        altitude_m = altitude

    # hPa, standard sea level pressure
    P0 = 1013.25

    # Pressure at the given altitude
    P = pressure_at_altitude(altitude_m)
    # The compensation factor is the difference from sea level
    return round(P0 - P, 2)


def main():
    print("Pressure Compensation Factor Calculator")
    print("Choose altitude unit:")
    print("1. Feet")
    print("2. Meters")

    # Ask the user to choose the unit
    choice = input("Enter 1 or 2: ").strip()
    if choice == "1":
        unit = "feet"
    elif choice == "2":
        unit = "meters"
    else:
        print("Invalid choice. Defaulting to feet.")
        unit = "feet"

    # Ask the user to enter the altitude
    altitude = float(input(f"Enter altitude in {unit}: "))

    # Calculate the compensation factor in hPa
    factor_hpa = pres_compensation_factor(altitude, unit=unit)

    # Convert the compensation factor to inHg (inches of mercury)
    factor_inhg = round(factor_hpa / 33.8639, 4)

    # Show the results in both units
    print(f"PRES_COMPENSATION_FACTOR for {altitude} {unit}:")
    print(f"  {factor_hpa} hPa (metric)")
    print(f"  {factor_inhg} inHg (imperial)")


if __name__ == "__main__":
    main()
