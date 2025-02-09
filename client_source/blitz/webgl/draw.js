/**
 * 
 * @param {WebGLRenderingContext} ctx 
 * @param {number} r 
 * @param {number} g 
 * @param {number} b 
 */
function cls(ctx, r,g,b){
    ctx.clearColor(r/255,g/255,b/255,1.0)
    ctx.clear(ctx.COLOR_BUFFER_BIT)            
}

export {
    cls
}