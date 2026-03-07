#!/usr/bin/env python3
# Teil von Number_Check.js - Das ist ein Hilfs-Skript, um Telefonnummern online zu suchen. Es wird von Number_Check.js aufgerufen und gibt die Ergebnisse als JSON zurück.
# Dieses Skript führt eine DuckDuckGo-Suche nach der angegebenen Telefonnummer durch und gibt die gefundenen URLs zurück.
# kann besser genutzt werden mit einem Proxy oder VPN, um Blockierungen zu vermeiden. Es ist wichtig, die Suchanfragen nicht zu schnell hintereinander zu senden, um nicht als Bot erkannt zu werden.
import sys # Für die Übergabe der Telefonnummer als Argument
import json # Für die Ausgabe der Ergebnisse als JSON an das aufrufende JavaScript-Programm
import time, random # Für Anti-Bot-Mechanismen
import requests # Für HTTP-Anfragen
from bs4 import BeautifulSoup # Für die HTML-Analyse der Suchergebnisse

# Konfiguration
DDG_URL = "https://html.duckduckgo.com/html/" #searchengine
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/118.0"
]

# WICHTIG: Loggt nur nach stderr, damit stdout für JSON frei bleibt
def log(msg):
    sys.stderr.write(f"[*] {msg}\n")
    sys.stderr.flush()

def get_stealth_headers():
    return {
        "User-Agent": random.choice(USER_AGENTS), #Zufälliger User-Agent für Anti-Botdetektion
        "Accept-Language": "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": "https://duckduckgo.com/"
    }

def ddg_search(query):
    session = requests.Session()
    # Anti-Blocking: Zufällige Pause vor der Suche
    time.sleep(random.uniform(2.5, 5.5))
    
    try:
        resp = session.post(DDG_URL, data={"q": query, "kl": "de-de"}, headers=get_stealth_headers(), timeout=15)
        if resp.status_code == 403:
            log("GEBLOCKT (403) - DuckDuckGo verweigert den Zugriff.")
            return []
        
        soup = BeautifulSoup(resp.text, "html.parser")
        links = [a.get("href") for a in soup.select("a.result__a") if a.get("href")]
        return links[:5]
    except Exception as e:
        log(f"Fehler: {e}")
        return []

def main():
    if len(sys.argv) < 2: return
    query = sys.argv[1]
    
    log(f"Suche nach {query}...")
    urls = ddg_search(query)
    
    results = []
    for url in urls:
        log(f"Prüfe: {url}")
        results.append({"source": url, "phones": [query]})
        time.sleep(random.uniform(1.0, 2.0)) # Pause zwischen Seitenbesuchen

    # DIE EINZIGE AUSGABE AUF STDOUT
    print(json.dumps(results))

if __name__ == "__main__": # Startet das Skript trotzdem, wenn es direkt aufgerufen wird
    main()