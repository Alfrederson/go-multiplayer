// aqui a gente põe o cliente online

import { SERVER_URL } from "../../config.js"
import * as util from "./util.js"
import * as messages from "./messages.js"

export class Client {
    /** @type {WebSocket} */
    #socket
    
    #heartBeat

    /** @type {function(Uint8Array):void} */
    #listener
    #reconnectTimeout = 0

    #lastSentMessageTime = 0

    #myClientId = -1

    constructor(){
        console.log("cliente criado")
    }


    /**
     * conecta no servidor.
     * @param {string} url
     * @param {{
     *  listener: (Uint8Array) => void,
     *  connected: (arg0:Client)=> void,
     *  disconnected : ()=> void,
     *  error : ()=>void
     * }} 
     */
    connect(url, {listener,connected,disconnected,error}){
        this.#myClientId = -1
        
        this.#listener = listener
        const socket = new WebSocket(SERVER_URL)
        this.#socket = socket

        socket.addEventListener("open",event =>{
            if(connected){
                connected(this)
            }
            this.#heartBeat = setInterval(()=>{
                if(socket.readyState !== WebSocket.OPEN){
                    clearInterval(this.#heartBeat)
                    return
                }
                const now = performance.now()
                if(now >= (this.#lastSentMessageTime + 250)){
                    this.#socket.send(new Uint8Array([messages.PLAYER.HEART]))
                    this.#lastSentMessageTime = now
                }
            },125)
        })

        socket.addEventListener("message", async event =>{
            const ab = await event.data.arrayBuffer()
            const bytes = new Uint8Array(ab)
            if(bytes[0] == messages.SERVER.SET_ID){
                this.#myClientId = util.get_int16(bytes,1)
            }
            this.#listener(bytes)
        })

        socket.addEventListener("error", e =>{
            if(error){
                error()
            }
            clearInterval(this.#heartBeat)
            console.error(e)
            throw "erro de websocket"
        })

        socket.addEventListener("close",event =>{
            if(disconnected){
                disconnected()
            }
            clearInterval(this.#heartBeat)
            console.log("desconectado")
            throw "cliente desconectado"
        })
    }

    /**
     * 
     * @param {Uint8Array} data 
     * @returns {boolean} retorna false se o socket não estiver aberto.
     */
    send(data){
        if(!this.#socket){
            return false
        }
        if(this.#socket.readyState !== WebSocket.OPEN){
            return false
        }
        this.#lastSentMessageTime = performance.now()
        this.#socket.send(data)
        return true
    }
}