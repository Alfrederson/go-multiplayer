import { 
    IB2D,
    Preload
} from "../../blitz/blitz.js";
import {Animation, ANIMATION_PING_PONG} from "../animation.js"
import { GameState } from "../../game_state.js"
import { constrain } from "../util.js";


export class BlankNPC {
    /**
     * @param {GameState} s
     * @param {number} deltaTime
     */
    update (s,deltaTime){
    }
    /**
     * @param {IB2D} b
     * @param {GameState} s
     */
    render(b,s){
        // const frame = this.walking ? this.anim_walk.frame + this.direction*3 : this.direction*3+1
        // b.DrawImageFrame(this.sprite ?? anonimo,
        //     this.x - MARGIN_X,
        //     this.y - MARGIN_Y,
        //     frame
        // )
    }
}