// essa coisa aqui é um render to texture target
// funciona assim
// chama render_target.begin(), 
// faz todas as desenhações,
// e depois chama render_target.end() pra 
// desenhar o conteúdo da textura na tela 

import { mat4 } from "gl-matrix"
import { initShaderProgram } from "./shader"
import { nearestPowerOf2 } from "../webgl"

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
    varying mediump vec2 vTextureCoord;
    uniform sampler2D uSampler;
    void main(){
        gl_FragColor = texture2D(uSampler,vTextureCoord);
    }
`
const model_view_matrix = mat4.create()
const projection_matrix = mat4.create()

let shader
let program_info
let texture_coordinate_buffer
let position_buffer

function initTextureCoordinateBuffer(ctx){
    const textCoordBuffer = ctx.createBuffer()
    ctx.bindBuffer(ctx.ARRAY_BUFFER,textCoordBuffer)
    const uvs = [
        1,1,
        0,1,
        1,0,
        0,0
    ]   
    ctx.bindBuffer( ctx.ARRAY_BUFFER , textCoordBuffer )
    ctx.bufferData(ctx.ARRAY_BUFFER,new Float32Array(uvs),ctx.STATIC_DRAW)
    return textCoordBuffer
}

/** 
 * @typedef {Object} RenderTarget 
 * @property {WebGLFramebuffer} fb
 * @property {WebGLTexture} tex
 * @property {number} width
 * @property {number} height
 * @property {number} tex_width
 * @property {number} tex_height
*/

/**
 * @param {WebGLRenderingContext} ctx 
 * @param {number} width 
 * @param {number} height 
 * @returns {RenderTarget}
 */
function init(ctx,width, height){
    mat4.ortho(projection_matrix,0,width,height,0,-1,1)

    shader = initShaderProgram(ctx,vsSource,fsSource)
    if (!shader)
        throw "não consegui compilar o shader do render to texture"

    const ul = u  => ctx.getUniformLocation( shader, u) 
    const al = a => ctx.getAttribLocation( shader, a)

    program_info = {
        program : shader,
        u : {
            modelViewMatrix : ul("uModelViewMatrix"),
            projectionMatrix: ul("uProjectionMatrix"),
            sampler : ul("uSampler")
        },
        a : {
            vertexPosition : al("aVertexPosition"),
            textureCoord : al("aTextureCoord")
        }
    }

    texture_coordinate_buffer = initTextureCoordinateBuffer(ctx)

    position_buffer = ctx.createBuffer()
    ctx.bindBuffer(ctx.ARRAY_BUFFER,position_buffer)
    ctx.bufferData(ctx.ARRAY_BUFFER,
        new Float32Array([
            0.5, 0.5,
            -0.5, 0.5,
            0.5, -0.5,
            -0.5, -0.5
        ])
        ,ctx.STATIC_DRAW
    )

    const tex_width = nearestPowerOf2(width)
    const tex_height = nearestPowerOf2(height)
    const targetTex = ctx.createTexture()
    if(!targetTex)
        throw "não consegui criar textura de alvo"
    ctx.bindTexture(ctx.TEXTURE_2D, targetTex)
    ctx.texImage2D(
        ctx.TEXTURE_2D,
        0,        // level
        ctx.RGB,  // internal format
        tex_width,
        tex_height,
        0,         // border
        ctx.RGB,   // format
        ctx.UNSIGNED_BYTE, // formato de cada byte dentro do pixel
        null
    )
    // parametros de textura
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.NEAREST)
    ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.NEAREST)
    ctx.texParameteri(ctx.TEXTURE_2D,ctx.TEXTURE_WRAP_S,ctx.CLAMP_TO_EDGE)
    ctx.texParameteri(ctx.TEXTURE_2D,ctx.TEXTURE_WRAP_T,ctx.CLAMP_TO_EDGE)

    const fb = ctx.createFramebuffer()
    if(!fb)
        throw 'não consegui criar framebuffer'

    ctx.bindFramebuffer(ctx.FRAMEBUFFER, fb)
    ctx.framebufferTexture2D(
        ctx.FRAMEBUFFER, 
        ctx.COLOR_ATTACHMENT0,
        ctx.TEXTURE_2D,
        targetTex,
        0  // level (não sei o que significa dentro do framebuffer)
    )
    
    // a gente só precisa fazer isso uma vez, ou talvez
    // no máximo toda vez que a tela for redimensionada
    mat4.identity(model_view_matrix)
    // posiciona no meio da textura
    mat4.translate(model_view_matrix,model_view_matrix,
        [tex_width/2,height-tex_height/2,1]
    )
    // escala pra ficar do tamanho da tela
    mat4.scale(model_view_matrix,model_view_matrix,
        [tex_width,-tex_height,1]
    )    
    return {
        fb,
        tex: targetTex,
        width,
        height,
        tex_width,
        tex_height
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
}


/**
 * desenha a textura na tela
 * @param {WebGLRenderingContext} ctx 
 * @param {RenderTarget} targetTex 
 */
function end(ctx, targetTex){
    // isso indica que a gente vai parar de desenhar nessa textura
    ctx.bindFramebuffer(ctx.FRAMEBUFFER, null)
    ctx.activeTexture(ctx.TEXTURE0)
    ctx.bindTexture(ctx.TEXTURE_2D,targetTex.tex)
    ctx.viewport(0,0,ctx.canvas.width,ctx.canvas.height)
    // ativa o shader

    ctx.useProgram(shader)
    // coordenadas uv da textura
    ctx.bindBuffer( ctx.ARRAY_BUFFER , texture_coordinate_buffer )
    ctx.vertexAttribPointer(
        program_info.a.textureCoord,
        2,
        ctx.FLOAT,
        false,
        0,
        0
    )

    ctx.enableVertexAttribArray( program_info.a.textureCoord )

    // coloca as posições dos vértices
    ctx.bindBuffer(ctx.ARRAY_BUFFER,position_buffer)
    ctx.vertexAttribPointer(
        program_info.a.vertexPosition,
        2,         // numComponents
        ctx.FLOAT, // type
        false ,    // normalize
        0,         // stride
        0          // offset
    )
    ctx.enableVertexAttribArray(
        program_info.a.vertexPosition
    )

    // fragment shader vai ler da textura 0
    ctx.uniform1i(program_info.u.sampler,0)
    // matriz ortogonal supimpa
    ctx.uniformMatrix4fv(
        program_info.u.projectionMatrix,
        false,
        projection_matrix
    )
    // matriz de escala
    ctx.uniformMatrix4fv(
        program_info.u.modelViewMatrix,
        false, // transpose
        model_view_matrix
    )
    // finalmente desenha o retangulo
    ctx.drawArrays(ctx.TRIANGLE_STRIP,
        0, // offset
        4  // vertexCount
    )
}

export {
    init, begin, end
}