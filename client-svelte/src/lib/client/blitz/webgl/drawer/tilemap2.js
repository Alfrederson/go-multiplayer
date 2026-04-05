// aqui a gente vai fazer diferente.
// cada tilemap tem x * y blocos de 512 x 512.
// a gente desenha cada bloco copiando trechos da imagem tilemap.
// a gente desenha o bloco inteiro, sendo que pode ter até 4 blocos na tela (o encontro de 4 deles, por ex)

import { Unload } from "../../blitz"
import { initShaderProgram } from "../shader"

// tamanho da sub-textura
const BLOCK_WIDTH = 256
const BLOCK_HEIGHT = 256

// 8x8 para poder usar o chipset do RPG maker.
const TILE_WIDTH = 8
const TILE_HEIGHT = 8

const BLOCK_TILES_X = BLOCK_WIDTH / TILE_WIDTH
const BLOCK_TILES_Y = BLOCK_HEIGHT / TILE_HEIGHT

export class TileMap2 {
    blocks_width = 0
    blocks_height = 0

    /** @type {number[][]} */
    tiles = [[]]

    /** @type {(WebGLTexture|null)[][]} */
    blocks = [[]]

    /** @type {WebGLFramebuffer|null} */
    fbo = null

    width=0
    height=0

    must_initialize_blocks=true
    must_update_blocks=true

    /**
     * 
     * @param {number[][]} tiles 
     */
    constructor(tiles){
        // na verdade vai ser 2x2 o original.
        this.tiles = tiles.map(row => row.map( col => col ))


        this.width = tiles[0].length
        this.height = tiles.length

        this.blocks_width = Math.ceil(this.width / BLOCK_TILES_X) | 0
        this.blocks_height = Math.ceil(this.height / BLOCK_TILES_Y ) | 0

        console.log("blocos = ",this.blocks_width,this.blocks_height)

        this.blocks = Array.from({length : this.blocks_height}, row =>{
            return Array.from({length : this.blocks_width}, col => {
                return null 
            })
        })
    }

    /**
     * cria as subtexturas lá
     * @param {WebGLRenderingContext} ctx 
     */
    initialize_blocks(ctx){
        for(let y= 0; y < this.blocks_height;y++){
            for(let x = 0; x < this.blocks_width;x++){
                this.blocks[y][x] = ctx.createTexture()
                ctx.bindTexture(ctx.TEXTURE_2D,this.blocks[y][x])
                // textura vazia...
                ctx.texImage2D(
                    ctx.TEXTURE_2D,
                    0,
                    ctx.RGBA,
                    BLOCK_WIDTH,
                    BLOCK_HEIGHT,
                    0,
                    ctx.RGBA,
                    ctx.UNSIGNED_BYTE,
                    null
                )
                // modo "pixelizado"
                ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.NEAREST);
                ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.NEAREST);
                ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE);
                ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE);
            }
        }
        ctx.bindTexture(ctx.TEXTURE_2D,null)

        this.fbo = ctx.createFramebuffer()

        this.must_initialize_blocks=false
    }

    /**
     * desenha os tiles nas subtexturas
     * @param {WebGLRenderingContext} ctx
     * @param {WebGLTexture} tileset_texture
     */
    draw_tiles_to_blocks(ctx,tileset_texture){
        ctx.bindFramebuffer(ctx.FRAMEBUFFER,this.fbo)
        ctx.framebufferTexture2D(
            ctx.FRAMEBUFFER,
            ctx.COLOR_ATTACHMENT0,
            ctx.TEXTURE_2D,
            tileset_texture,
            0
        )

        for(let y = 0; y < this.height;y++){
            const block_y = (y / BLOCK_TILES_Y)|0
            for(let x = 0; x < this.width; x++){
                const block_x = (x / BLOCK_TILES_X)|0
                const block_px = (x % BLOCK_TILES_X)*TILE_WIDTH
                const block_py = (y % BLOCK_TILES_Y)*TILE_HEIGHT
                // agora é só copiar!
                let tile = this.tiles[y][x]
                if(tile < 1){
                    continue
                }
                tile--
                // 60 é 2 * colunas no chipset
                const tileset_x = (tile % 60)*TILE_WIDTH
                const tileset_y = ((tile / 60)|0)*TILE_HEIGHT

                ctx.bindTexture(ctx.TEXTURE_2D,this.blocks[block_y][block_x])

                ctx.copyTexSubImage2D(
                    ctx.TEXTURE_2D,
                    0,
                    block_px,block_py,
                    tileset_x,tileset_y,
                    TILE_WIDTH,TILE_HEIGHT
                )
            }
        }
        ctx.bindFramebuffer(ctx.FRAMEBUFFER,null)
        this.must_update_blocks=false
    }

    /**
     * deleta as subtexturas lá
     * @param {WebGLRenderingContext} ctx 
     */
    dispose_blocks(ctx){
        for(let y = 0 ; y < this.blocks_height; y++){
            for(let x = 0; x < this.blocks_width; x++){
                if(this.blocks[y][x] !== null){
                    ctx.deleteTexture(this.blocks[y][x])
                    this.blocks[y][x] = null
                }
            }
        }
        if(this.fbo !== null){
            ctx.deleteFramebuffer(this.fbo)
        }
    }
}

