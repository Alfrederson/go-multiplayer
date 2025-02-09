import { GameState } from "../../game_state";
import { rectsIntersect } from "../util";

/**
 * Sensor é um trigger que é acionado por uma
 * entidade específica ou lista de entidades.
 * Por enquanto é assim, depois vou implementar o grid
 * de objetos pra poder criar interações com todos eles.
 */


/**
 * @typedef {function():void} SensorHandler
 */

/**
 * @typedef {Object} SensorParams
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 * @property {import("../interfaces").ICollider} target
 * @property {SensorHandler} [onEnter]
 * @property {SensorHandler} [onExit]
 */

class Sensor{
    dead = false
    x = 0
    y = 0
    width = 0
    height = 0

    rect = [0,0,0,0]

    /** @type {import("../interfaces").ICollider} */
    target

    wasTriggered = false
    isTriggered = false

    /** @type {SensorHandler|null}*/
    enterHandler = null

    /** @type {SensorHandler|null}*/
    exitHandler = null
    
    /**
     * 
     * @param {SensorParams} params 
     */
    constructor(params){
        const {x,y,width,height, target, onEnter, onExit} = params
        this.rect = [x,y,width,height]

        this.target = target
        onEnter && (this.enterHandler = onEnter)
        onExit && (this.exitHandler = onExit)
    }

    /**
     * @param {import("../interfaces").ICollider} target 
     * @param {SensorHandler} handler 
     */
    onEnter(target, handler ){
        this.target = target
        this.enterHandler = handler
    }

    /**
     * @param {import("../interfaces").ICollider} target 
     * @param {SensorHandler} handler 
     */
    onExit( target, handler ){
        this.target = target
        this.enterHandler = handler
    }

    /**
     * @param {GameState} s 
     */
    update(s){
        if(this.isTriggered)
            return

        // vê se o target tocou aqui.
        let out = [0,0,0,0]
        let targetRect = [0,0,0,0]
        this.target.getRect(targetRect)

        if( rectsIntersect( this.rect, targetRect, out ) ){
            this.isTriggered = true
            this.enterHandler && this.enterHandler()
            this.dead = true
        }
    }
}

export {
    Sensor
}