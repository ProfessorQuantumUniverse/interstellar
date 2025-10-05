// Uniforms: Variablen, die vom JavaScript an den Shader übergeben werden
uniform vec2 u_resolution; // Bildschirmauflösung
uniform float u_time;      // Zeit für Animationen
uniform vec3 u_camera_pos; // Kameraposition
uniform mat3 u_camera_mat; // Kamerarotation

// Konstanten für die Physik-Simulation
const float BLACK_HOLE_RADIUS = 1.0; // Schwarzschildradius
const float DISK_RADIUS = 4.0;       // Äußerer Radius der Akkretionsscheibe
const float DISK_THICKNESS = 0.1;
const int MAX_STEPS = 96;            // Raymarching-Schritte (Performance vs. Qualität erhöht)
const float MAX_DIST = 100.0;
const float HIT_THRESHOLD = 0.001;

// --- NEU: Verbesserte Noise-Funktionen für Gaswolken ---
// 2D Random
float random(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453); }
// 2D Noise
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
// Fraktale Brownsche Bewegung (fBm) für turbulente Texturen
float fbm(vec2 st) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    for (int i = 0; i < 5; ++i) {
        v += a * noise(st);
        st = st * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}
// --- Ende der neuen Noise-Funktionen ---

// 2D Rotationsmatrix
mat2 rotate(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
}

// Distanzfunktion für eine flache Scheibe (die Akkretionsscheibe)
float map_disk(vec3 p) {
    // Die Scheibe wird nun als unendlich dünne Ebene behandelt, um den Linseneffekt zu maximieren
    float disk_dist = length(p.xz);
    if (disk_dist > DISK_RADIUS || disk_dist < BLACK_HOLE_RADIUS) {
        return MAX_DIST;
    }
    return abs(p.y);
}

// Prozedurale Textur für die Akkretionsscheibe (STARK ÜBERARBEITET)
vec3 get_disk_color(vec3 p, vec3 rd) {
    float disk_dist = length(p.xz);
    
    // Globale Rotation der Scheibe
    float angle = atan(p.x, p.z);
    float speed = 0.05 / (disk_dist * 0.5); // Innere Teile rotieren schneller
    angle += u_time * speed;
    
    // Texturkoordinaten basierend auf Polar-Koordinaten
    vec2 tex_coord = vec2(angle * 2.0, disk_dist * 0.4);
    
    // Turbulente Noise-Textur
    float turbulence = fbm(tex_coord + u_time * 0.01);
    
    // Basis-Farbmuster
    float pattern = smoothstep(0.4, 0.6, turbulence);
    vec3 base_color = mix(vec3(1.0, 0.6, 0.1), vec3(1.0, 0.9, 0.6), pattern);
    
    // --- Verbesserter Doppler- & Gravitationseffekt ---
    // Keplersche Umlaufbahn-Geschwindigkeit
    vec3 velocity = normalize(cross(vec3(0, 1, 0), p)) * (1.0 / sqrt(disk_dist));
    
    // Doppler-Verschiebung: Verstärkt Helligkeit und ändert Farbe
    float doppler = 1.0 + dot(velocity, rd) * 2.5; // Stärkerer Effekt
    doppler = pow(max(0.0, doppler), 3.0);
    
    // Gravitative Helligkeitszunahme zum Zentrum hin
    float gravity_glow = 1.0 + 1.5 * pow(1.0 - smoothstep(BLACK_HOLE_RADIUS, DISK_RADIUS, disk_dist), 2.0);
    
    // Kombination der Effekte
    vec3 final_color = base_color * doppler * gravity_glow;
    
    // Doppler-Farbverschiebung (Blueshift/Redshift)
    final_color.b = mix(final_color.b, 1.0, smoothstep(1.0, 1.5, doppler) * 0.2); // Blueshift
    final_color.r = mix(final_color.r, 1.2, smoothstep(1.0, 0.5, doppler) * 0.5); // Redshift
    
    // Sanftes Ausblenden am äußeren Rand
    final_color *= (1.0 - smoothstep(DISK_RADIUS - 0.5, DISK_RADIUS, disk_dist));
    
    return final_color;
}


// Die Kernfunktion: Ray Tracing mit Gravitationslinseneffekt
vec3 ray_trace(vec3 ro, vec3 rd) {
    float total_dist = 0.0;
    vec3 light_energy = vec3(0.0);

    for (int i = 0; i < MAX_STEPS; i++) {
        // Gravitationslinseneffekt: Biege den Strahl in Richtung des Zentrums
        vec3 gravity_dir = -normalize(ro);
        // Die Stärke der Krümmung nimmt mit dem Quadrat der Entfernung ab
        float gravity_factor = BLACK_HOLE_RADIUS * BLACK_HOLE_RADIUS / dot(ro, ro);
        rd = normalize(rd + gravity_dir * gravity_factor * 2.5); // Der magische Faktor

        float dist = map_disk(ro);
        if (dist < HIT_THRESHOLD) {
            light_energy = get_disk_color(ro, rd);
            break;
        }

        // Sicherheitscheck: Wenn der Strahl das Schwarze Loch trifft, ist er verloren
        if (length(ro) < BLACK_HOLE_RADIUS) {
            break;
        }

        // Sicherheitscheck: Wenn der Strahl zu weit fliegt
        if (total_dist > MAX_DIST) {
            break;
        }

        // Schritt vorwärts mit einer sichereren, kleineren Schrittgröße
        float step_dist = max(0.01, dist * 0.5);
        total_dist += step_dist;
        ro += rd * step_dist;
    }
    
    return light_energy;
}

void main() {
    // Normalisierte Bildschirmkoordinaten
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;

    // Strahlursprung (ro) und Strahlrichtung (rd) definieren
    vec3 ro = u_camera_pos;
    vec3 rd = u_camera_mat * normalize(vec3(uv, 1.0));

    // Starte das Ray Tracing
    vec3 col = ray_trace(ro, rd);

    // Sternenhimmel im Hintergrund
    float star_noise = fract(sin(dot(rd.xy, vec2(12.9898, 78.233))) * 43758.5453);
    col += vec3(smoothstep(0.995, 1.0, star_noise)) * (1.0 - length(col));
    
    // Finale Farbe setzen
    gl_FragColor = vec4(col, 1.0);
}