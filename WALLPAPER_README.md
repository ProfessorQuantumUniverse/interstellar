# 🌌 Interstellar Live Wallpaper

Ein atemberaubendes Live-Hintergrundbild inspiriert vom Film "Interstellar" mit Einstein-Zitaten, NASA APOD und wissenschaftlichen Fakten.

## ✨ Features

- **Schwarzes Loch Hintergrund** - Inspiriert von Gargantua aus Interstellar
- **Glasmorphismus-Design** - Moderne, transparente Panels mit Blur-Effekt
- **NASA APOD** - Täglich aktualisiertes Astronomy Picture of the Day
- **Einstein-Zitate** - Wechselnde inspirierende Zitate
- **Wissenschaftliche Fakten** - Nerdy Gimmicks über Schwarze Löcher, Zeitdilatation und mehr
- **Effizientes Caching** - Minimaler Ressourcenverbrauch
- **Keine Sekundenanzeige** - Nur Stunden und Minuten für Ressourcenschonung

## 🚀 Installation in Lively Wallpaper

### Voraussetzungen
1. [Lively Wallpaper](https://www.rocksdanister.com/lively/) installieren
2. Die Datei `wallpaper.html` aus diesem Repository

### Schritte

1. **Lively Wallpaper öffnen**
2. **Neues Hintergrundbild hinzufügen**:
   - Klicken Sie auf das `+` Symbol
   - Wählen Sie "Webseite" oder "HTML"
3. **HTML-Datei auswählen**:
   - Navigieren Sie zu `wallpaper.html`
   - Wählen Sie die Datei aus
4. **Anwenden**:
   - Das Hintergrundbild wird nun aktiviert!

## ⚙️ Anpassungen

### Hintergrundbild ändern

Um ein eigenes Schwarzes-Loch-Bild zu verwenden, öffnen Sie `wallpaper.html` und ändern Sie im `<style>`-Bereich:

```css
#background {
    background-image: url('pfad-zu-deinem-bild.jpg');
    /* Rest des Codes bleibt gleich */
}
```

### NASA API Key

Die Demo verwendet `DEMO_KEY` für die NASA APOD API. Für längere Nutzung:

1. Holen Sie sich einen kostenlosen API-Key: https://api.nasa.gov/
2. Ersetzen Sie in `wallpaper.html`:
   ```javascript
   const APOD_API_KEY = 'IHR_API_KEY';
   ```

### Farben anpassen

Die Glaseffekte können angepasst werden:

```css
.glass-container {
    background: rgba(255, 255, 255, 0.05); /* Transparenz */
    backdrop-filter: blur(20px); /* Blur-Stärke */
    border: 1px solid rgba(255, 255, 255, 0.1); /* Rahmen */
}
```

### Update-Intervalle

Standardmäßig:
- **Zeit**: Jede Minute (keine Sekunden!)
- **Zitate**: Alle 10 Minuten
- **APOD**: Einmal täglich (24h Cache)

Änderbar im JavaScript-Code:
```javascript
const CACHE_DURATION = 3600000; // 1 Stunde für APOD-Refresh
const APOD_CACHE_DURATION = 86400000; // 24 Stunden für APOD-Cache
```

## 🎨 Design-Elemente

### Panels
- **Oben links**: NASA Astronomy Picture of the Day
- **Oben rechts**: Datum und Uhrzeit (ohne Sekunden)
- **Unten links**: Einstein-Zitate
- **Unten rechts**: Wissenschaftliche Fakten über Interstellar und das Universum

### Glaseffekt
Modernes Glasmorphismus-Design mit:
- Semi-transparentem Hintergrund
- Backdrop-Blur für Tiefeneffekt
- Subtile Schatten und Rahmen
- Responsive zu verschiedenen Bildschirmgrößen

## 🔧 Technische Details

### Ressourcen-Optimierung
- **LocalStorage Caching**: NASA APOD wird 24h gecacht
- **Keine Sekundenuhren**: Update nur jede Minute
- **Effiziente Updates**: Nur notwendige DOM-Änderungen
- **Lazy Loading**: Bilder werden nur bei Bedarf geladen

### Browser-Kompatibilität
- Chrome/Edge (empfohlen für Lively)
- Firefox
- Safari
- Benötigt moderne CSS-Unterstützung für `backdrop-filter`

## 📝 Hinweise

- Bei ersten Start kann APOD-Laden einige Sekunden dauern
- Ohne Internet: Fallback-Text wird angezeigt
- DEMO_KEY hat Rate-Limits (30 Anfragen/Stunde)
- Für produktiven Einsatz eigenen NASA API-Key verwenden

## 🌟 Inspiriert von

- **Interstellar** (2014) - Regie: Christopher Nolan
- **NASA** - Astronomy Picture of the Day
- **Albert Einstein** - Zitate und wissenschaftliche Weisheiten

## 📜 Lizenz

Dieses Projekt ist Teil des [Interstellar Repository](https://github.com/ProfessorQuantumUniverse/interstellar).
