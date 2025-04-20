/** Isso é só uma gambiarra temporária pra poder desenhar texto em cima
 * do webgl.
 */

function loadFont(){

}

function setFont(){

}

/**
 * 
 * @param {CanvasRenderingContext2D} ctx 
 * @param {number} x 
 * @param {number} y 
 * @param {string} text 
 */
function drawText(ctx, x,y,text){

    const maxWidth = ctx.canvas.width - x*4
    const words = text.split(' ')
    let line = ''
    for(let n = 0; n < words.length; n++){
        let testLine = line + words[n] + ' '
        let metrics = ctx.measureText( testLine )
        if(metrics.width > maxWidth && n > 0){
            ctx.fillText(line,x*2,y*2)
            line = words[n] + ' '
            y += 32
        }else{
            line = testLine
        }
    }
    ctx.fillText(line, x*2, y*2)
}

/**
 * 
 * @param {CanvasRenderingContext2D} ctx 
 */
function clear(ctx){
    ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height)
}



/**
 * 
 * @param {HTMLCanvasElement} element 
 * @param {HTMLCanvasElement} parent
 * @param {number} _width
 * @param {number} _height
 */
function initializeText(element, parent, _width, _height){
    element.width = _width*2
    element.height = _height*2
    element.style.imageRendering = "pixelated"

    element.style.width = parent.offsetWidth + "px"
    element.style.height = parent.offsetHeight +"px"
    element.style.top = parent.offsetTop + "px"

    window.addEventListener("resize", ()=>{
        element.style.top = parent.offsetTop + "px"
        element.style.width = parent.offsetWidth + "px"
        element.style.height = parent.offsetHeight +"px"    
    })

    let ctx = element.getContext("2d")
    if(ctx){
        ctx.font = "48px Arial"
        ctx.textBaseline = "top"
        ctx.textAlign = "left"
        ctx.imageSmoothingEnabled=false
    }
    return ctx
}

export {
    loadFont,
    setFont,
    clear,
    drawText,
    initializeText
}