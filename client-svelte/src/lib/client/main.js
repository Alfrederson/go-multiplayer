
import {
  WGL_B2D
} from "./blitz/webgl.js"

import {
  Start,
  IB2D,
  IApp,
} from "./blitz/blitz.js"

import {
  AttachInput,
} from "./blitz/input.js"

import { GameState } from "./game_state.js"

import {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  SERVER_URL
} from "./config.js"
import { Client } from "./game/client/client.js"

import { user_store } from "./game/fb/fb.js"

/**
 * @param {string} type
 * @param {any} value
 */
function dispatch_event(type,value){
  window.dispatchEvent(new CustomEvent(type,{
    detail : value
  }))
}
/**
 * @param {string} txt
 */
export function chat_message(txt){
  dispatch_event("chat_message",txt)
}

/**
 * @param {string} txt
 */
export function debug_text(txt){
  dispatch_event("debug_message",txt)
}

/** @implements {IApp} */
class MMORPG {
  gameState = new GameState()
  client = new Client()

  /** @param {IB2D} b */
  setup(b) {
    b.Graphics(SCREEN_WIDTH, SCREEN_HEIGHT, "game")
    AttachInput(SCREEN_WIDTH, SCREEN_HEIGHT, "game")

    this.gameState.screen.width = SCREEN_WIDTH
    this.gameState.screen.height = SCREEN_HEIGHT

    // conecta o cliente

    user_store.subscribe( u =>{
      if(u.logado && u.token){
        console.log("usuário está logado! ",u.token)
        this.client.connect(SERVER_URL,{
          listener: x => this.gameState.listener(x),
          connected: x => this.gameState.connected(x),
          disconnected: () => this.gameState.disconnected(),
          error: (/** @type {any} */ x) => this.gameState.error(x)
        },u.token)    
      }
    })

    // const input_message = document.getElementById("input-chat")
    // const chat_form = document.getElementById("chat")
    // const chat_open = document.getElementById("chat-open")
    // const chat_closed = document.getElementById("chat-closed")
    // const btn_open_chat = document.getElementById("btn-open-chat")
    // const btn_close_chat = document.getElementById("btn-close-chat")
    // btn_open_chat?.addEventListener("click",()=>{
    //   chat_open.style.display="block"
    //   chat_closed.style.display="none"
    // })
    // btn_close_chat?.addEventListener("click",()=>{
    //   chat_open.style.display="none"
    //   chat_closed.style.display="block"
    // })
    // chat_form?.addEventListener("submit", (event)=>{
    //   event.preventDefault()
    //   this.gameState.sendChat(input_message.value)
    //   input_message.value=""
    // })
  }

  then = performance.now()
  /** @param {IB2D} b */
  draw(b) {
    const now = performance.now()
    const dT = (now-this.then)/1000.0
    this.then=now
    this.gameState.update(dT)
    this.gameState.render(b)
  }
}

/**
 * @param {number} width
 * @param {number} height
 */
function resize_screen(width,height){

}

function start_game(){
  Start(new MMORPG(), new WGL_B2D())
}

export {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  start_game,
  resize_screen
}