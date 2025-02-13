import { make } from "../../../blitz/blitz";
import { GameState } from "../../../game_state";
import { Player } from "../../player/player";
import { ControlarPlayer } from "../../player/controle";

import mapa from "./cidade"

/*
    Load recebe um gamestate que pode ser manipulado à vontade.
*/

/**
 * @param {GameState} state 
 */
function Load(state){
    state.reset()
    state.tileMap.FromTiled(mapa)
    let player = make( new Player(), { x: 8*16, y: 10*16})
    state.spawn(
        player
    )
    state.setTarget( player )
    ControlarPlayer( state, player )    
} 

export {
    Load
}