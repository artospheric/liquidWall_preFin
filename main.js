const canvas = document.getElementById('myCanvas');
const gl = canvas.getContext('webgl');

if (!gl) {
    console.error('WebGL error');
}

const shaderSettings = {
    u_scale: 0.4,
    u_minRandomScale: 0.3,
    u_maxRandomScale: 1.5,
    animationSpeed: 0.15,
    u_mouseEffectRadius: 0.1,
    u_mouseEffectIntensity: 0.1,
    u_noiseScale: 15.0,
    u_noiseIntensity: 0.2,
    u_decaySpeed: 0.022,
    u_grainIntensity: 0.15,
    u_minGrainSize: 80.0,
    u_maxGrainSize: 200.0,
};

const fragmentShaderSource = `#define PI 3.141592654

precision mediump float;

uniform vec2 iResolution;
uniform float iTime;
uniform float u_scale;
uniform float u_minRandomScale;
uniform float u_maxRandomScale;
uniform float u_mouseEffectRadius;
uniform float u_mouseEffectIntensity;
uniform float u_noiseScale;
uniform float u_noiseIntensity;
uniform vec2 u_decayedMousePosition;
uniform float u_grainIntensity;
uniform float u_minGrainSize;
uniform float u_maxGrainSize;

uniform vec3 u_colors[10];

vec2 rot(vec2 p, float a) {
    float c = cos(a * 15.83);
    float s = sin(a * 15.83);
    return p * mat2(s, c, c, -s);
}

float rand(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

float perlin_noise_2d(vec2 p) {
    vec2 ip = floor(p);
    vec2 fp = fract(p);
    vec2 uv = fp * fp * (3.0 - 2.0 * fp);
    float a = rand(ip);
    float b = rand(ip + vec2(1.0, 0.0));
    float c = rand(ip + vec2(0.0, 1.0));
    float d = rand(ip + vec2(1.0, 1.0));
    return mix(mix(a, b, uv.x), mix(c, d, uv.x), uv.y);
}

vec3 palette(float t) {
    t = clamp(t, 0.0, 1.0);
    if (t <= 0.111) {
        return mix(u_colors[0], u_colors[1], smoothstep(0.0, 0.111, t));
    } else if (t <= 0.222) {
        return mix(u_colors[1], u_colors[2], smoothstep(0.111, 0.222, t));
    } else if (t <= 0.333) {
        return mix(u_colors[2], u_colors[3], smoothstep(0.222, 0.333, t));
    } else if (t <= 0.444) {
        return mix(u_colors[3], u_colors[4], smoothstep(0.333, 0.444, t));
    } else if (t <= 0.555) {
        return mix(u_colors[4], u_colors[5], smoothstep(0.444, 0.555, t));
    } else if (t <= 0.666) {
        return mix(u_colors[5], u_colors[6], smoothstep(0.555, 0.666, t));
    } else if (t <= 0.777) {
        return mix(u_colors[6], u_colors[7], smoothstep(0.666, 0.777, t));
    } else if (t <= 0.888) {
        return mix(u_colors[7], u_colors[8], smoothstep(0.777, 0.888, t));
    } else {
        return mix(u_colors[8], u_colors[9], smoothstep(0.888, 1.0, t));
    }
}

void main() {
    vec2 uv = (gl_FragCoord.xy / iResolution.y) * u_scale;
    vec2 centered_uv = uv - vec2(iResolution.x / iResolution.y * 0.5, 0.5) * u_scale;
    float dist_to_mouse = length(centered_uv - u_decayedMousePosition);
    float noise_val = perlin_noise_2d(centered_uv * u_noiseScale + iTime) * u_noiseIntensity;
    float effective_radius = u_mouseEffectRadius + noise_val;
    float mouse_influence = 1.0 - smoothstep(0.0, effective_radius, dist_to_mouse);
    mouse_influence = pow(mouse_influence, 2.0);
    vec2 final_uv = uv;
    final_uv = vec2(.125, .75) + (final_uv - vec2(.125,.75)) * .03;
    float T = iTime * .65;
    vec3 c = clamp(1. - .48 * vec3(
        length(final_uv - vec2(0.0, 0.5)),
        length(final_uv - vec2(1.0, .3)),
        length(final_uv - vec2(1.0, 0.1))
    ), 0., 1.) * 2. - 1.;
    vec3 c0 = vec3(0);
    float w0 = 0.;
    const float N = 30.;
    for (float i = 0.; i < N; i++) {
        float random_pos_offset = rand(vec2(i, 1.0));
        float random_speed_multiplier = rand(vec2(i, 2.0));
        float final_random_scale = u_minRandomScale + random_pos_offset * (u_maxRandomScale - u_minRandomScale);
        vec2 swirl_uv = final_uv * final_random_scale;
        float current_time = T * (1.0 + random_speed_multiplier * 0.1);
        float wt = (i * i / N / N - .2) * 0.3;
        float wp = 0.5 + (i + 1.) * (i + 1.5) * 0.001;
        float wb = .05 + i / N * 0.1;
        float mouse_speed_effect = u_mouseEffectIntensity * mouse_influence;
        c.zx = rot(c.zx, 0.1 + current_time * 0.1 * wt + (swirl_uv.x + .7) * 23. * wp + mouse_speed_effect);
        c.xy = rot(c.xy, c.z * c.x * wb + 1.7 + current_time * wt + (swirl_uv.y + 1.1) * 15. * wp + mouse_speed_effect);
        c.yz = rot(c.yz, c.x * c.y * wb + 2.4 - current_time * 0.79 * wt + (swirl_uv.x + swirl_uv.y * (fract(i / 2.) - 0.25) * 4.) * 17. * wp + mouse_speed_effect);
        c.zx = rot(c.zx, c.y * c.z * wb + 1.6 - current_time * 0.65 * wt + (swirl_uv.x + .7) * 23. * wp + mouse_speed_effect);
        float w = (100.5 - i / N);
        c0 += c * w;
        w0 += w;
    }
    c0 = c0 / w0 * 2. + .5;
    c0 *= .5 + dot(c0, vec3(1, 1, 1)) / sqrt(3.) * .5;
    c0 += pow(length(sin(c0 * PI * 4.)) / sqrt(3.) * 1.0, 20.) * (.3 + .7 * c0);
    float t = clamp(length(c0) / 2.0, 0.0, 1.0);
    c0 = palette(t);
    float grain_size_val = perlin_noise_2d(gl_FragCoord.xy / iResolution.xy * 1.5 + iTime * 0.1) * 0.5 + 0.5;
    float grain_size_scaled = u_minGrainSize + grain_size_val * (u_maxGrainSize - u_minGrainSize);
    float grain_value = rand(uv * grain_size_scaled + iTime) * 2.0 - 1.0;;
    c0 += grain_value * u_grainIntensity;
    gl_FragColor = vec4(c0, 1.0);
}`;

