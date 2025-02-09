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
    let nubWalk = new Nub(state.screen.width - NUB_SIZE*0.5, state.screen.height * 0.85 + NUB_SIZE/2)

    // Remove todos os event handleus
    ClearAll()

    const nubs = [nubWalk]
    // gatinho começa a andar
    OnTouchStart(touches => {
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
            if (n == nubWalk.touch) {
                nubWalk.move(x, y)
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

    nubWalk.update = function(){
        player.sx = nubWalk.getX()
        player.sy = nubWalk.getY()
    }

    state.spawn( nubWalk )
}

export { 
    ControlarPlayer
}