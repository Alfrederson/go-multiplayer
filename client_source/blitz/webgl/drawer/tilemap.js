import { nearestPowerOf2 } from "../../webgl"
import { initShaderProgram } from "../shader"

const vs_source = `
    precision lowp float;
    attribute vec2 position;
    attribute vec2 texture;

    varying vec2 pixel_coord;
    varying vec2 tex_coord;

    uniform vec2 view_offset;
    uniform vec2 viewport_size;
    uniform vec2 inverse_tile_texture_size;
    uniform vec2 inverse_tile_size;

    void main(){
        pixel_coord = (texture * viewport_size) + view_offset;
        tex_coord = pixel_coord * inverse_tile_size;
        gl_Position = vec4(position, 0.0, 1.0);
    }
`
const fs_source = `
    precision lowp float;
    varying vec2 pixel_coord;
    varying vec2 tex_coord;

    uniform sampler2D tiles;
    uniform sampler2D tileset;

    uniform vec2 inverse_tile_texture_size;
    uniform vec2 inverse_tileset_texture_size;
    uniform vec2 tile_size;
    uniform vec2 inverse_tile_size;
    uniform vec2 inverse_map_pixel_size;

    void main(){
      vec2 b = inverse_map_pixel_size;
      vec4 tile = texture2D(tiles, pixel_coord * b ) * 255.0;
      if(tile.b > 250.0){
        discard;
      }
      vec2 tile_coord = pixel_coord * inverse_tile_size;
      vec2 pixel_coord_in_tileset = fract(tex_coord) + tile.xy;
      gl_FragColor = texture2D(
        tileset,
        pixel_coord_in_tileset*tile_size*inverse_tileset_texture_size
      );
    }
`

export class TileMap{
  tiles
  texture
  width
  height
  tileset_rows
  tileset_cols
  tile_width
  tile_height
  tex_width
  tex_height

  inverse_tile_width
  inverse_tile_height
  inverse_tileset_width
  inverse_tileset_height
  inverse_map_pixel_width
  inverse_map_pixel_height

  /**
   * @param {number[][]} data 
   */
  constructor(data){
    this.height = data.length
    this.width = data[0].length
    this.tiles = data.map( x => x.map( y => y) )
  }

  /**
   * 
   * @param {WebGLRenderingContext} ctx 
   * @param {import("../image").WGLImage} tileset 
   */
  createTexture(ctx,tileset){
    this.inverse_tileset_width = 1/tileset.width
    this.inverse_tileset_height = 1/tileset.height

    this.tile_width = tileset.frameWidth
    this.tile_height = tileset.frameHeight
    this.inverse_tile_width = 1/tileset.frameWidth
    this.inverse_tile_height = 1/tileset.frameHeight


    this.tileset_rows = tileset.height / tileset.frameHeight
    this.tileset_cols = tileset.width / tileset.frameWidth
    this.tex_width = nearestPowerOf2(this.width)
    this.tex_height = nearestPowerOf2(this.height)

    this.inverse_map_pixel_width = 1/(this.tex_width * this.tile_width)
    this.inverse_map_pixel_height = 1/(this.tex_height * this.tile_height)    

    const buffer = new Uint8Array(this.tex_width*this.tex_height*4)

    for(let y = 0; y < this.height; y ++){
      for(let x = 0; x < this.width; x++){
        const cell = (y * this.tex_width + x)*4
        const tile = this.tiles[y][x]
        const tile_x = tile % this.tileset_cols
        const tile_y = (tile / this.tileset_cols)|0
        buffer[cell] = tile_x-1
        buffer[cell+1] = tile_y
        if(tile_x == 0){
          buffer[cell+2] = 255
        }
      }
    }

    this.texture = ctx.createTexture()
    ctx.bindTexture(ctx.TEXTURE_2D,this.texture)
    ctx.texParameteri(ctx.TEXTURE_2D,ctx.TEXTURE_WRAP_S,ctx.CLAMP_TO_EDGE)
    ctx.texParameteri(ctx.TEXTURE_2D,ctx.TEXTURE_WRAP_T,ctx.CLAMP_TO_EDGE)
    ctx.texParameteri(ctx.TEXTURE_2D,ctx.TEXTURE_MAG_FILTER,ctx.NEAREST)
    ctx.texParameteri(ctx.TEXTURE_2D,ctx.TEXTURE_MIN_FILTER,ctx.NEAREST)
    ctx.texImage2D(
      ctx.TEXTURE_2D,
      0,
      ctx.RGBA,
      this.tex_width,
      this.tex_height,
      0,
      ctx.RGBA,
      ctx.UNSIGNED_BYTE,
      buffer
    )
  }

