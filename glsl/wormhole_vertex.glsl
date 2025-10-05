// NEUE DATEI

// Varyings, um Daten an den Fragment-Shader zu senden
varying vec3 v_world_pos;
varying vec3 v_normal;

void main() {
    // Transformiere die Vertex-Position in den World Space
    vec4 world_pos = modelMatrix * vec4(position, 1.0);
    v_world_pos = world_pos.xyz;
    
    // Rotiere die Normale entsprechend der Objekt-Rotation
    v_normal = normalize(normalMatrix * normal);

    // Standard-Projektion auf den Bildschirm
    gl_Position = projectionMatrix * viewMatrix * world_pos;
}