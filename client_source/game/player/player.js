import { 
    IB2D,
    Preload
} from "../../blitz/blitz.js";
import {Animation, ANIMATION_PING_PONG} from "../animation.js"
import { GameState } from "../../game_state.js"
import { constrain } from "../util.js";


let sprite

Preload( async b =>{
    sprite = await b.LoadAnimImage("char.png",24,32)
})

const FRAME_WIDTH = 24
const FRAME_HEIGHT = 32
const WIDTH = 14
const HEIGHT = 14
const MARGIN_X = (FRAME_WIDTH-WIDTH)/2
const MARGIN_Y = (FRAME_HEIGHT-HEIGHT)

const DIR_UP = 0
const DIR_RIGHT = 1
const DIR_DOWN = 2
const DIR_LEFT = 3

class Player {    
    x = 128
    y = 64

    dead = false

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
    /**
     * 
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

    remoteGoTo(x,y){
        // personagem acabou de ser spawnado
        // isso evita que ele apareça voando no mapa quando sai do mapa eu acho
        const never_seen_before = this.last_position_update_time < 0
        this.last_position_update_time = performance.now()

        this.oldX = this.x
        this.oldY = this.y

        this.newX = x
        this.newY = y
        if(never_seen_before){
            this.x = x
            this.y = y
        }
    }

    TurnOnRemoteControl(){
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
        let frame = this.walking ? this.anim_walk.frame + this.direction*3 : this.direction*3+1
        b.DrawImageFrame(sprite,
            this.x - MARGIN_X,
            this.y - MARGIN_Y,
            frame
        )
    }

}

export { Player }