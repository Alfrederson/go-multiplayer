import {
    IB2D,
    make,
} from "./blitz/blitz.js"

import { GameMap } from "./game/game_map.js"
import { ControlarPlayer } from "./game/player/controle.js"
import { Player } from "./game/player/player.js"
import { constrain } from "./game/util.js"

import * as messages from "./game/client/messages.js"
import * as util from "./game/client/util.js"

import Stack from "./stack.js"

const MAX_THINGS = 500

// Isso aqui não é coisa de framework não. É 100% lógica do jogo.
// Isso aqui não é GODOT não que te obriga a pensar do jeito que o framework quer.

/**
 * @typedef {function(GameState,number):void} UpdateMethod
 * @typedef {function(IB2D, GameState): void} RenderMethod
 */

/**
 * @typedef {Object} IPosition
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {Object} IGameThing
 * @property {boolean} dead - se for verdadeiro, vai remover o objeto.
 * @property {UpdateMethod} update - Atualiza.
 * @property {RenderMethod} [renderUi] - Se ele desenha coisa na UI, definir esse método.
 * @property {RenderMethod} [render] - Renderiza.
 */

class GameState {

    

    screen = {
        width : 0,
        height : 0,

        cameraX : 0,
        cameraY : 0,

        /** @type {IPosition} */
        target : {x:0,y:0}
    }

    // faz a "câmera" olhar pra uma posição x/y no espaço.
    lookAt(x,y){
        let dx = x - this.screen.cameraX - this.screen.width/2
        let dy = y - this.screen.cameraY - this.screen.height/2
        if (Math.abs(dx) <= 1){
            this.screen.cameraX = x - this.screen.width/2
        }else{
            this.screen.cameraX += dx / 10
        }
        if (Math.abs(dy) <= 1){
            this.screen.cameraY = y - this.screen.height/2
        }else{
            this.screen.cameraY += dy / 10
        }
        this.screen.cameraX = constrain(
            this.screen.cameraX,
            0,
            this.tileMap.width*16 - this.screen.width
        )
        this.screen.cameraY = constrain(
            this.screen.cameraY,
            0,
            this.tileMap.height*16 - this.screen.height
        )
    }

    tileMap = new GameMap()

    /** @type {Map<number,Player>} */
    _other_clients = new Map()

    /** @type {Stack<IGameThing>} */
    _scene = new Stack(MAX_THINGS)

    /** @type {Stack<IGameThing>} */
    _alives = new Stack(MAX_THINGS)

    reset(){
        this._alives.reset()
        this._scene.reset()
    }

    /** @param {IGameThing} what */
    spawn(what) {
        this._alives.push(what)
    }

    /** @param {IGameThing} what */
    kill(what) {
        what.dead = true
    }

    /** @param {IPosition} target */
    setTarget( target ){
        this.screen.target = target
        this.screen.cameraX = target.x
        this.screen.cameraY = target.y
    }

    /**
     * deltaTime é quanto tempo o último frame durou em segundos
     * @param {number} deltaTime 
     */
    update(deltaTime) {
        // loop through all the objects in the scene stack updating them
        for (let i = 0; i < this._scene.top; i++) {
            let obj = this._scene.at(i)
            if (!obj)
                continue

            obj.update && obj.update(this, deltaTime)

            // this is still alive...
            if (!obj.dead) {
                this._alives.push(obj)
            } else {
                this._scene.forget(i)
            }
        }

        // lookat
        if(this.screen.target){
            this.lookAt(this.screen.target.x, this.screen.target.y)
        }

        // troca as pilhas
        let tmp = this._scene
        this._scene = this._alives
        this._alives = tmp
        this._alives.reset()
    }

    /**
     * @param {IB2D} b 
     */
    render(b) {
        b.Cls(152, 34, 137)
        b.SetCamera(this.screen.cameraX, this.screen.cameraY)
        this.tileMap.render(b,this,0) 
        for (let i = 0; i < this._scene.top; i++) {
            let obj = this._scene.at(i)
            obj.render && obj.render(b,this)
        }
        this.tileMap.render(b,this,1) 
        b.SetCamera(0,0)
        for (let i = 0; i < this._scene.top; i++) {
            let obj = this._scene.at(i)
            obj.renderUi && obj.renderUi(b,this)
        }
    }

    messageText=""
    messageTimer=0

    // coisas do client
    /**
     * 
     * @param {import("./game/client/client.js").Client} client 
     */
    connected(client){
        this.tileMap.LoadFromServer("cidade")
        const player = make(
            new Player(),{x: 8 * 16, y: 10*16}
        )
        this.spawn(player)
        this.setTarget(player)
        ControlarPlayer(this,player)


        const SIZE_MSG = 1
        const SIZE_ID = 2
        const SIZE_POS_X = 2
        const SIZE_POS_Y = 2

        // todo: dar um jeito de essa porqueira ficar assim:
        // client.send(message.PLAYER.STATUS, i16(0), i16(player.x), i16(player.y))
        // ou
        // client.player.status(player.x,player.y)
        // ou
        // client.player.status(player)

        let interval = setInterval(()=>{
            const message = new Uint8Array(SIZE_MSG+SIZE_ID+SIZE_POS_X+SIZE_POS_Y)
            util.put_int8(messages.PLAYER.STATUS,message,0)
            util.put_int16(player.x,message,3)
            util.put_int16(player.y,message,5)
            if(!client.send(message)){
                clearInterval(interval)
            }
        },100)
    }

    disconnected(){
        this._scene.reset()
        this._alives.reset()
        this._other_clients.clear()
    }

    error(error){
        this._scene.reset()
        this._alives.reset()
        this._other_clients.clear()
    }

    /**
     * @param {Uint8Array} message 
     */
    listener(message){
        const player_id = util.get_int16(message,1)
        switch(message[0]){
            case messages.SERVER.PLAYER.EXITED:{
                const other_player = this._other_clients.get(player_id)
                if(other_player){
                    other_player.dead=true
                }                
                this._other_clients.delete(player_id)
            }break;
            case messages.PLAYER.STATUS:{
                const player_x = util.get_int16(message,3)
                const player_y = util.get_int16(message,5)
                let other_player = this._other_clients.get(player_id) 

                if(!other_player){
                    other_player = make(new Player(), {x : player_x, y: player_y})
                    this._other_clients.set(player_id,other_player)

                    other_player.TurnOnRemoteControl()
                    this.spawn(other_player)

                }
                other_player.remoteGoTo(player_x,player_y)
            }break;
        }
    }
}

export { GameState }