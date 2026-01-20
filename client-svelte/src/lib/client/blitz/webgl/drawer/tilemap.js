import { Unload } from "../../blitz"
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
        pixel_coord = ((texture * viewport_size) + view_offset)*2.0;
        tex_coord = pixel_coord * (inverse_tile_size*2.0);
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
      vec4 tile = texture2D(tiles, pixel_coord * b) * 255.0;
      vec4 alpha = texture2D(tiles, pixel_coord * b);

      vec2 tile_coord = pixel_coord * (inverse_tile_size);
      vec2 pixel_coord_in_tileset = fract(tex_coord*0.5) + tile.xy;
      gl_FragColor = texture2D(
        tileset,
        pixel_coord_in_tileset*(tile_size*0.5)*(inverse_tileset_texture_size)
      ) * vec4(1.0,1.0,1.0,alpha.a);
    }
`

// GAMBI: usar metade da largura dos tiles para poder usar
//        o chipset do RPG Maker
/**
 * 
 * @param {number[][]} array - array de tiles
 * @param {number} tex_width - largura da textura dos offsets
 * @param {number} tex_height - altura da textura dos offsets
 * @param {number} tileset_cols - quantas colunas tem no tileset
 * @returns 
 */
function tile_buffer_from_array(array,tex_width,tex_height,tileset_cols){

  // tileset_cols só funciona quando a gente está usando um tileset simples
  const height = array.length
  const width = array[0].length

  const buffer = new Uint8Array(tex_width*tex_height*4)

  // pra cada tile do mapa a gente faz tipo

  //   (x,y)+(0,0) (x,y)+(1,0)
  //   (x,y)+(0,1) (x,y)+(1,1)

  // pra cada tile do mapa original...
  for(let y = 0; y < height; y++){
    for(let x = 0; x < width; x++) {
      for(let sub_y = 0; sub_y < 2; sub_y++){
        for(let sub_x = 0; sub_x < 2; sub_x++){
          const cell = ((y*2+sub_y) * tex_width + (x*2+sub_x))*4
          const tile = array[y][x]
          
          const tile_x = tile % (tileset_cols)
          const tile_y = (tile / (tileset_cols))|0

          // r = offset x
          buffer[cell] = (tile_x-1)*2 + sub_x + (sub_x == sub_y ? Math.random() > 0.95 ? 1 : 0 : 0)
          // g = offset y
          buffer[cell+1] = tile_y*2 + sub_y
          // b = ?
          // a = alfa
          buffer[cell+3] = 255
          //buffer[cell+2] = (x/width)*255

        }
      }
    }
  }
  return buffer
}

export class TileMap{
  tiles
  /** @type {WebGLTexture|null} */
  texture = null
  width
  height
  tileset_rows=0
  tileset_cols=0
  tile_width=0
  tile_height=0
  tex_width=0
  tex_height=0

  inverse_tile_width=0
  inverse_tile_height=0
  inverse_tileset_width=0
  inverse_tileset_height=0
  inverse_map_pixel_width=0
  inverse_map_pixel_height=0

  must_create_map_texture = true
  must_update_map_texture = true

  /**
   * @param {number[][]} data 
   */
  constructor(data){
    this.height = data.length
    this.width = data[0].length
    this.tiles = data.map( x => x.map( y => y) )
  }

  /**
   * @param {WebGLRenderingContext} ctx
   * @param {Uint8Array<ArrayBuffer>} tile_buffer
   * @param {number} tex_width
   * @param {number} tex_height
   */
  setTextureFromTileBuffer(ctx,tile_buffer,tex_width,tex_height){
    ctx.bindTexture(ctx.TEXTURE_2D,this.texture)
    ctx.texParameteri(ctx.TEXTURE_2D,ctx.TEXTURE_WRAP_S,ctx.CLAMP_TO_EDGE)
    ctx.texParameteri(ctx.TEXTURE_2D,ctx.TEXTURE_WRAP_T,ctx.CLAMP_TO_EDGE)
    ctx.texParameteri(ctx.TEXTURE_2D,ctx.TEXTURE_MAG_FILTER,ctx.NEAREST)
    ctx.texParameteri(ctx.TEXTURE_2D,ctx.TEXTURE_MIN_FILTER,ctx.NEAREST)
    ctx.texImage2D(
      ctx.TEXTURE_2D,
      0,
      ctx.RGBA,
      tex_width,
      tex_height,
      0,
      ctx.RGBA,
      ctx.UNSIGNED_BYTE,
      tile_buffer
    )
  }

  /**
   * 
   * @param {WebGLRenderingContext} ctx 
   * @param {import("../image").WGLImage} tileset 
   */
  createTexture(ctx,tileset){
    if(this.must_create_map_texture){
      // já tem textura = tem que deletar a antiga
      if(this.texture !== null){
        ctx.deleteTexture(this.texture)
      }
      this.texture = ctx.createTexture()
    }
    this.inverse_tileset_width = 1/tileset.width
    this.inverse_tileset_height = 1/tileset.height
    this.tile_width = tileset.frameWidth
    this.tile_height = tileset.frameHeight
    this.inverse_tile_width = 1/tileset.frameWidth
    this.inverse_tile_height = 1/tileset.frameHeight
    this.tileset_rows = tileset.height / tileset.frameHeight
    this.tileset_cols = tileset.width / tileset.frameWidth
    // o mapa é representado como uma textura
    // onde os componentes r e g são offsets x e y no 
    // tilemap.

    // a gente precisa de uma textura com dobro da largura e dobro da altura
    // para conseguir usar os subtiles.
    this.tex_width = nearestPowerOf2(this.width*2)  
    this.tex_height = nearestPowerOf2(this.height*2)

    this.inverse_map_pixel_width = 1/(this.tex_width * this.tile_width)
    this.inverse_map_pixel_height = 1/(this.tex_height * this.tile_height)

    const buffer = tile_buffer_from_array(this.tiles,this.tex_width,this.tex_height,this.tileset_cols)
    this.setTextureFromTileBuffer(ctx,buffer,this.tex_width,this.tex_height)

    this.must_create_map_texture=false
    this.must_update_map_texture=false
    Unload(()=>{
      console.info("[TileMap] deleting tile offset texture")
      ctx.deleteTexture(this.texture)
    })
  }

  /**
   * @param {number[][]} new_tiles
   */
  updateTiles(new_tiles){
    const old_width = this.width
    const old_height = this.height

    this.height = new_tiles.length
    this.width = new_tiles[0].length
    this.tiles = new_tiles.map( x => x.map( y => y) )
    // tamanho do mapa mudou = tem que recriar a textura
    if(old_width !== this.width || old_height !== this.height){
      this.must_create_map_texture = true
    }
    this.must_update_map_texture = true
  }
  
  hasMapTexture(){
    return  this.texture !== null && !(this.must_create_map_texture || this.must_update_map_texture)
  }
}

export class TileMapDrawer{
  shader
  program_info
  position_buffer
  screen_width
  screen_height

  /**
   * 
   * @param {WebGLRenderingContext} ctx 
   * @param {number} screen_width 
   * @param {number} screen_height 
   */
  constructor(ctx,screen_width,screen_height){
    this.screen_width = screen_width
    this.screen_height = screen_height

    this.shader = initShaderProgram(ctx,vs_source,fs_source)
    const al = (/** @type {string} */ name) => ctx.getAttribLocation(this.shader,name)
    const ul = (/** @type {string} */ name) => ctx.getUniformLocation(this.shader,name)

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

    Unload(()=>{
      console.info("deleting position buffer")
      ctx.deleteBuffer(this.position_buffer)
      console.info("deleting shader")
      ctx.deleteProgram(this.shader)
    })    
  }

  /**
   * @param {WebGLRenderingContext} ctx 
   * @param {TileMap} tilemap 
   * @param {import("../image").WGLImage} tileset 
   * @param {number} x 
   * @param {number} y 
   */
  drawTilemap(ctx,tilemap,tileset,x,y){
    if(!tilemap.hasMapTexture()){
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

    // GAMBI: dividir 16x16 em 4x 8x8 pra conseguir usar o chipset de RPG Maker 2k
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

    // WTF: de onde veio esse u.texture?????
    // acho que era um esquema para poder ter várias camadas ou frames
    // ctx.uniform1i(this.program_info.u.texture,0)
    
    // desenha
    ctx.drawArrays(ctx.TRIANGLES,0,6)

    // desbinda as texturas
    ctx.activeTexture(ctx.TEXTURE1)
    ctx.bindTexture(ctx.TEXTURE_2D,null)
    ctx.activeTexture(ctx.TEXTURE0)
    ctx.bindTexture(ctx.TEXTURE_2D,null)
  }
}