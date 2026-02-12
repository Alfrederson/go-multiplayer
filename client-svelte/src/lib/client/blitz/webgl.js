import { mat4 } from "gl-matrix"
import { IB2D, Unload } from "./blitz"

import { ImageDrawer } from "./webgl/drawer/image.js"
import { TileMapDrawer } from "./webgl/drawer/tilemap.js"

import * as image from "./webgl/image"
import * as render_to_texture from "./webgl/render_to_texture.js"

import * as canvas2d from "./webgl/canvas2d"

/**
 * WebGL program with attribute and uniform locations.
 * @typedef {Object} WebGLProgramInfo
 * @property {WebGLProgram} program - The WebGL program.
 * @property {Object} attribs - Attribute locations.
 * @property {number} attribs.vertexPosition - The location of the vertex position attribute.
 * @property {number} attribs.textureCoord - The location of the texture position attribute.
 * @property {Object} uniforms - Uniform locations.
 * @property {WebGLUniformLocation | null} uniforms.modelViewMatrix - The location of the model-view matrix uniform.
 * @property {WebGLUniformLocation | null} uniforms.drawColor - The location of the drawColor uniform.
 * @property {WebGLUniformLocation | null} uniforms.uSampler - The location of the drawColor uniform.
* 
*/

/**
 * @param {WebGLRenderingContext} ctx 
 * @param {*} buffers 
 * @param {WebGLProgramInfo} programInfo 
 * @param {number[]} uv
 */
export function setTextureCoordAttribute(ctx,buffers,programInfo,uv){
    ctx.bindBuffer( ctx.ARRAY_BUFFER , buffers )
    ctx.bufferData(
        ctx.ARRAY_BUFFER,
        new Float32Array(uv),
        ctx.STATIC_DRAW
    )
    ctx.vertexAttribPointer(
        programInfo.attribs.textureCoord,
        2,
        ctx.FLOAT,
        false,
        0,
        0
    )
    ctx.enableVertexAttribArray( 
        programInfo.attribs.textureCoord
    )
}


// o que que eu estava tentando fazer aqui???
// fazer um renderizador webgl intercambiável com um 
// renderizador de canvas!
// vou remover isso e deixar só o wgl
/** @implements {IB2D} */
class WGL_B2D {
    // GAMBI
    /** @type {any} */
    ctx2d

    /** @type {boolean} */
    initialized = false

    _finished = false

    /** @type {WebGLRenderingContext?} */
    ctx = null

    /** @type {import("./webgl/render_to_texture.js").RenderTarget?} */
    renderTarget = null

    scale = [1,1]
    rotation = 0
    drawColor = [1,1,1,1]

    camX = 0
    camY = 0

    /** @type { image.WGLImage | null} */
    lastImage = null
    lastFrame = 0



    /** @type { ImageDrawer? } */
    imageBuddy = null

    /** @type { TileMapDrawer? } */
    tileBuddy = null

    /**
     * Carrega uma imagem.
     * @param {string} imageName 
     */
    async LoadImage(imageName){
        if(!this.ctx)
            throw "não consigo carregar imagem porque o contexto não foi inicializado."
        return image.loadImage( this.ctx , imageName,0,0 )
    }

    /**
     * @param {string} imageName
     * @param {number} frameWidth
     * @param {number} frameHeight
     */
    async LoadAnimImage(imageName,frameWidth, frameHeight){
        if(!this.ctx)
            throw "não consigo carregar imagem porque o contexto não foi inicializado."

        return image.loadImage( this.ctx, imageName,frameWidth,frameHeight )
    }

    /**
     * @type {function[]}
     */
    _finalizers = []

