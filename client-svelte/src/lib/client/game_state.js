import {
    IB2D,
    make,
} from "./blitz/blitz.js"

import { GameMap } from "./game/game_map.js"
import { ControlarPlayer } from "./game/player/controle.js"
import { DIR_DOWN, Player } from "./game/player/player.js"
import { constrain } from "./game/util.js"

import * as messages from "./game/client/messages.js"
import * as util from "./game/client/util.js"

import Stack from "./stack.js"
import { Message } from "./game/client/client.js"
import { chat_message, debug_text } from "./main.js"


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
    /** @type {Player | undefined} */
    player
    current_map = ""

    screen = {
        width : 0,
        height : 0,

        cameraX : 0,
        cameraY : 0,

        /** @type {IPosition} */
        target : {x:0,y:0}
    }

    // jogador pediu para entrar em um portal
    target_zone = ""    
    constrainCamera(){
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
    /**
     * @param {number} x
     * @param {number} y
     */
    snapTo(x,y){
        this.screen.cameraX = x - this.screen.width/2 
        this.screen.cameraY = y - this.screen.height/2
        this.constrainCamera()
    }
    /**
     * faz a camera olhar para uma posição
     * @param {number} x
     * @param {number} y
     */
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
        this.constrainCamera()
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
        return this
    }

    /** @param {IGameThing} what */
    kill(what) {
        what.dead = true
    }

    /** @param {IPosition} target */
    setTarget( target ){
        this.screen.target = target
        return this
    }

    /**
     * deltaTime é quanto tempo o último frame durou em segundos
     * @param {number} deltaTime 
     */
    update(deltaTime) {
        if(this.screen.target){
            this.lookAt(this.screen.target.x, this.screen.target.y)
        }

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
        b.SetColor(1,1,1,1)

        if(!this.tileMap.loaded){
            return
        }

        b.SetCamera(this.screen.cameraX|0, this.screen.cameraY|0)
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

    /** @type {import("./game/client/client.js").Client|undefined} */
    game_client

    /**
     * handler para quando o cliente estiver conectado
     * @param {import("./game/client/client.js").Client} client 
     */
    connected(client){
        this.game_client = client
        let sitting_still = 0


        let interval = setInterval(()=>{
            if(!this.game_client){
                console.log("sem game client. desativando o interval.")
                clearInterval(interval)
                return
            }
            if(this.player){
                if(this.target_map){
                    const msg = Message.Empty()
                    msg.put_i8(messages.PLAYER.ENTER_MAP)
                       .put_i16(0)
                       .put_short_string(this.target_map)
                       .put_short_string(this.target_zone)
                    this.game_client.send(msg.construct())
                    this.target_map = ""
                    return
                }

                let will_send_status=false                
                if(this.player.walking){
                    will_send_status=true
                    sitting_still=0
                }else{
                    sitting_still++
                    if(sitting_still > 10){
                        sitting_still = 0
                        will_send_status=true
                    }
                }
                if( will_send_status ){
                    will_send_status=false
                    const msg = Message.Empty()
                    msg.put_i8(messages.PLAYER.STATUS)
                       .put_i16(0)
                       .put_i16(this.player.x)
                       .put_i16(this.player.y)
                    if(!client.send(msg.construct())){
                        clearInterval(interval)
                    }        
                }
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

    /** método acionado localmente, indicando que esse jogador quer
     * trocar de mapa!
     * aqui e agora a gente está especificando a target_zone, mas como
     * o servidor sabe qual é a target_zone de cada portal, a gente na verdade
     * vai ter que enviar só o nome do portal *nesse mapa* que foi acionado.
     * @param {string} map_name
     * @param {string} target_zone
     */
    playerEnterPortal(map_name,target_zone){
        debug_text("entering "+map_name+"...")
        this.target_zone = target_zone
        this.target_map = map_name
    }

    /**
     * @param {string} string
     */
    sendChat(string){
        if(!this.game_client){
            throw "sem game client"
        }
        const msg = Message.Empty()
        msg.put_i8(messages.PLAYER.CHAT)
        msg.put_i16(0)
        msg.put_short_string(string)
        this.game_client.send(msg.construct())
    }

    /**
     *  @typedef {Object} TeleportParam
     *  @property {number} [x]
     *  @property {number} [y]
     *  @property {string} [zone]
     */

    /**
     * método acionado por uma mensagem do servidor
     * @param {string} map_name 
     * @param {TeleportParam} target 
     */
    teleportPlayerTo(map_name, target ){
        const {x,y,zone} = target
        debug_text(`indo para ${map_name} ${x} ${y}`)
        let exit_dir = this.player ? this.player.direction : DIR_DOWN
        return this.tileMap.loadFromServer(map_name).then( ()=>{
            this._scene.reset()
            this._alives.reset()
            this._other_clients.clear()
                let pos_x,pos_y
            // OBS: remover esse conceito de target_zone porque o 
            // servidor sempre vai mandar o x e y correto
            if(zone){
                [pos_x,pos_y] = this.tileMap.pickPlaceInZone([14,14],zone)                
            }else{
                pos_x = x
                pos_y = y
            }

            this.current_map = map_name
            this.player = make(new Player(),{x : pos_x,y : pos_y,})
            
            // sensores
            this.tileMap.sensors.forEach( x => {
                x.setTarget( this.player )
                x.setOnEnter(  ()=> this.playerEnterPortal(x.to_map,x.to_zone) )
                this.spawn( x )
            })
            // jogador
            this.spawn(this.player)
                .setTarget(this.player)
                .snapTo(this.player.x,this.player.y)

            this.player.direction=exit_dir
            ControlarPlayer(this,this.player)    
        })
    }

    /**
     * @param {Message} msg
     */
    msg_player_vital(msg){
        if(!this.player){
            return
        }
        const energy = msg.take_i8(),
              hunger = msg.take_i8(),
              thirst = msg.take_i8(),
              health = msg.take_i8()
        this.player.setVital({
            hunger,thirst,energy,health
        })  
    }

    /**
     * @param {Message} msg
     */
    msg_player_set_map(msg){
        const map_name = msg.take_short_string(),
              dest_x = msg.take_i16(), 
              dest_y = msg.take_i16()    
        this.teleportPlayerTo(map_name,{x:dest_x,y:dest_y})        
    }
    /**
     * @param {Uint8Array} message 
     */
    listener(message){
        const msg = Message.FromBytes(message)
        const msg_byte = msg.take_i8()
        let my_id = 0
        switch(msg_byte){
            // mensagens de servidor
            case messages.SERVER.SET_ID:{
                my_id = msg.take_i16()
                debug_text("eu sou "+my_id)
            }break;
            // um jogador entrou
            case messages.SERVER.PLAYER.JOINED:{
                const player_id = msg.take_i16()
                debug_text("jogador "+player_id+" entrou")
            }break;
            // um jogador saiu
            case messages.SERVER.PLAYER.EXITED:{
                const player_id = msg.take_i16()
                const other_player = this._other_clients.get(player_id)
                if(other_player){
                    other_player.dead=true
                }                
                this._other_clients.delete(player_id)
            }break;
            // servidor quer me colocar em um mapa
            // OBS: acho que o servidor não vai mandar essa mensagem!
            case messages.SERVER.PLAYER.SET_MAP:{
                this.msg_player_set_map(msg)
            }break;
            case messages.SERVER.PLAYER.VITAL:{
                this.msg_player_vital(msg)                              
            }break;
            // será que é melhor fazer isso ou ter mensagens separadas
            // para o estado e posição?
            case messages.SERVER.PLAYER.FULL_STATUS:{
                // perfil
                const name = msg.take_short_string()
                const handle = msg.take_short_string()
                const sprite = msg.take_short_string()

                // status
                //------------------------
                // PlayerStatus
                //------------------------
                const ghost = msg.take_bool()
                const current_map = msg.take_short_string()
                const x = msg.take_i32()
                const y = msg.take_i32()
                const energy = msg.take_i8()
                const hunger = msg.take_i8()
                const thirst = msg.take_i8()
                const health = msg.take_i8()
                const equipped_id = msg.take_i16()
                const balance = msg.take_i32()

                // bag
                const bag_max_weight = msg.take_i16()
                const bag_current_weight = msg.take_i16()
                const bag_max_item_count = msg.take_i16()
                const bag_item_count = msg.take_i16()
                /**
                 * @type {string[]}
                 */
                const bag_items = []
                for(let i =0; i < bag_item_count;i++){
                    bag_items.push( msg.take_short_string())
                }

                this.teleportPlayerTo(current_map,{x,y}).then( ()=>{
                    if(!this.player){
                        throw "o jogador foi desmaterializado!"
                    }
                    this.player.setProfile({
                        name : name,
                        handle : handle,
                        sprite : sprite
                    })
                    this.player.setBag({
                        max_weight : bag_max_weight,
                        current_weight : bag_current_weight,
                        max_item_count : bag_max_item_count,
                        items : bag_items
                    })  
                    this.player.setStatus({
                        hunger,thirst,energy,balance,ghost,equipped_id,health
                    })                                      
                })

            }break;
            // ------------------------------------------------------------------
            // mensagens de jogador
            // ------------------------------------------------------------------
            case messages.PLAYER.STATUS:{
                const player_id = msg.take_i16(),
                      player_x = msg.take_i16(),
                      player_y = msg.take_i16()
                let other_player = this._other_clients.get(player_id)
                if(!other_player){
                    other_player = make(new Player(), {x : player_x, y: player_y})
                    this._other_clients.set(player_id,other_player)

                    other_player.turnOnRemoteControl()
                    this.spawn(other_player)
                }
                other_player.remoteGoTo(player_x,player_y)
            }break;
            case messages.PLAYER.CHAT:{
                const from_player = msg.take_i16()
                const text = msg.take_short_string()
                chat_message(`player${from_player}:${text}`)
            }break;
        }
    }
}

export { GameState }