  updateTiles(new_tiles){
    
  }
}

export class TileMapDrawer{
  shader
  program_info
  position_buffer
  screen_width
  screen_height

  constructor(ctx,screen_width,screen_height){
    this.screen_width = screen_width
    this.screen_height = screen_height

    this.shader = initShaderProgram(ctx,vs_source,fs_source)
    const al = name => ctx.getAttribLocation(this.shader,name)
    const ul = name => ctx.getUniformLocation(this.shader,name)

    this.program_info = {
      a: {
        position: al("position"),
        texture: al("texture")
      },
      u: {
        view_offset: ul("view_offset"),
        viewport_size: ul("viewport_size"),
        inverse_tile_texture_size: ul("inverse_tile_texture_size"),
        inverse_tileset_texture_size: ul("inverse_tileset_texture_size"),
        inverse_tile_size: ul("inverse_tile_size"),
        inverse_map_pixel_size : ul ("inverse_map_pixel_size"),
        tile_size: ul("tile_size"),
        tiles: ul("tiles"),
        tileset: ul("tileset")
      }
    };

    console.log(this.program_info)

    this.position_buffer = ctx.createBuffer()
    ctx.bindBuffer(ctx.ARRAY_BUFFER,this.position_buffer)
    ctx.bufferData(ctx.ARRAY_BUFFER,new Float32Array([
      -1, -1, 0, 1,
       1, -1, 1, 1,
       1,  1, 1, 0,

      -1, -1, 0, 1,
       1,  1, 1, 0,
      -1,  1, 0, 0
    ]),ctx.STATIC_DRAW)
  }

  /**
   * @param {WebGLRenderingContext} ctx 
   * @param {TileMap} tilemap 
   * @param {import("../image").WGLImage} tileset 
   * @param {number} x 
   * @param {number} y 
   */
  drawTilemap(ctx,tilemap,tileset,x,y){
    if(!tilemap.texture){
      tilemap.createTexture(ctx,tileset)
    }
    if(!tileset.texture){
      throw "tentando desenhar tilemap sem textura"
    }

    ctx.useProgram(this.shader)    
    // gruda o buffer
    ctx.bindBuffer(ctx.ARRAY_BUFFER, this.position_buffer)

    // passa os atribs pra desenhar o polígono
    ctx.enableVertexAttribArray(this.program_info.a.position)
    ctx.enableVertexAttribArray(this.program_info.a.texture)

    ctx.vertexAttribPointer(this.program_info.a.position, 2, ctx.FLOAT, false, 16,0)
    ctx.vertexAttribPointer(this.program_info.a.texture , 2, ctx.FLOAT, false, 16,8)

    // scroll do mapa
    ctx.uniform2fv(this.program_info.u.view_offset,[-x,-y])

    ctx.uniform2fv(this.program_info.u.viewport_size, [this.screen_width, this.screen_height])
    ctx.uniform2fv (this.program_info.u.tile_size,  [tilemap.tile_width,tilemap.tile_height])
    ctx.uniform2fv(this.program_info.u.inverse_tile_size, [tilemap.inverse_tile_width,tilemap.inverse_tile_height])
    ctx.uniform2fv(this.program_info.u.inverse_tileset_texture_size,[tilemap.inverse_tileset_width,tilemap.inverse_tileset_height])

    ctx.uniform2fv(this.program_info.u.inverse_map_pixel_size,[tilemap.inverse_map_pixel_width,tilemap.inverse_map_pixel_height])

    // binda e passa as texturas como uniformes
    ctx.activeTexture(ctx.TEXTURE0)
    ctx.bindTexture(ctx.TEXTURE_2D, tileset.texture)
    ctx.uniform1i(this.program_info.u.tileset,0)

    ctx.activeTexture(ctx.TEXTURE1)
    ctx.bindTexture(ctx.TEXTURE_2D, tilemap.texture)
    ctx.uniform1i(this.program_info.u.tiles,1)

    // passa os uniformes para o shader vestir
    ctx.uniform1i(this.program_info.u.texture,0)
    
    // desenha
    ctx.drawArrays(ctx.TRIANGLES,0,6)

    // desbinda as texturas
    ctx.activeTexture(ctx.TEXTURE1)
    ctx.bindTexture(ctx.TEXTURE_2D,null)
    ctx.activeTexture(ctx.TEXTURE0)
    ctx.bindTexture(ctx.TEXTURE_2D,null)
  }
}