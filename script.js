const canvas = document.getElementById('canvas');
const gl = canvas.getContext('webgl');
if (!gl) console.error('WebGL not supported');

const vertexShaderSource = `
    attribute vec2 a_position;
    uniform vec2 u_resolution;
    void main() {
        vec2 zeroToOne = a_position / u_resolution;
        vec2 zeroToTwo = zeroToOne * 2.0;
        vec2 clipSpace = zeroToTwo - 1.0;
        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
    }
`;

const fragmentShaderSource = `
    precision mediump float;
    void main() {
        gl_FragColor = vec4(1, 1, 1, 1); // white color
    }
`;

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        return program;
    }
    console.error(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
}

const program = createProgram(gl, vertexShader, fragmentShader);
if (!program) {
    throw new Error('Failed to create program');
}

const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
const resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");

const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

function setRectangle(gl, x1, y1, x2, y2, width) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const halfWidth = width / 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const x1Offset = halfWidth * sin;
    const y1Offset = halfWidth * cos;
    const x2Offset = halfWidth * sin;
    const y2Offset = halfWidth * cos;

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        x1 - x1Offset, y1 + y1Offset,
        x2 - x2Offset, y2 + y2Offset,
        x1 + x1Offset, y1 - y1Offset,
        x1 + x1Offset, y1 - y1Offset,
        x2 - x2Offset, y2 + y2Offset,
        x2 + x2Offset, y2 - y2Offset,
    ]), gl.STATIC_DRAW);
}

let rectangles = [];

let lastX = 0;
let lastY = 200;

function drawScene() {
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const size = 2;
    const type = gl.FLOAT;
    const normalize = false;
    const stride = 0;
    const offset = 0;
    gl.vertexAttribPointer(positionAttributeLocation, size, type, normalize, stride, offset);

    gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);

    rectangles.forEach(rect => {
        setRectangle(gl, rect.x1, rect.y1, rect.x2, rect.y2, rect.width);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    });
}

// Event listener for canvas click to draw a new rectangle
canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const width = parseInt(document.getElementById('width').value);

    rectangles.push({
        x1: lastX,
        y1: lastY,
        x2: x,
        y2: y,
        width: width
    });

    drawScene();

    lastX = x;
    lastY = y;
});

// Initial draw
drawScene();