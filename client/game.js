import { cena } from "./scene.js"

function _int8(num){
    return num & 0xFF
}

function _int16(num) {
    const buffer = new Uint8Array(2);
    buffer[0] = (num >> 8) & 0xFF;
    buffer[1] = num & 0xFF;       
    return buffer;
}


function _get_int16(array, position){
    return (array[position] << 8) | (array[position+1])
}


const debug = document.getElementById("debug")
if(!debug)
    throw "onde está o elemento debug?"
if(!(debug instanceof HTMLDivElement))
    throw "debug não é um DIV"

const tela = document.getElementById("tela")
if(!tela)
    throw "onde está o elemento tela?"
if(!(tela instanceof HTMLCanvasElement))
    throw "tela não é um CANVAS"


class Conexao {
    #socket
    #heartBeat

    #sender    
    #listener
    #reconnectTimeout = 0

    #myClientId = -1

    clientId(){
        return this.#myClientId
    }

    /**
     * 
     * @param {(arg0: WebSocket)=>void} func 
     */
    setSender(func){
        this.#sender = func
    }

    /**
     * 
     * @param {(arg0:Uint8Array)=>void} func 
     */
    setListener(func){
        this.#listener = func   
    }

    /**
     * 
     * @param {{tela : HTMLDivElement}} param0 
     */
    conectar({tela}){
        if(!tela)
            throw "cade a tela?"

        this.#myClientId = -1

        const socket = new WebSocket("ws://localhost:8080/server")
        this.#socket = socket

        
        socket.addEventListener("open", event =>{
            tela.innerText = "conectado!"
            this.#heartBeat = setInterval(()=>{
                if(socket.readyState !== WebSocket.OPEN){
                    return
                }
                if(this.#sender){
                    this.#sender(socket)
                }
            },100)
        })

        socket.addEventListener("message", async event =>{
            if(this.#listener){
                const ab = await event.data.arrayBuffer()
                const bytes = new Uint8Array(ab)

                if(bytes[0] == SERVER.SEND.SET_ID){
                    console.log("servidor definiu meu ID.")
                    this.#myClientId = _get_int16(bytes,1)
                }

                this.#listener(bytes)
            }
        })

        socket.addEventListener("error", error =>{
            tela.innerText = `erro no websocket: ${error}.`
            clearInterval(this.#heartBeat)
        })

        socket.addEventListener("close", event =>{
            tela.innerText = "desconectado"
        })


    }
}
const SERVER = {
    SEND :{
        SET_ID : 0x01
    }
}
const PLAYER = {
    JOINED : 0x02,
    EXITED : 0x03,
    STATUS : 0x04
}

debug.innerText = "let the games begin"

class Player{
    id = 0
    x = 0
    y = 0
    last_x = 0
    last_y = 0
    last_update_time = performance.now()
    moved = false
    didnt_move_count = 0
    must_send_status = false
}

/**
 * @type {Map<number,Player>}
 */
const players = new Map()

/** @type {Player?} */
let my_player = null

let c = new Conexao()


// faz um canvas pra desenhar as coisas
let ctx = tela.getContext("2d")
if(!ctx)
    throw "tela não tem context"

const keys = {}

document.addEventListener("keydown", event =>{
    keys[event.key] = true
})

document.addEventListener("keyup", event =>{
    keys[event.key] = false
})

/**
 * 
 * @param {CanvasRenderingContext2D} ctx 
 */
function gameLoop(ctx){
    // cls
    ctx.clearRect(0,0,640,480)

    Object.entries(players).forEach(([key,player]) => {
        if(!player)
            return
        const now = performance.now()
        if(player == my_player){
            player.moved=false
            if(keys["w"]){
                player.moved = true
                player.y -=1
            }
            if(keys["s"]){
                player.moved = true
                player.y +=1
            }
            if(keys["a"]){
                player.moved = true
                player.x -=1
            }
            if(keys["d"]){
                player.moved = true
                player.x +=1
            }
            if(!player.moved){
                player.didnt_move_count++
                if(player.didnt_move_count==5){
                    player.must_send_status=true
                    player.didnt_move_count=0
                }
            }
            ctx.fillStyle = "red"
            ctx.fillRect(player.x, player.y, 32, 32)            
        }else{
            ctx.fillStyle = "green"
            const elapsed = now - player.last_update_time
            const progress = Math.min(elapsed/100,1)
            ctx.fillRect(
                player.last_x + (player.x-player.last_x) * progress, 
                player.last_y + (player.y-player.last_y) * progress, 32, 32
            )
        }
    })

    // quando foi que o outro jogador enviou a localização pela última vez?
    requestAnimationFrame(()=>{
        gameLoop(ctx)
    })
}


console.log("começando a imagem")
gameLoop(ctx)

c.setListener( message =>{ 
    switch(message[0]){
        case SERVER.SEND.SET_ID :{
            let player_id = _get_int16(message,1)
            console.log("meu novo id: ",player_id)
            my_player = new Player()
            my_player.x = Math.random() * 400
            my_player.y = Math.random() * 400

            players[player_id] = my_player
        }break;

        case PLAYER.EXITED: {
            let player_id = _get_int16(message,1)
            players[player_id] = null
        }break;

        case PLAYER.STATUS :{
            let player_id = _get_int16(message,1)
            let player_x = _get_int16(message,3)
            let player_y = _get_int16(message,5)
            console.log(player_id,player_x,player_y)
            if(player_id == c.clientId()){
                console.log("wtf?")
            }else{
                let player
                if(players[player_id]){
                    player = players[player_id]
                }else{
                    player = new Player()
                    player.x = player_x
                    player.y = player_y
                    players[player_id] = player
                }
                player.last_x = player.x
                player.last_y = player.y
                player.x = player_x
                player.y = player_y
                player.last_update_time = performance.now()
            }
        }break;
    }
})

c.setSender( socket =>{
    if(socket.readyState !== WebSocket.OPEN){
        return
    }
    // envia a posição do jogador e estado de animação, etc.

    if(my_player){
        if(my_player.moved || my_player.must_send_status ){
            socket.send(new Uint8Array([
                PLAYER.STATUS,
                0,
                0,
                ..._int16(my_player.x),
                ..._int16(my_player.y)
            ]))
        }
    }
})

c.conectar({
    tela : debug
})

//cena(tela)

