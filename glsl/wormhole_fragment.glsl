// Uniforms
uniform float u_time;
uniform float u_progress;
uniform vec2 u_resolution;

// 2D Random
float random(vec2 st){ return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123); }
float noise(vec2 st){
    vec2 i = floor(st), f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a)*u.y*(1.0 - u.x) + (d - b)*u.y*u.x;
}
float fbm(vec2 st){
    float v=0.0, a=0.5;
    for(int i=0;i<6;i++){ v+=a*noise(st); st*=2.0; a*=0.5; }
    return v;
}

vec3 chroma(vec3 c, float r){
    return vec3(
        c.r,
        mix(c.g, fbm(vec2(r*2.0, r*3.0)), 0.15),
        mix(c.b, fbm(vec2(r*4.0, r*1.5)), 0.2)
    );
}

void main(){
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;

    float radius = length(uv);
    float angle = atan(uv.y, uv.x);

    float z = u_time * 0.15 + u_progress * 6.0;

    // swirl factor increases towards center
    float swirl = (1.0 / (radius + 0.2)) * 2.0;
    float spin = angle + z * 2.0 + swirl;

    vec2 ncoord = vec2(spin * 0.6, z * 0.8);
    float wall = fbm(ncoord);
    float tunnel = wall / (radius + 0.1);

    vec3 color = vec3(
        tunnel * 0.9,
        tunnel * 0.5,
        tunnel * 1.3
    );
    color = pow(color, vec3(1.2));

    float exit_light = smoothstep(0.75, 1.0, u_progress);
    float exit_glow = pow(1.0 - radius, 5.0) * exit_light;

    vec3 final_color = color + vec3(exit_glow * 2.0);
    final_color *= 1.0 - pow(radius, 2.0);

    // slight chromatic aberration by radial modulation
    final_color = chroma(final_color, radius);

    gl_FragColor = vec4(final_color, 1.0);
}