import { mat4 } from "gl-matrix"

function nearestPowerOf2(n){
    let result = 1
    while ( result < n){
        result *= 2
    }
    return result
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
function init(ctx,width, height){
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

    console.log(texWidth,texHeight)
    
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

    ctx.clear( ctx.COLOR_BUFFER_BIT  | ctx.DEPTH_BUFFER_BIT )
}

/**
 * @param {WebGLRenderingContext} ctx 
 * @param {RenderTarget} targetTex 
 */
function end(ctx, programInfo, targetTex){
    ctx.bindFramebuffer(ctx.FRAMEBUFFER, null)
    ctx.bindTexture(ctx.TEXTURE_2D,targetTex.tex)
    ctx.viewport(0,0,ctx.canvas.width,ctx.canvas.height)
    // desenha a textura
    const modelViewMatrix = mat4.create()
    mat4.translate(
        modelViewMatrix,
        modelViewMatrix,
        [targetTex.texWidth/2,targetTex.height-targetTex.texHeight/2,1]
    )
    mat4.scale(
        modelViewMatrix,
        modelViewMatrix,
        [targetTex.texWidth,-targetTex.texHeight,1]
    )
    ctx.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false, // transpose
        modelViewMatrix
    )
    ctx.uniform4fv(
        programInfo.uniformLocations.drawColor,
        [1,1,1,1]
    )
    ctx.uniform1i(programInfo.uniformLocations.uSampler,0)
    ctx.drawArrays(
        ctx.TRIANGLE_STRIP,
        0, // offset
        4  // vertexCount
    )
}

export {
    init, begin, end
}