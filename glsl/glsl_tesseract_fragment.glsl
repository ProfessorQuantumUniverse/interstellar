uniform float u_progress;

void main() {
    // Erzeugt einen weichen, runden Punkt
    if (length(gl_PointCoord - vec2(0.5)) > 0.5) {
        discard;
    }

    // Die Farbe leuchtet stärker in der Mitte der Animation
    float glow = u_progress * (1.0 - u_progress) * 4.0;
    
    gl_FragColor = vec4(0.8, 0.9, 1.0, 0.5 + glow);
}
