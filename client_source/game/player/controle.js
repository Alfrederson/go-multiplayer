import { OnTouchEnd, OnTouchMove, OnTouchStart, ClearAll } from "../../blitz/input";
import { Player } from "./player";
import { Nub } from "../nub";
import { GameState } from "../../game_state";

const NUB_SIZE = 64


/**
 * @param {GameState} state 
 * @param {Player} player 
 */
function ControlarPlayer(state, player) {
    let using_touch = false
    let nub_walk = new Nub(state.screen.width - NUB_SIZE*0.5, state.screen.height * 0.85 + NUB_SIZE/2)

    // Remove todos os event handleus
    ClearAll()

    const nubs = [nub_walk]
    // gatinho começa a andar
    OnTouchStart(touches => {
        using_touch = true

        for (let i = 0; i < touches.length; i++) {
            let { x, y, n } = touches[i];
            for (let nub of nubs) {
                if (nub.touching(x, y)) {
                    nub.press(x, y, n)
                    continue
                }
            }
        }
    })

    OnTouchMove(touches => {
        for (let i = 0; i < touches.length; i++) {
            // direção do gatinho
            let { x, y, n } = touches[i]
            // pulo
            if (n == nub_walk.touch) {
                nub_walk.move(x, y)
            }
        }
    })

    OnTouchEnd(touches => {
        for (let i = 0; i < touches.length; i++) {
            for (let nub of nubs) {
                if (touches[i].n == nub.touch) {
                    nub.release()
                }
            }
        }
    })

    nub_walk.update = function(){
        if(!using_touch)
            return
        player.sx = nub_walk.getX()*2
        player.sy = nub_walk.getY()*2
    }

    const keys = {}
    document.addEventListener("keydown",event=>{
        using_touch=false
        keys[event.key] = true
    })
    document.addEventListener("keyup",event=>{
        keys[event.key] = false
    })

    state.spawn( {
        dead : false,
        update : function(){
            let sx = 0
            let sy = 0
            if(keys["w"]) sy -=2
            if(keys["s"]) sy += 2
            if(keys["a"]) sx -=2
            if(keys["d"]) sx += 2
            player.sx = sx
            player.sy = sy
        },
        render : function(){

        }
    })

    state.spawn( nub_walk )
}

export { 
    ControlarPlayer
}