const quad = new Float32Array([
    0,   0,   0, 0,
    BLOCK_WIDTH, 0,   1, 0,
    0,   BLOCK_HEIGHT, 0, 1,

    0,   BLOCK_HEIGHT, 0, 1,
    BLOCK_WIDTH, 0,   1, 0,
    BLOCK_WIDTH, BLOCK_HEIGHT, 1, 1,
])

const vertex_shader = `
attribute vec2 a_pos;
attribute vec2 a_uv;
varying vec2 v_uv;
uniform vec2 u_resolution; // resolução da tela, ex: 320,240
uniform vec2 u_offset;     // posição x,y na tela
void main(){
    vec2 pos = a_pos + u_offset;
    vec2 zero_to_one = pos / u_resolution;
    vec2 clip = zero_to_one * 2.0 - 1.0;
    gl_Position = vec4(clip * vec2(1,-1), 0,1);
    v_uv = a_uv;
}  
`
const fragment_shader = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_block_width;

void main(){
    vec4 color = texture2D(u_tex, v_uv);

    // espessura da borda em UV (1 pixel ≈ 1 / tamanho da textura)
    // float border = 1.0 / u_block_width; // ajuste conforme tamanho do bloco

    // detecta se está na borda
    // bool isBorder =
    //     v_uv.x < border ||
    //     v_uv.x > 1.0 - border ||
    //     v_uv.y < border ||
    //     v_uv.y > 1.0 - border;
    gl_FragColor = color;
    // if (isBorder) {
    //     gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0); // lime
    // } else {
    //     gl_FragColor = color;
    // }
}
`

export class TileMapDrawer2 {
    vbo
    a_pos
    a_uv
    u_offset
    u_scale
    u_tex
    u_resolution
    u_block_width

    program

    screen_width
    screen_height
    /**
     * 
     * @param {WebGLRenderingContext} ctx 
     * @param {number} scr_width 
     * @param {number} scr_height 
     */
    constructor(ctx,scr_width,scr_height){
        this.screen_width = scr_width
        this.screen_height = scr_height

        this.vbo = ctx.createBuffer();
        ctx.bindBuffer(ctx.ARRAY_BUFFER,this.vbo);
        ctx.bufferData(ctx.ARRAY_BUFFER,quad,ctx.STATIC_DRAW);

        this.program = initShaderProgram(ctx,vertex_shader,fragment_shader)

        this.a_pos = ctx.getAttribLocation(this.program,"a_pos")
        this.a_uv = ctx.getAttribLocation(this.program,"a_uv")

        this.u_offset = ctx.getUniformLocation(this.program,"u_offset")
        this.u_scale = ctx.getUniformLocation(this.program,"u_scale")
        this.u_tex = ctx.getUniformLocation(this.program,"u_tex")
        this.u_resolution = ctx.getUniformLocation(this.program,"u_resolution")
        this.u_block_width = ctx.getUniformLocation(this.program,"u_block_width")

        Unload(()=>{
            ctx.deleteBuffer(this.vbo);
            ctx.deleteProgram(this.program)
        })
    }

    /**
     * @param {WebGLRenderingContext} ctx 
     * @param {TileMap2} tilemap 
     * @param {import("../image").WGLImage} tileset 
     * @param {number} x 
     * @param {number} y 
     */
    drawTilemap(ctx,tilemap,tileset,x,y){
        if(!tileset.texture){
            return
        }
        if(tilemap.must_initialize_blocks){
            console.log("initializing blocks")
            tilemap.initialize_blocks(ctx)
        }
        if(tilemap.must_update_blocks){
            console.log("pre rendering tiles")
            tilemap.draw_tiles_to_blocks(ctx,tileset.texture)
        }
        ctx.useProgram(this.program)

        ctx.bindBuffer(ctx.ARRAY_BUFFER,this.vbo)
        ctx.enableVertexAttribArray(this.a_pos)
        ctx.vertexAttribPointer(
            this.a_pos,
            2,
            ctx.FLOAT,
            false,
            16,
            0
        )

        ctx.enableVertexAttribArray(this.a_uv)
        ctx.vertexAttribPointer(
            this.a_uv,
            2,
            ctx.FLOAT,
            false,
            16,
            8
        )

        ctx.uniform1f(this.u_block_width,BLOCK_WIDTH)
        ctx.uniform2fv(this.u_resolution,[this.screen_width,this.screen_height])
        ctx.activeTexture(ctx.TEXTURE0)
        ctx.uniform1i(this.u_tex,0) // significa desenhar ctx.TEXTURE0
        for(let by = 0; by < tilemap.blocks_height;by++){
            for(let bx = 0; bx < tilemap.blocks_width;bx++){
                ctx.bindTexture(ctx.TEXTURE_2D,tilemap.blocks[by][bx])
                ctx.uniform2f(this.u_offset,x+bx*BLOCK_WIDTH,y+by*BLOCK_HEIGHT)
                ctx.drawArrays(ctx.TRIANGLES,0,6)
            }
        }

    }
}