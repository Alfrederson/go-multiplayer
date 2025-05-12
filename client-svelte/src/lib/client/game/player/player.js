import { 
    IB2D,
    Preload
} from "../../blitz/blitz.js";
import {Animation, ANIMATION_PING_PONG} from "../animation.js"
import { GameState } from "../../game_state.js"
import { constrain } from "../util.js";
import { player_store } from "./player.store.js";


/**
 * @type {import("../../blitz/blitz.js").IImage}
 */
let anonimo

/** @type {Map<string,import("../../blitz/blitz.js").IImage>} */
const sprite_map = new Map()

Preload( async b =>{
    anonimo = await b.LoadAnimImage("char.png",24,32)

    // carregar vários tipos de sprite...
})

const FRAME_WIDTH = 24
const FRAME_HEIGHT = 32
const WIDTH = 14
const HEIGHT = 14
const MARGIN_X = (FRAME_WIDTH-WIDTH)/2
const MARGIN_Y = (FRAME_HEIGHT-HEIGHT)

export const DIR_UP = 0
export const DIR_RIGHT = 1
export const DIR_DOWN = 2
export const DIR_LEFT = 3



class Player {    
    x = 128
    y = 64

    dead = false
    hidden = false

    sx = 0
    sy = 0

    walking = false
    direction = 0

    anim_walk = new Animation({frameDelay: 10, frameCount: 3, baseFrame: 0, type: ANIMATION_PING_PONG})

    // coisas do multiplayer
    last_position_update_time = -1
    oldX = 0
    oldY = 0
    newX = 0
    newY = 0

    name = ""
    handle = ""
    /** @type {import("../../blitz/blitz.js").IImage|undefined} */
    sprite

    /**
     * @param {number[]} rect
     */
    getRect(rect){
        rect[0] = this.x
        rect[1] = this.y
        rect[2] = WIDTH
        rect[3] = HEIGHT
    }

    // jogadores locais
    /**
     * 
     * @param {GameState} s 
     * @param {number} deltaTime 
     */
    controlLocal(s,deltaTime){
        let out = [0,0,0,0]

        this.sy = constrain(this.sy, -8,8)
        this.y += this.sy * deltaTime * 60;
        if(s.tileMap.objectCollides(
            this,
            out,
            1337
        )!==-1){
            this.sy = 0
            this.y += out[1]+out[3]/2 > this.y+HEIGHT/2 ? -out[3] : out[3]
        }

        this.sx = constrain(this.sx, -8,8)
        this.x += this.sx * deltaTime * 60;
        if(s.tileMap.objectCollides(
            this,
            out,
            1337
        )!==-1){
            this.sx = 0
            this.x += out[0]+out[2]/2 > this.x+WIDTH/2 ? -out[2] : out[2]
        }       

        if((Math.abs(this.sx) + Math.abs(this.sy)) >= 0.01){
            this.walking=true
            if(Math.abs(this.sy) > Math.abs(this.sx)){
                this.direction = this.sy > 0 ? 2 : 0
            }else{
                this.direction = this.sx > 0 ? 1 : 3
            }
        }else{
            this.walking=false
        }
        this.anim_walk.update()
    }

    // jogadores online
    // agente pode usar o mesmo esquema para controlar os animais
    /**
     * @param {GameState} s 
     * @param {number} deltaTime 
     */
    controlRemote(s,deltaTime){
        // interpolação pra ficar bunitim
        const now = performance.now()
        const elapsed = now - this.last_position_update_time
        const progress = Math.min(elapsed/100,1)
        this.x = this.oldX + (this.newX - this.oldX)*progress
        this.y = this.oldY + (this.newY - this.oldY)*progress
        this.sx = this.newX - this.oldX
        this.sy = this.newY - this.oldY
        if((Math.abs(this.sx) + Math.abs(this.sy)) >= 0.01){
            this.walking=true
            if(Math.abs(this.sy) > Math.abs(this.sx)){
                this.direction = this.sy > 0 ? DIR_DOWN : DIR_UP
            }else{
                this.direction = this.sx > 0 ? DIR_RIGHT : DIR_LEFT
            }
        }else{
            this.walking=false
        }
        this.anim_walk.update()
    }

    /**
     * @param {number} x
     * @param {number} y
     */
    remoteGoTo(x,y){
        // personagem acabou de ser spawnado
        // isso evita que ele apareça voando no mapa quando sai do mapa eu acho
        // obs: como o servidor não propaga a mensagem do outro jogador
        // se ele não estiver perto do meu, preciso dar um jeito de esconder
        // e des-esconder o personagem de forma imperceptível
        const never_seen_before = this.last_position_update_time < 0
        this.last_position_update_time = performance.now()
        this.oldX = this.x
        this.oldY = this.y
        this.newX = x
        this.newY = y
        if(never_seen_before){
            this.oldX = x
            this.oldY = y
            this.x = x
            this.y = y
        }
    }

    turnOnRemoteControl(){
        this.remoteControlled = true
    }

    /**
     * @param {GameState} s
     * @param {number} deltaTime
     */
    update (s,deltaTime){
        if(this.remoteControlled){
            this.controlRemote(s,deltaTime)
        }else{
            this.controlLocal(s,deltaTime)
        }
    }
    /**
     * @param {IB2D} b
     * @param {GameState} s
     */
    render(b,s){
        const frame = this.walking ? this.anim_walk.frame + this.direction*3 : this.direction*3+1
        b.DrawImageFrame(this.sprite ?? anonimo,
            this.x - MARGIN_X,
            this.y - MARGIN_Y,
            frame
        )
    }

    /** 
     * Preenche a mochila de acordo com a mensagem que é recebida do servidor.
     * @param {{
     * max_weight : number,
     * current_weight : number,
     * max_item_count : number,
     * items : string[]}} bag
     */
    setBag(bag){
        // não sei se é bom fazer isso ou se é melhor publicar um evento que faz sei lá
        // o que...
        player_store.update( s =>{
            s.bag = bag
            return s
        })
    }


    /**
     * atualiza os estados vitais
     * @param {{ hunger: number; thirst: number; energy: number; health:number }} status
     */
    setVital(status){
        player_store.update( s => {
            s.status.energy = status.energy
            s.status.hunger = status.hunger
            s.status.thirst = status.thirst
            s.status.health = status.health
            return s
        })
    }
    /**
     * @param {{
     *      balance: number; 
     *      ghost?: boolean;
     *      energy: number;
     *      equipped_id: number;
     *      hunger: number;
     *      thirst: number;
     *      health: number}} status
     */
    setStatus(status){
        player_store.update( s =>{
            s.status.equipped_id = status.equipped_id
            s.status.balance = status.balance
            s.status.energy = status.energy
            s.status.hunger = status.hunger
            s.status.thirst = status.thirst
            s.status.health = status.health
            return s
        })
    }

    /**
     * 
     * @param {{
     * name : string,
     * handle : string,
     * sprite : string}} profile 
     */
    setProfile(profile){
        this.name = profile.name
        this.handle = profile.handle
    }

}

export { Player }