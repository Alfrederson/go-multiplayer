import { mat4 } from "gl-matrix"
import { initShaderProgram } from "./shader"
import { setTextureCoordAttribute } from "../webgl"

const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec2 aTextureCoord;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;

    varying lowp vec2 vTextureCoord;
    void main(){
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        vTextureCoord = aTextureCoord;
    }
`
const fsSource = `
    varying lowp vec2 vTextureCoord;
    uniform sampler2D uSampler;
    void main(){
        gl_FragColor = texture2D(uSampler,vTextureCoord);
    }
`

function nearestPowerOf2(n){
    let result = 1
    while ( result < n){
        result *= 2
    }
    return result
}

let shaderProgram
let programInfo
let projectionMatrix
let textureCoordinateBuffer
let positionBuffer

/**
 * @param {WebGLRenderingContext} ctx 
 */
function initPositionBuffer(ctx){
    const positionBuffer = ctx.createBuffer()
    ctx.bindBuffer(ctx.ARRAY_BUFFER,positionBuffer)
    const positions = [
        0.5, 0.5,
        -0.5, 0.5,
        0.5, -0.5,
        -0.5, -0.5
    ]
    ctx.bufferData(ctx.ARRAY_BUFFER, new Float32Array(positions),ctx.STATIC_DRAW)
    return positionBuffer
}

/**
 * @param {WebGLRenderingContext} ctx 
 * @param {*} buffers 
 * @param {WebGLProgramInfo} programInfo 
 */
function setPositionAttribute(ctx, buffers, programInfo){
    ctx.bindBuffer(
        ctx.ARRAY_BUFFER,
        buffers
    )
    ctx.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition,
        2, // numComponents
        ctx.FLOAT,// type
        false ,// normalize
        0,     // stride
        0      // offset
    )
    ctx.enableVertexAttribArray(
        programInfo.attribLocations.vertexPosition
    )
}

/** 
 * @typedef {Object} RenderTarget 
 * @property {WebGLFramebuffer} fb
 * @property {WebGLTexture} tex
 * @property {number} width
 * @property {number} height
 * @property {number} texWidth
 * @property {number} texHeight
*/

/**
 * @param {WebGLRenderingContext} ctx 
 * @param {number} width 
 * @param {number} height 
 * @returns {RenderTarget}
 */
function init(ctx,width, height, _projectionMatrix){
    projectionMatrix = _projectionMatrix
    shaderProgram = initShaderProgram(ctx,vsSource,fsSource)
    if (!shaderProgram)
        throw "não consegui compilar o shader do render to texture"

    

    const ul = u  => ctx.getUniformLocation( shaderProgram, u) 
    const al = a => ctx.getAttribLocation( shaderProgram, a)

    programInfo = {
        program : shaderProgram,
        uniformLocations : {
            modelViewMatrix : ul("uModelViewMatrix"),
            projectionMatrix: ul("uProjectionMatrix"),
            sampler : ul("uSampler")
        },
        attribLocations : {
            vertexPosition : al("aVertexPosition"),
            textureCoord : al("aTextureCoord")
        }
    }


    textureCoordinateBuffer = ctx.createBuffer()
    positionBuffer = initPositionBuffer(ctx)


    const texWidth = nearestPowerOf2(width)
    const texHeight = nearestPowerOf2(height)
    const targetTex = ctx.createTexture()
    if(!targetTex)
        throw "não consegui criar textura de alvo"
    ctx.bindTexture(ctx.TEXTURE_2D, targetTex)
    
    const level = 0
    const internalFormat = ctx.RGBA
    const border = 0
    const format = ctx.RGBA
    const type = ctx.UNSIGNED_BYTE
    const data = null

    ctx.texImage2D(
        ctx.TEXTURE_2D,
        level,
        internalFormat,
        texWidth,
        texHeight,
        border,
        format,
        type,
        data
    )

    ctx.texParameteri(
        ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.NEAREST
    )
    ctx.texParameteri(
        ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.NEAREST
    )

    ctx.texParameteri(
        ctx.TEXTURE_2D,
        ctx.TEXTURE_WRAP_S,
        ctx.CLAMP_TO_EDGE
    )

    ctx.texParameteri(
        ctx.TEXTURE_2D,
        ctx.TEXTURE_WRAP_T,
        ctx.CLAMP_TO_EDGE
    )

    const fb = ctx.createFramebuffer()
    if(!fb)
        throw 'não consegui criar framebuffer'

    ctx.bindFramebuffer(ctx.FRAMEBUFFER, fb)
    ctx.framebufferTexture2D(
        ctx.FRAMEBUFFER, 
        ctx.COLOR_ATTACHMENT0,
        ctx.TEXTURE_2D,
        targetTex,
        level // level
    )


    
    return {
        fb,
        tex: targetTex,
        width,
        height,
        texWidth,
        texHeight
    }

}

/**
 * @param {WebGLRenderingContext} ctx 
 * @param {RenderTarget} targetTex 
 */
function begin(ctx, targetTex){
    ctx.bindFramebuffer( ctx.FRAMEBUFFER, targetTex.fb )
    ctx.bindTexture( ctx.TEXTURE_2D, targetTex.tex )
    ctx.viewport(0,0, targetTex.width, targetTex.height)

    // ctx.clearColor(1,1,0,1)
    // ctx.clear( ctx.COLOR_BUFFER_BIT  | ctx.DEPTH_BUFFER_BIT )
}

const modelViewMatrix = mat4.create()
/**
 * @param {WebGLRenderingContext} ctx 
 * @param {RenderTarget} targetTex 
 */
function end(ctx, targetTex){

    ctx.bindFramebuffer(ctx.FRAMEBUFFER, null)
    ctx.bindTexture(ctx.TEXTURE_2D,targetTex.tex)
    ctx.viewport(0,0,ctx.canvas.width,ctx.canvas.height)
    // desenha a textura
    
    // reseta a matrix
    mat4.identity(modelViewMatrix)
    // posiciona no meio da textura
    mat4.translate(
        modelViewMatrix,
        modelViewMatrix,
        [targetTex.texWidth/2,targetTex.height-targetTex.texHeight/2,1]
    )
    // escala pra ficar do tamanho da tela
    mat4.scale(
        modelViewMatrix,
        modelViewMatrix,
        [targetTex.texWidth,-targetTex.texHeight,1]
    )
    
    // ativa o shader
    ctx.useProgram(shaderProgram)
    // os cantos da textura
    setTextureCoordAttribute(
        ctx,
        textureCoordinateBuffer,
        programInfo,[
            1,1,
            0,1,
            1,0,
            0,0
        ]            
    )    
    // as posições dos vértices
    setPositionAttribute(
        ctx,
        positionBuffer,
        programInfo
    )
    ctx.uniform1i(programInfo.uniformLocations.sampler,0)
    ctx.uniformMatrix4fv(
        programInfo.uniformLocations.projectionMatrix,
        false,
        projectionMatrix
    )
    ctx.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false, // transpose
        modelViewMatrix
    )
    ctx.drawArrays(
        ctx.TRIANGLE_STRIP,
        0, // offset
        4  // vertexCount
    )

}

export {
    init, begin, end
}