const vertexShaderSource = `
    attribute vec2 a_position;
    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
    }
`;

function hexToRgb(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    const r = ((bigint >> 16) & 255) / 255.0;
    const g = ((bigint >> 8) & 255) / 255.0;
    const b = (bigint & 255) / 255.0;
    return [r, g, b];
}

function startRendering() {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = createProgram(gl, vertexShader, fragmentShader);
    gl.useProgram(program);

    const resolutionUniformLocation = gl.getUniformLocation(program, "iResolution");
    const timeUniformLocation = gl.getUniformLocation(program, "iTime");
    const scaleUniformLocation = gl.getUniformLocation(program, "u_scale");
    const minRandomScaleLocation = gl.getUniformLocation(program, "u_minRandomScale");
    const maxRandomScaleLocation = gl.getUniformLocation(program, "u_maxRandomScale");
    const mouseEffectRadiusLocation = gl.getUniformLocation(program, "u_mouseEffectRadius");
    const mouseEffectIntensityLocation = gl.getUniformLocation(program, "u_mouseEffectIntensity");
    const noiseScaleLocation = gl.getUniformLocation(program, "u_noiseScale");
    const noiseIntensityLocation = gl.getUniformLocation(program, "u_noiseIntensity");
    const decayedMousePositionLocation = gl.getUniformLocation(program, "u_decayedMousePosition");
    const grainIntensityLocation = gl.getUniformLocation(program, "u_grainIntensity");
    const minGrainSizeLocation = gl.getUniformLocation(program, "u_minGrainSize");
    const maxGrainSizeLocation = gl.getUniformLocation(program, "u_maxGrainSize");
    const colorsUniformLocation = gl.getUniformLocation(program, "u_colors[0]");

    const defaultColors = [
        '#051129', '#232b3e', '#321f56', '#a2ced7', '#605d83',
        '#39104c', '#d05389', '#ff7070', '#ffe78f', '#ffffff'
    ];

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, 1, -1, -1, 1,
        -1, 1, 1, -1, 1, 1
    ]), gl.STATIC_DRAW);

    const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    let mouse = [0, 0, 0, 0];
    const startTime = performance.now();
    let decayedMousePosition = [0.0, 0.0];

    canvas.addEventListener('mousemove', (e) => {
        mouse[0] = e.clientX;
        mouse[1] = canvas.height - e.clientY;
    });

    function render(currentTime) {
        const time = (currentTime - startTime) * 0.001 * shaderSettings.animationSpeed;
        resizeCanvas();
        const centered_mouse_uv = [
            (mouse[0] / gl.canvas.width - 0.5) * (gl.canvas.width / gl.canvas.height) * shaderSettings.u_scale,
            (mouse[1] / gl.canvas.height - 0.5) * shaderSettings.u_scale
        ];
        
        decayedMousePosition[0] += (centered_mouse_uv[0] - decayedMousePosition[0]) * shaderSettings.u_decaySpeed;
        decayedMousePosition[1] += (centered_mouse_uv[1] - decayedMousePosition[1]) * shaderSettings.u_decaySpeed;

        gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
        gl.uniform1f(timeUniformLocation, time);
        gl.uniform1f(scaleUniformLocation, shaderSettings.u_scale);
        gl.uniform1f(minRandomScaleLocation, shaderSettings.u_minRandomScale);
        gl.uniform1f(maxRandomScaleLocation, shaderSettings.u_maxRandomScale);
        gl.uniform1f(mouseEffectRadiusLocation, shaderSettings.u_mouseEffectRadius);
        gl.uniform1f(mouseEffectIntensityLocation, shaderSettings.u_mouseEffectIntensity);
        gl.uniform1f(noiseScaleLocation, shaderSettings.u_noiseScale);
        gl.uniform1f(noiseIntensityLocation, shaderSettings.u_noiseIntensity);
        gl.uniform2fv(decayedMousePositionLocation, decayedMousePosition);
        gl.uniform1f(grainIntensityLocation, shaderSettings.u_grainIntensity);
        gl.uniform1f(minGrainSizeLocation, shaderSettings.u_minGrainSize);
        gl.uniform1f(maxGrainSizeLocation, shaderSettings.u_maxGrainSize);
        
        const colorsData = [].concat(
            hexToRgb(defaultColors[0]),
            hexToRgb(defaultColors[1]),
            hexToRgb(defaultColors[2]),
            hexToRgb(defaultColors[3]),
            hexToRgb(defaultColors[4]),
            hexToRgb(defaultColors[5]),
            hexToRgb(defaultColors[6]),
            hexToRgb(defaultColors[7]),
            hexToRgb(defaultColors[8]),
            hexToRgb(defaultColors[9])
        );
        gl.uniform3fv(colorsUniformLocation, new Float32Array(colorsData));
        
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Ошибка компиляции шейдера:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Ошибка линковки программы:', gl.getProgramInfoLog(program));
        return null;
    }
    return program;
}

function resizeCanvas() {
    const displayWidth = window.innerWidth;
    const displayHeight = window.innerHeight;
    if (gl.canvas.width !== displayWidth || gl.canvas.height !== displayHeight) {
        gl.canvas.width = displayWidth;
        gl.canvas.height = displayHeight;
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    }
}

startRendering();