const vertexShader = `
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

const fragmentShader = `
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

function createTileMap(ctx, originArray, tilesetImage, tileWidth, tileHeight){

}


function drawTileMap(ctx, tileMapHandler, x, y){

}



export function initTilemapShader(ctx){
    
}



// // compile shaders, link, look up locations
// const programInfo = twgl.createProgramInfo(gl, [vs, fs]);
// // gl.createBuffer, bindBuffer, bufferData
// const bufferInfo = twgl.createBufferInfoFromArrays(gl, {
//   position: {
//     numComponents: 2,
//     data: [
//       0, 0,
//       1, 0,
//       0, 1,
      
//       0, 1,
//       1, 0,
//       1, 1,
//     ],
//   },
// });