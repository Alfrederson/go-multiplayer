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
const WIDTH = 16
const HEIGHT = 16
const MARGIN_X = (FRAME_WIDTH-WIDTH)/2
const MARGIN_Y = (FRAME_HEIGHT-HEIGHT)

class Player {    
    x = 128
    y = 64

    dead = false

    sx = 0
    sy = 0

    walking = false
    direction = 0

    anim_walk = new Animation({frameDelay: 10, frameCount: 3, baseFrame: 0, type: ANIMATION_PING_PONG})

    /**
     * @param {number[]} rect
     */
    getRect(rect){
        rect[0] = this.x
        rect[1] = this.y
        rect[2] = WIDTH
        rect[3] = HEIGHT
    }

    /**
     * @param {GameState} s
     */
    update (s){
        let out = [0,0,0,0]
        this.sy = constrain(this.sy, -4,4)
        this.y += this.sy 
        if(s.tileMap.objectCollides(
            this,
            out,
            1337
        )!==-1){
            this.sy = 0
            this.y += out[1]+out[3]/2 > this.y+HEIGHT/2 ? -out[3] : out[3]
        }
        this.sx = constrain(this.sx, -4,4)
        this.x += this.sx
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
                if(this.sy > 0){
                    this.direction = 2
                }else{
                    this.direction = 0
                }
            }else{
                if(this.sx > 0){
                    this.direction = 1
                }else{
                    this.direction = 3
                }
            }
        }else{
            this.walking=false
        }
        this.anim_walk.update()
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