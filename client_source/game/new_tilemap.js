const vs = `
  attribute vec4 position;
  //attribute vec4 texcoord; - since position is a unit square just use it for texcoords

  uniform mat4 u_matrix;
  uniform mat4 u_texMatrix;

  varying vec2 v_texcoord;

  void main() {
    gl_Position = u_matrix * position;
    // v_texcoord = (u_texMatrix * texccord).xy;
    v_texcoord = (u_texMatrix * position).xy;
  }
`;

const fs = `
  precision highp float;

  uniform sampler2D u_tilemap;
  uniform sampler2D u_tiles;
  uniform vec2 u_tilemapSize;
  uniform vec2 u_tilesetSize;

  varying vec2 v_texcoord;

  void main() {
    
    vec2 tilemapCoord = floor(v_texcoord);
    if (tilemapCoord.x < 0.0 || tilemapCoord.y < 0.0 || 
        tilemapCoord.x >= u_tilemapSize.x || tilemapCoord.y >= u_tilemapSize.y) {
        discard;
    }

    vec2 texcoord = fract(v_texcoord);
    vec2 tileFoo = fract((tilemapCoord + vec2(0.5, 0.5)) / u_tilemapSize);
    vec4 tile = floor(texture2D(u_tilemap, tileFoo) * 256.0);

    vec2 tileCoord = (tile.xy + texcoord) / u_tilesetSize;
    vec4 color = texture2D(u_tiles, tileCoord);
    if (color.a <= 0.1) {
      discard;
    }
    gl_FragColor = color;
  }
`;

const tileWidth = 16;
const tileHeight = 16;
const tilesAcross = 8;
const tilesDown = 8;

const m4 = twgl.m4;
const gl = document.querySelector('#c').getContext('webgl');

// compile shaders, link, look up locations
const programInfo = twgl.createProgramInfo(gl, [vs, fs]);
// gl.createBuffer, bindBuffer, bufferData
const bufferInfo = twgl.createBufferInfoFromArrays(gl, {
  position: {
    numComponents: 2,
    data: [
      0, 0,
      1, 0,
      0, 1,
      
      0, 1,
      1, 0,
      1, 1,
    ],
  },
});

function r(min, max) {
  if (max === undefined) {
    max = min;
    min = 0;
  }
  return min + (max - min) * Math.random();
}

// make some tiles
const ctx = document.createElement('canvas').getContext('2d');
ctx.canvas.width = tileWidth * tilesAcross;
ctx.canvas.height = tileHeight * tilesDown;
ctx.font = "bold 12px sans-serif";
ctx.textAlign = "center";
ctx.textBaseline = "middle";

const f = '0123456789ABCDEF';
for (let y = 0; y < tilesDown; ++y) {
  for (let x = 0; x < tilesAcross; ++x) {
    const color = `hsl(${r(360) | 0},${r(50,100)}%,50%)`;
    ctx.fillStyle = color;
    const tx = x * tileWidth;
    const ty = y * tileHeight;
    ctx.fillRect(tx, ty, tileWidth, tileHeight);
    ctx.fillStyle = "#FFF";
    ctx.fillText(f.substr(y * 8 + x, 1), tx + tileWidth * .5, ty + tileHeight * .5); 
  }
}
document.body.appendChild(ctx.canvas);

const tileTexture = twgl.createTexture(gl, {
  src: ctx.canvas,
  minMag: gl.NEAREST,
});

// make a tilemap
const mapWidth = 20;
const mapHeight = 15;
const tilemap = new Uint32Array(mapWidth * mapHeight);
const tilemapU8 = new Uint8Array(tilemap.buffer);
const totalTiles = tilesAcross * tilesDown;
for (let i = 0; i < tilemap.length; ++i) {
  const off = i * 4;
  // mostly tile 9
  const tileId = r(10) < 1 
      ? (r(totalTiles) | 0)
      : 9;
  tilemapU8[off + 0] = tileId % tilesAcross;
  tilemapU8[off + 1] = tileId / tilesAcross;
}

const mapTexture = twgl.createTexture(gl, {
  src: tilemapU8,
  width: mapWidth,
  minMag: gl.NEAREST,
});

function ease(t) {
  return Math.cos(t) * .5 + .5;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeLerp(a, b, t) {
  return lerp(a, b, ease(t));
}

keys={}

let scrollX = -48
let scrollY = 0
function render(time) {
  time *= 0.001;  // convert to seconds;
  
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 1, 0, 1);
  
  gl.useProgram(programInfo.program);
  twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);  

  const mat = m4.ortho(0, gl.canvas.width, gl.canvas.height, 0, -1, 1);
  m4.scale(mat, [gl.canvas.width, gl.canvas.height, 1], mat);
 
  const scaleX = 1;
  const scaleY = 1;
  
  const dispScaleX = 1;
  const dispScaleY = 1;
  // origin of scale/rotation
  const originX = gl.canvas.width  * .2;
  const originY = gl.canvas.height * .5;
  // scroll position in pixels

  if(keys['w']) scrollY -= 2
  if(keys['s']) scrollY += 2
  if(keys['a']) scrollX -= 2
  if(keys['d']) scrollX += 2

  const rotation = time * 0.5;
  const tmat = m4.identity();
  m4.translate(tmat, [scrollX/tileWidth, scrollY/tileHeight, 0], tmat);

  m4.scale(tmat, [
    (gl.canvas.width  / tileWidth)/2  ,
    (gl.canvas.height / tileHeight)/2 ,
    1,
  ], tmat);
  // m4.translate(tmat, [ 
  //   -originX / gl.canvas.width,
  //   -originY / gl.canvas.height,
  //    0,
  // ], tmat);

  twgl.setUniforms(programInfo, {
    u_matrix: mat,
    u_texMatrix: tmat,
    u_tilemap: mapTexture,
    u_tiles: tileTexture,
    u_tilemapSize: [mapWidth, mapHeight],
    u_tilesetSize: [tilesAcross, tilesDown],    
  });
  
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  
  requestAnimationFrame(render);
}
requestAnimationFrame(render);

document.addEventListener("keydown", event =>{
  keys[event.key]=true
})
document.addEventListener("keyup", event =>{
  keys[event.key]=false
})
