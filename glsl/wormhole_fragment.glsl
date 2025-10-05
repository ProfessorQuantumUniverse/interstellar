// Uniforms
uniform float u_time;
uniform float u_progress; // 0 = geschlossen, 1 = voll geöffnet/durchquert
uniform vec2 u_resolution;
uniform vec3 u_camera_pos;

// Varyings vom Vertex Shader
varying vec3 v_world_pos;
varying vec3 v_normal;

// --- Noise Funktionen für Sternenfelder und Verzerrungen ---
float random(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 151.7182))) * 43758.5453); }

float noise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(random(i), random(i + vec3(1,0,0)), f.x),
                   mix(random(i + vec3(0,1,0)), random(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(random(i + vec3(0,0,1)), random(i + vec3(1,0,1)), f.x),
                   mix(random(i + vec3(0,1,1)), random(i + vec3(1,1,1)), f.x), f.y), f.z);
}

float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
        v += a * noise(p);
        p *= 2.0;
        a *= 0.5;
    }
    return v;
}

// --- Sternenfeld-Funktion ---
// Erzeugt zwei unterschiedliche Sternenfelder (unseres und das Ziel-System)
vec3 get_stars(vec3 dir, float density_mod) {
    float density = pow(fbm(dir * 4.0), 5.0) * 20.0 * density_mod;
    density += pow(fbm(dir * 12.0), 8.0) * 2.0 * density_mod;
    return vec3(density);
}

void main() {
    // Strahlrichtung von der Kamera zum aktuellen Fragment auf der Kugeloberfläche
    vec3 ray_dir = normalize(v_world_pos - u_camera_pos);

    // Berechne den Schnittpunkt des Strahls mit dem Inneren der Kugel
    float b = dot(ray_dir, u_camera_pos);
    float c = dot(u_camera_pos, u_camera_pos) - 60.0*60.0; // 60 ist der Radius aus main.js
    float delta = b*b - c;
    
    // Wenn der Strahl die Kugel nicht trifft, abbrechen (macht das Objekt transparent)
    if (delta < 0.0) {
        discard;
    }

    // --- Gravitationslinseneffekt ---
    // Der "Eintrittspunkt" des Strahls in die Sphäre
    vec3 entry_point = normalize(v_world_pos);
    
    // Der "Austrittspunkt" wird durch den Fortschritt der Reise bestimmt
    // Bei progress=0 schauen wir geradeaus. Bei progress=1 schauen wir "durch" das Wurmloch.
    vec3 exit_dir = normalize(mix(ray_dir, reflect(ray_dir, entry_point), u_progress * u_progress));

    // Stärke der Verzerrung ist am Rand der Sphäre am größten
    float distortion_strength = pow(1.0 - abs(dot(ray_dir, entry_point)), 4.0);
    distortion_strength *= u_progress;

    // Zeitbasierte, wellenartige Verzerrung der Austrittsrichtung
    float time_warp = fbm(entry_point * 2.0 + u_time * 0.1) * 0.1;
    exit_dir = normalize(exit_dir + entry_point * time_warp * distortion_strength);
    
    // --- Farbberechnung ---
    // Das Ziel-Sternenfeld, gesehen durch das Wurmloch
    vec3 target_stars = get_stars(exit_dir, 1.0);
    vec3 target_color = pow(target_stars, vec3(2.0)) * vec3(0.6, 0.8, 1.0); // Kühleres Licht
    
    // Unser eigenes Sternenfeld, das sich am Rand spiegelt
    vec3 local_stars = get_stars(ray_dir, 0.5);
    vec3 local_color = pow(local_stars, vec3(2.0)) * vec3(1.0, 0.9, 0.8); // Wärmeres Licht

    // Mische beide Sternenfelder basierend auf der Verzerrungsstärke
    vec3 final_color = mix(local_color, target_color, distortion_strength);

    // --- Energie-Effekte ---
    // Ein pulsierender Ring am "Äquator" der Öffnung
    float ring = smoothstep(0.01, 0.0, abs(dot(ray_dir, entry_point))) * u_progress;
    ring += smoothstep(0.0, 0.2, ring) * pow(sin(u_time * 2.0 + entry_point.x * 10.0) * 0.5 + 0.5, 8.0);
    final_color += ring * vec3(0.5, 0.8, 1.0) * 2.0;

    // Ein Leuchten, das vom Fortschritt abhängt
    float glow = distortion_strength * (1.0 - u_progress * 0.5);
    final_color += glow * vec3(0.4, 0.6, 1.0);

    // Die finale Farbe wird durch die Transparenz am Rand der Sphäre moduliert
    gl_FragColor = vec4(final_color, distortion_strength * 1.5);
}