//initialize webgl context from canvas element
const canvas = document.getElementById('canvas');
const gl = canvas.getContext('webgl');
if (!gl) console.error('WebGL not supported');

//vertex shader converts positions from pixel space to clip space
const vertexShaderSource = `
    attribute vec2 a_position;
    uniform vec2 u_resolution;
    void main() {
        //convert position from pixels to 0->1 range
        vec2 zeroToOne = a_position / u_resolution;
        //convert from 0->1 to 0->2
        vec2 zeroToTwo = zeroToOne * 2.0;
        //convert from 0->2 to -1->1 (clip space)
        vec2 clipSpace = zeroToTwo - 1.0;
        //flip y axis and set z to 0
        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
    }
`;

//fragment shader sets all pixels to white
const fragmentShaderSource = `
    precision mediump float;
    void main() {
        gl_FragColor = vec4(1, 1, 1, 1); //white color
    }
`;

//utility function to create and compile a shader
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    //check if shader compiled successfully
    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
}

//create vertex and fragment shaders
const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

//utility function to create and link a shader program
function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    //check if program linked successfully
    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        return program;
    }
    console.error(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
}

//create and validate shader program
const program = createProgram(gl, vertexShader, fragmentShader);
if (!program) {
    throw new Error('Failed to create program');
}

//get locations of shader variables
const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
const resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");

//create and bind position buffer
const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

//creates vertices for a rectangle between two points with given width
function setRectangle(gl, x1, y1, x2, y2, width) {
    //calculate angle between points
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const halfWidth = width / 2;
    //calculate sine and cosine for offset calculations
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    //calculate corner offsets
    const x1Offset = halfWidth * sin;
    const y1Offset = halfWidth * cos;
    const x2Offset = halfWidth * sin;
    const y2Offset = halfWidth * cos;

    //set buffer data with 6 vertices (2 triangles)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        x1 - x1Offset, y1 + y1Offset,
        x2 - x2Offset, y2 + y2Offset,
        x1 + x1Offset, y1 - y1Offset,
        x1 + x1Offset, y1 - y1Offset,
        x2 - x2Offset, y2 + y2Offset,
        x2 + x2Offset, y2 - y2Offset,
    ]), gl.STATIC_DRAW);
}

//store all rectangles drawn
let rectangles = [];

//track last click position
let lastX = 0;
let lastY = 200;

//render all rectangles
function drawScene() {
    //setup viewport and clear
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    //setup shader program and attributes
    gl.useProgram(program);
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const size = 2; //2 components per vertex
    const type = gl.FLOAT; //32bit floats
    const normalize = false;
    const stride = 0; //move forward size * sizeof(type) each iteration
    const offset = 0; //start at beginning of buffer
    gl.vertexAttribPointer(positionAttributeLocation, size, type, normalize, stride, offset);

    //set resolution uniform
    gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);

    //draw each rectangle
    rectangles.forEach(rect => {
        setRectangle(gl, rect.x1, rect.y1, rect.x2, rect.y2, rect.width);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    });
}

//handle clicks to create new line segments
canvas.addEventListener('click', (event) => {
    //get click position relative to canvas
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    //get width from input element
    const width = parseInt(document.getElementById('width').value);

    //add new rectangle
    rectangles.push({
        x1: lastX,
        y1: lastY,
        x2: x,
        y2: y,
        width: width
    });

    //redraw scene
    drawScene();

    //update last position
    lastX = x;
    lastY = y;
});

//initial draw
drawScene();