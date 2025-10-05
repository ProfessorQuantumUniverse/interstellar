// Uniforms für die Steuerung aus JavaScript
uniform float u_time;       // Zeit für die Animation der Tunnelwände
uniform float u_progress;   // Fortschritt der Reise durch den Tunnel (0-1)
uniform vec2 u_resolution; // Bildschirmauflösung

// --- Noise-Funktionen zur Erzeugung organischer Muster ---
// 2D Random
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// 2D Value Noise
float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.y * u.x;
}

// Fraktales Rauschen für mehr Detail
float fbm(vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 0.0;
    for (int i = 0; i < 6; i++) {
        value += amplitude * noise(st);
        st *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}


// --- Hauptfunktion ---
void main() {
    // Normalisierte, zentrierte Koordinaten
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;

    // --- Tunnel-Geometrie ---
    // Konvertiere zu Polarkoordinaten (Radius und Winkel)
    float radius = length(uv);
    float angle = atan(uv.y, uv.x);

    // Der "z"-Wert simuliert die Tiefe im Tunnel.
    // u_progress steuert, wie weit wir hineingeflogen sind.
    float z = u_time * 0.1 + u_progress * 5.0;

    // --- Tunnel-Verzerrung und Texturierung ---
    // Die Wände des Tunnels werden durch Noise verzerrt
    // Wir verwenden die Zylinderkoordinaten (angle, z) als Basis für das Rauschen
    vec2 noise_coord = vec2(angle * 2.0, z);
    float wall_noise = fbm(noise_coord);

    // Kombiniere das Rauschen mit der Grundform des Tunnels
    // Je näher am Zentrum (kleinerer Radius), desto stärker der Effekt
    float tunnel_distortion = wall_noise / (radius + 0.1);

    // --- Farbgebung ---
    // Erzeuge eine farbige Aura, die auf dem Rauschen basiert
    vec3 color = vec3(
        tunnel_distortion * 0.8, // Blau-Kanal
        tunnel_distortion * 0.5, // Grün-Kanal (weniger stark)
        tunnel_distortion * 1.5  // Rot-Kanal (stärker für einen lila/magenta-Look)
    );
    color = pow(color, vec3(1.2)); // Kontrasterhöhung

    // --- Der "Licht am Ende des Tunnels"-Effekt ---
    // Wenn wir uns dem Ende nähern (u_progress > 0.8), erscheint ein helles Licht
    float exit_light = smoothstep(0.8, 1.0, u_progress);
    float exit_glow = pow(1.0 - radius, 5.0) * exit_light;
    
    // --- Finale Komposition ---
    vec3 final_color = color + vec3(exit_glow * 2.0);

    // Vignette, um die Ränder abzudunkeln und den Fokus auf die Mitte zu legen
    final_color *= 1.0 - pow(radius, 2.0);

    gl_FragColor = vec4(final_color, 1.0);
}