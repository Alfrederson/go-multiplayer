import { mat4 } from "gl-matrix"
import { IB2D, IImage } from "./blitz"

import { vsSource, fsSource, initShaderProgram, loadShader } from "./webgl/shader"

import { ImageDrawer } from "./webgl/image/drawer.js"

import * as image from "./webgl/image"
import * as draw from "./webgl/draw"
import * as rtt from "./webgl/texrender"


import * as canvas2d from "./webgl/canvas2d"

/**
 * WebGL program with attribute and uniform locations.
 * @typedef {Object} WebGLProgramInfo
 * @property {WebGLProgram} program - The WebGL program.
 * @property {Object} attribLocations - Attribute locations.
 * @property {number} attribLocations.vertexPosition - The location of the vertex position attribute.
 * @property {number} attribLocations.textureCoord - The location of the texture position attribute.
 * @property {Object} uniformLocations - Uniform locations.
 * @property {WebGLUniformLocation | null} uniformLocations.projectionMatrix - The location of the projection matrix uniform.
 * @property {WebGLUniformLocation | null} uniformLocations.modelViewMatrix - The location of the model-view matrix uniform.
 * @property {WebGLUniformLocation | null} uniformLocations.drawColor - The location of the drawColor uniform.
 * @property {WebGLUniformLocation | null} uniformLocations.uSampler - The location of the drawColor uniform.
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
        programInfo.attribLocations.textureCoord,
        2,
        ctx.FLOAT,
        false,
        0,
        0
    )
    ctx.enableVertexAttribArray( 
        programInfo.attribLocations.textureCoord
    )
}




/** @implements {IB2D} */
class WGL_B2D {
    // GAMBI
    /** @type {any} */
    ctx2d

    /** @type {boolean} */
    initialized = false

    /** @type {WebGLRenderingContext} */
    ctx

    /** @type {import("./webgl/texrender").RenderTarget} */
    renderTarget

    /** @type {WebGLBuffer|null} */
    positionBuffer = null

    /** @type {WebGLBuffer|null} */
    textureCoordinateBuffer = null

    /** @type {mat4} */
    projectionMatrix = mat4.create()

    scale = [1,1]
    rotation = 0
    drawColor = [1,1,1,1]

    camX = 0
    camY = 0

    /** @type { image.IWGLImage | null} */
    lastImage = null
    lastFrame = 0



    /** @type { ImageDrawer } */
    imageDrawer

    /**
     * Carrega uma imagem.
     * @param {string} imageName 
     */
    async LoadImage(imageName){
        return image.loadImage( this.ctx, imageName,0,0 )
    }

    async LoadAnimImage(imageName,frameWidth, frameHeight){
        return image.loadImage( this.ctx, imageName,frameWidth,frameHeight )
    }
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

        this.ctx2d = canvas2d.initializeText(
            textCanvas,
            canvas,
            width,
            height
        )

        if(!this.ctx2d)
            throw "Não consegui um contexto de desenho 2D"

        mat4.ortho(this.projectionMatrix,0,width,height,0,-500,500)

        this.renderTarget = rtt.init(this.ctx,width,height,this.projectionMatrix)
        this.imageBuddy = new ImageDrawer(this.ctx,width, height)
        
        
        // alpha blend
        this.ctx.enable(this.ctx.BLEND);
        this.ctx.blendFunc(this.ctx.SRC_ALPHA, this.ctx.ONE_MINUS_SRC_ALPHA);
        
        // ajusta o tamanho do canvas pra ficar  bunitim
        window.addEventListener("resize", ()=>{
            letterBox()
            this.ctx?.viewport(0,0, this.ctx.canvas.width, this.ctx.canvas.height)
        })


        
        this.initialized=true
    }
    /**
     * Limpa a tela com a cor especificada.
     * @param {number} r 
     * @param {number} g 
     * @param {number} b 
     */
    Cls(r,g,b){
        canvas2d.clear( this.ctx2d )
        draw.cls( this.ctx, r,g,b )
    }

    /**
     * Define o ângulo com o qual as próximas operações de desenho serão chamadas.
     * @param {number} angle
     */
    SetAngle(angle){
        this.rotation = angle
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
        this.drawColor[0] = r
        this.drawColor[1] = g
        this.drawColor[2] = b
        this.drawColor[3] = a
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
     * @param {image.IWGLImage} imageHandler
     * @param {number} x
     * @param {number} y
     */
    DrawImage(imageHandler, x, y){
        this.imageBuddy?.drawImage(
            this.ctx,
            imageHandler,
            x- this.camX,
            y- this.camY
        )
    }


    DrawImageFrame(imageHandler, x, y, frame){
        if(!this.initialized)
            throw "contexto não inicializado"

        this.imageBuddy?.drawImageFrame(
            this.ctx,
            imageHandler,
            x-this.camX,
            y-this.camY,
            frame
        )
    }
    
    /**
     * 
     * @param {string} txt 
     * @param {number} x 
     * @param {number} y 
     */
    DrawText(txt,x,y){
        canvas2d.drawText(
            this.ctx2d,
            x,y,txt
        )
    }

    /**
     * @param {(arg0: IB2D) => void} callback
     */
    Draw( callback ){
        rtt.begin( this.ctx, this.renderTarget)

        this.imageBuddy?.begin(this.ctx)
        callback( this )

        rtt.end( this.ctx, this.renderTarget )
    }


}

export {
    WGL_B2D
}