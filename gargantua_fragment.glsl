// Uniforms: Variablen, die vom JavaScript an den Shader übergeben werden
uniform vec2 u_resolution; // Bildschirmauflösung
uniform float u_time;      // Zeit für Animationen
uniform vec3 u_camera_pos; // Kameraposition
uniform mat3 u_camera_mat; // Kamerarotation

// Konstanten für die Physik-Simulation
const float BLACK_HOLE_RADIUS = 1.0; // Schwarzschildradius
const float DISK_RADIUS = 4.0;       // Äußerer Radius der Akkretionsscheibe
const float DISK_THICKNESS = 0.1;
const int MAX_STEPS = 64;            // Raymarching-Schritte (Performance vs. Qualität)
const float MAX_DIST = 100.0;
const float HIT_THRESHOLD = 0.001;

// 2D Rotationsmatrix
mat2 rotate(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
}

// Distanzfunktion für eine flache Scheibe (die Akkretionsscheibe)
float map_disk(vec3 p) {
    vec2 q = p.xz;
    return max(abs(p.y) - DISK_THICKNESS, length(q) - DISK_RADIUS);
}

// Prozedurale Textur für die Akkretionsscheibe
vec3 get_disk_color(vec3 p) {
    p.xz *= 0.5;
    p.xz *= rotate(u_time * 0.05 + length(p.xz) * 0.5);

    float f = 0.0;
    vec2 q = p.xz;
    q *= rotate(3.1415/3.0);
    f += 0.5 * texture(sampler2D(0., 0.), q * 0.5).x; // Simuliert Textur-Lookup

    float noise = 0.5 + 0.5 * sin(p.x*2.+u_time) * sin(p.z*2.+u_time);
    vec3 base_color = mix(vec3(1.0, 0.5, 0.1), vec3(1.0, 0.8, 0.5), noise);
    
    return base_color * (1.0 - smoothstep(DISK_RADIUS - 1.0, DISK_RADIUS, length(p.xz)));
}

// Die Kernfunktion: Ray Tracing mit Gravitationslinseneffekt
vec3 ray_trace(vec3 ro, vec3 rd) {
    float total_dist = 0.0;
    vec3 light_energy = vec3(0.0);

    for (int i = 0; i < MAX_STEPS; i++) {
        // Gravitationslinseneffekt: Biege den Strahl in Richtung des Zentrums
        vec3 gravity_dir = -normalize(ro);
        float gravity_factor = BLACK_HOLE_RADIUS * BLACK_HOLE_RADIUS / dot(ro, ro);
        rd = normalize(rd + gravity_dir * gravity_factor * 2.5); // Der magische Faktor

        float dist = map_disk(ro);
        if (dist < HIT_THRESHOLD) {
            // Doppler-Effekt simulieren
            vec3 velocity = cross(vec3(0,1,0), normalize(ro));
            float doppler = 1.0 + dot(velocity, rd) * 0.5;
            
            light_energy = get_disk_color(ro) * doppler;
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

        total_dist += dist;
        ro += rd * dist;
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
    col += vec3(smoothstep(0.995, 1.0, star_noise));
    
    // Finale Farbe setzen
    gl_FragColor = vec4(col, 1.0);
}