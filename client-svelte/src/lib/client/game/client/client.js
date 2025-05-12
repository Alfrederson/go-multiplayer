// aqui a gente põe o cliente online

import { SERVER_URL } from "../../config.js"
import * as util from "./util.js"
import * as messages from "./messages.js"

export class Message {
    #buffer
    #bytes
    pointer = 0 
    length = 0

    /**
     * 
     * @param {Uint8Array} bytes 
     * @returns 
     */
    static FromBytes(bytes){
        const m = new Message()
        m.#bytes = bytes
        m.length = bytes.length
        return m
    }

    static Empty(){
        const m = new Message()
        m.length = 0
        m.#buffer = []
        return m
    }

    take_i8(){
        const result = this.#bytes[this.pointer]
        this.pointer += 1
        return result
    }
    take_bool(){
        const result = this.#bytes[this.pointer] == 1 ? true : false
        this.pointer += 1
        return result
    }
    take_i16(){
        const result_h = this.#bytes[this.pointer]
        const result_l = this.#bytes[this.pointer+1]
        this.pointer += 2
        return (result_h << 8)|result_l
    }
    take_i32(){
        const result_0 = this.#bytes[this.pointer]
        const result_1 = this.#bytes[this.pointer+1]
        const result_2 = this.#bytes[this.pointer+2]
        const result_3 = this.#bytes[this.pointer+3]
        this.pointer += 4
        return (result_0 << 24)|(result_1 << 16)|(result_2 << 8)|result_3
    }
    take_short_string(){
        const length = this.#bytes[this.pointer]
        let result = ""
        for(let i = 0; i < length; i++){
            result += String.fromCharCode( this.#bytes[i+this.pointer+1] )
        }
        this.pointer += 1+length
        return result
    }

    put_i8(number){
        this.#buffer.push( number & 0xFF )
        return this
    }

    put_i16(number){
        this.#buffer.push( number >> 8) & 0xFF
        this.#buffer.push ( number & 0xFF)
        return this
    }
    put_i32(number){
        this.#buffer.push( number >> 24) & 0xFF
        this.#buffer.push( number >> 16) & 0xFF
        this.#buffer.push( number >> 8) & 0xFF
        this.#buffer.push ( number & 0xFF)
        return this
    }
    /**
     * coloca um texto de até 255 caracteres
     * se for maior, a string é cortada
     * @param {string} str 
     */
    put_short_string(str){
        const len = Math.min(255,str.length)
        this.put_i8(len)
        for(let i = 0; i < len; i++){
            this.put_i8( str.charCodeAt(i) )
        }
        return this
    }
    construct(){
        return new Uint8Array(this.#buffer)
    }
}

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

    connected(){
        return this.#socket.readyState == WebSocket.OPEN
    }

    /**
     * conecta no servidor.
     * 
     * @param {string} url
     * @param {{
     *  listener: (arg0:Uint8Array) => void,
     *  connected: (arg0:Client)=> void,
     *  disconnected : ()=> void,
     *  error : ()=>void
     * }} 
     * @param {string} token
     */
    connect(url, {listener,connected,disconnected,error}, token){
        this.#myClientId = -1
        
        this.#listener = listener
        const socket = new WebSocket(SERVER_URL+"?token="+token)
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