const input = {
    oldMouseX : 0,
    oldMouseY : 0,
    mouseX : 0,
    mouseY : 0,
    mouseDown : Array.from({length:10}, x => false),
    /** @type {HTMLCanvasElement | null} */
    canvasElement : null,

    width : 0,
    height : 0, 

    /** @type {{event:string, handler: function}[]} */
    currentListeners : []
}

/**
 * Ativa input no elemento especificado.
 * width e height são as dimensões "virtuais" da tela,
 * de tal forma que a posição real seja corrigida para corresponder a uma posição na tela virtual.
 * @param {number} width
 * @param {number} height
 * @param {string} canvasElementId  
 */
function AttachInput(width, height, canvasElementId){
    let el = document.getElementById(canvasElementId)
    if(!el){
        throw "Elemento não existe"   
    }
    if(! (el instanceof HTMLCanvasElement)){
        throw "Elemento não é um canvas"
    }
    input.width = width
    input.height = height

    input.canvasElement = el

    input.canvasElement.addEventListener("mousemove", ev =>{
        input.oldMouseX = input.mouseX
        input.oldMouseY = input.mouseY

        /** @ts-expect-error */
        const rect = input.canvasElement.getBoundingClientRect()

        input.mouseX = (ev.clientX - rect.left)/(rect.width)*input.width | 0
        input.mouseY = (ev.clientY - rect.top)/(rect.height)*input.height | 0
    })

    input.canvasElement.addEventListener("mousedown", ev =>{
        ev.preventDefault()
        input.mouseDown[ ev.button ] = true
    })
    input.canvasElement.addEventListener("mouseup", ev =>{
        ev.preventDefault()
        input.mouseDown[ ev.button ] = false
    })
}


/**
 * @typedef {Object} ScreenTouch
 * @property {number} x
 * @property {number} y
 * @property {number} n
 */

/**
 * @param {Touch} touch 
 * @returns {ScreenTouch} 
 */
function toScreenTouch( touch ){
    const rect = input.canvasElement?.getBoundingClientRect()
    return {
        // @ts-expect-error
        x : (touch.clientX - rect.left)/(rect.width)*input.width | 0,
        // @ts-expect-error
        y : (touch.clientY - rect.top)/(rect.height)*input.height | 0,
        n : touch.identifier
    }
}


/**
 * 
 * @param {function(ScreenTouch[]):void} handler 
 * @returns 
 */
function toTouchHandler(handler){
    return (/**@type {TouchEvent} */ ev) => {
        let touches = []        
        for(let i =0; i < ev.touches.length;i++){
            touches.push( toScreenTouch(ev.touches[i]) )
        }
        handler(touches)
    }
}

/**
 * COPICOLA!
 * @param {function(ScreenTouch[]):void} handler 
 * @returns 
 */
function toTouchEndHandler(handler){
    return (/**@type {TouchEvent} */ ev) => {
        let touches = []        
        for(let i =0; i < ev.changedTouches.length;i++){
            touches.push( toScreenTouch(ev.changedTouches[i]) )
        }
        handler(touches)
    }
}

/**
 * @param {function(ScreenTouch[]):void} handler
 * @returns {function(TouchEvent):void}
 */
function OnTouchStart( handler ){
    const touchHandler = toTouchHandler( handler )
    input.canvasElement?.addEventListener( "touchstart", touchHandler)

    input.currentListeners.push( {event: "touchstart", handler: touchHandler } )
    return touchHandler
}
/**
 * @param {function(ScreenTouch[]):void} handler
 * @returns {function(TouchEvent):void}
 */
function OnTouchMove( handler ){
    const touchHandler = toTouchHandler( handler )
    input.canvasElement?.addEventListener( "touchmove", touchHandler)

    input.currentListeners.push( {event: "touchmove", handler: touchHandler } )
    return touchHandler
}
/**
 * @param {function(ScreenTouch[]):void} handler
 * @returns {function(TouchEvent):void}
 */
function OnTouchEnd( handler ){
    const touchHandler = toTouchEndHandler( handler )
    input.canvasElement?.addEventListener( "touchend", touchHandler)

    input.currentListeners.push( {event: "touchend", handler: touchHandler } )
    return touchHandler
}

/**
 * @param {{ (event: TouchEvent): void; (this: HTMLCanvasElement, ev: TouchEvent): any; }} handler
 */
function ClearTouchStart( handler ){
    input.canvasElement?.removeEventListener("touchstart",handler)
}
/**
 * @param {{ (event: TouchEvent): void; (this: HTMLCanvasElement, ev: TouchEvent): any; }} handler
 */
function ClearTouchMove( handler ){
    input.canvasElement?.removeEventListener("touchmove",handler)
}
/**
 * @param {{ (event: TouchEvent): void; (this: HTMLCanvasElement, ev: TouchEvent): any; }} handler
 */
function ClearTouchEnd( handler ){
    input.canvasElement?.removeEventListener("touchend",handler)
}

function ClearAll(){
    for(let l of input.currentListeners){
        /** @ts-expect-error */
        input.canvasElement?.removeEventListener( l.event, l.handler )
    }
}


function MouseX(){
    return input.mouseX
}

function MouseY(){
    return input.mouseY
}

function MouseSpeedX(){
    return input.mouseX - input.oldMouseX
}

function MouseSpeedY(){
    return input.mouseY - input.oldMouseY
}

function MouseDown(mb){
    return input.mouseDown[mb]
}

export {
    AttachInput,
    MouseX,
    MouseY,
    MouseSpeedX,
    MouseSpeedY,
    MouseDown,

    OnTouchStart,
    OnTouchMove,
    OnTouchEnd,

    ClearTouchStart,
    ClearTouchMove,
    ClearTouchEnd,

    ClearAll
}