    /**
     * Inicia os gráficos.
     * @param {number} width 
     * @param {number} height 
     * @param {string} elementId é o id do elemento. função falha se não existir um canvas com esse id. 
     */
    Graphics(width,height, elementId){
        /** @type {HTMLCanvasElement | null} */
        // @ts-ignore
        const canvas = document.getElementById(elementId);
        
        /** @type {HTMLCanvasElement | null} */    
        // @ts-ignore
        const textCanvas = document.getElementById("text")

        if(!canvas)
            throw "Não achei o elemento."
        if(!(canvas instanceof HTMLCanvasElement))
            throw "Elemento não é um canvas."

        const body= document.getElementsByTagName("body")[0]
        // manter a proporção da tela
        const letterBox = function(){
            let innerRatio = width/height
            let outerRatio = body.clientWidth / body.clientHeight    

            if (outerRatio > innerRatio){
                canvas.width = body.clientHeight * innerRatio
                canvas.height = body.clientHeight;
            }else{
                canvas.width = body.clientWidth
                canvas.height = body.clientWidth/innerRatio
            }
        }
        letterBox()

        let _webgl = canvas.getContext("webgl")
        if(!_webgl)
            throw "Não consegui pegar um contexto de renderização."
        this.ctx = _webgl;

        if(!textCanvas)
            throw "não tenho o canvas de texto!"

        this.ctx2d = canvas2d.initializeText(
            textCanvas,
            canvas,
            width,
            height
        )

        if(!this.ctx2d)
            throw "Não consegui um contexto de desenho 2D"

        // note a mistura caótica de estilos diferentes
        this.renderTarget = render_to_texture.init(this.ctx,width,height)

        // aqui eu estava achando que teria mais de um renderizador de
        // imagem ao mesmo tempo. vai ter não!
        this.imageBuddy = new ImageDrawer(this.ctx,width, height)
        this.tileBuddy = new TileMapDrawer(this.ctx,width, height)
                
        // alpha blend
        this.ctx.enable(this.ctx.BLEND);
        this.ctx.blendFunc(this.ctx.SRC_ALPHA, this.ctx.ONE_MINUS_SRC_ALPHA);
        
        // ajusta o tamanho do canvas pra ficar  bunitim

        const resize_handler = ()=>{
            letterBox()
            this.ctx?.viewport(0,0, this.ctx.canvas.width, this.ctx.canvas.height)
        }

        window.addEventListener("resize", resize_handler)


        this.initialized=true
        Unload(()=>{
            window.removeEventListener("resize",resize_handler)
            this.ctx=null
            this.ctx2d=null
        })
    }

    EndGraphics(){
        console.info("closing graphics (this doesn't do anything)")
    }

    /**
     * Limpa a tela com a cor especificada.
     * @param {number} r 
     * @param {number} g 
     * @param {number} b 
     */
    Cls(r,g,b){
        if(!this.ctx)
            throw "não consigo limpar a tela porque o contexto não foi inicializado"
        canvas2d.clear( this.ctx2d )
        this.ctx.clearColor(r/255,g/255,b/255,1.0)
        this.ctx.clear(this.ctx.COLOR_BUFFER_BIT)        
    }

    /**
     * Define o ângulo com o qual as próximas operações de desenho serão chamadas.
     * @param {number} angle
     */
    SetAngle(angle){
        this.rotation = angle
        this.imageBuddy?.setRotation(angle)
    }

    /**
     * @param {number} x
     * @param {number} y
     */
    SetScale(x,y){
        this.scale = [x,y]
        this.imageBuddy?.setScale(x,y)
    }

    /**
     * @param {number} r
     * @param {number} g
     * @param {number} b
     * @param {number} a
     */
    SetColor(r,g,b,a){
        this.imageBuddy?.setColor(r,g,b,a)
    }


    /**
     * @param {number} x
     * @param {number} y
     */
    SetCamera(x,y){
        this.camX = x
        this.camY = y
    }    

    /**
     * @param {image.WGLImage} imageHandler
     * @param {number} x
     * @param {number} y
     */
    DrawImage(imageHandler, x, y){
        this.imageBuddy?.drawImage(
            this.ctx,
            imageHandler,
            (x- this.camX),
            (y- this.camY)
        )
    }
    /**
     * @param {image.WGLImage} imageHandler
     * @param {number} x
     * @param {number} y
     * @param {number} frame
     */
    DrawImageFrame(imageHandler, x, y, frame){
        this.imageBuddy?.drawImageFrame(
            this.ctx,
            imageHandler,
            (x-this.camX),
            (y-this.camY),
            frame
        )
    }

    /**
     * @param {import("./webgl/drawer/tilemap.js").TileMap} tilemapHandler
     * @param {image.WGLImage} imageHandler
     * @param {number} x
     * @param {number} y
     */
    DrawTilemap(tilemapHandler, imageHandler, x,y){
        if(!this.ctx)
            throw "não consigo desenhar o tilemap porque o contexto não foi inicializado"
        this.tileBuddy?.drawTilemap(this.ctx,tilemapHandler,imageHandler,x,y)
    }
    
    /**
     * 
     * @param {string} txt 
     * @param {number} x 
     * @param {number} y 
     */
    DrawText(txt,x,y){
        canvas2d.drawText(this.ctx2d,x,y,txt)
    }

    /**
     * @param {(arg0: IB2D) => void} callback
     */
    Draw( callback ){
        if(!this.ctx)
            throw "não consigo desenhar porque o contexto não foi inicializado"
        if(!this.renderTarget)
            throw "não consigo desenhar porque não tenho um renderTarget"
        if(this._finished)
            throw "já morri bicho"
        render_to_texture.begin( this.ctx, this.renderTarget )
        callback( this )
        render_to_texture.end( this.ctx, this.renderTarget )
    }
}


/**
 * 
 * @param {number} n 
 * @returns 
 */
export function nearestPowerOf2(n){
    let result = 1
    while ( result < n){
        result *= 2
    }
    return result
}

export {
    WGL_B2D
}