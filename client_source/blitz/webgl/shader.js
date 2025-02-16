
// Dar um jeito de poder passar o u/v pra poder desenhar só um pedaço da imagem?

/**
 * Carrega um shader a partir de uma string.
 * @param {WebGLRenderingContext} ctx
 * @param {number} type
 * @param {string} source
 */
function loadShader(ctx, type, source){
    const shader = ctx.createShader(type)
    if(!shader)
        throw "Não consegui criar o shader"
    ctx.shaderSource(shader,source)
    ctx.compileShader(shader)
    if(!ctx.getShaderParameter(shader,ctx.COMPILE_STATUS)){
        let msg = "Erro compilando o shader: " + ctx.getShaderInfoLog(shader)
        ctx.deleteShader(shader)
        throw msg
    }
    return shader
}

/**
 * @param {WebGLRenderingContext} ctx
 * @param {string} vsSource
 * @param {string} fsSource
 */
function initShaderProgram(ctx,vsSource,fsSource){
    let shaderProgram = ctx.createProgram()
    if(!shaderProgram)
        throw "não consegui criar um shader program"

    const vs = loadShader(ctx,ctx.VERTEX_SHADER,vsSource)
    const fs = loadShader(ctx,ctx.FRAGMENT_SHADER,fsSource)

    ctx.attachShader(shaderProgram,vs)
    ctx.attachShader(shaderProgram,fs)
    ctx.linkProgram(shaderProgram)

    if(!ctx.getProgramParameter(
        shaderProgram,
        ctx.LINK_STATUS
    )){
        throw `Não consegui inicializar o shader program: ${ctx.getProgramInfoLog(shaderProgram)}`
    }

    return shaderProgram
}

export {
    loadShader,
    initShaderProgram
}