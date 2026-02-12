# Festnetz_Analyse.py
import sys # sucht ob eine Nummer mit angegeben wurde
import phonenumbers # Analyse der Nummer
from phonenumbers import geocoder # Abruf der Geodaten 

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Unbekannt")
        sys.exit(0)
    
    try:
        phone_number = sys.argv[1]
        number = phonenumbers.parse(phone_number, None)
        region = geocoder.description_for_number(number, "de")
        
        # Falls leer, gib "Unbekannt" zurück
        if region and region != "":
            print(region)
        else:
            print("Unbekannt")
    except:
        print("Unbekannt")