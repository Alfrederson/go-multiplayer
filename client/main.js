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

import { GameState } from "./game_state"

document.URL

import {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  SERVER_URL
} from "./config.js"
import { Client } from "./game/client/client.js"

const debug_div = document.getElementById("debug")

export function chag_message(txt){
  if(!debug_div)
    return
  let new_element = document.createElement("p")
  new_element.innerText = txt
  new_element.classList.add("chat-message")
  debug_div.appendChild(new_element)
  setTimeout(()=>{
    new_element.style.opacity = "0.0";
    new_element.style.left = "-100%";
  },1500)
  setTimeout(()=>{
    new_element.remove()
  },2000)
}

export function debug_text(txt){
  if(!debug_div)
    return
  let new_element = document.createElement("p")
  new_element.innerText = txt
  debug_div.appendChild(new_element)
  setTimeout(()=>{
    new_element.style.opacity = "0.0";
    new_element.style.left = "-100%";
  },1500)
  setTimeout(()=>{
    new_element.remove()
  },2000)
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
    this.client.connect(SERVER_URL,{
      listener: x => this.gameState.listener(x),
      connected: x => this.gameState.connected(x),
      disconnected: x => this.gameState.disconnected(),
      error: x => this.gameState.error(x)
    })

    const input_message = document.getElementById("input-chat")
    const chat_form = document.getElementById("chat")
    const chat_open = document.getElementById("chat-open")
    const chat_closed = document.getElementById("chat-closed")
    const btn_open_chat = document.getElementById("btn-open-chat")
    const btn_close_chat = document.getElementById("btn-close-chat")
    btn_open_chat?.addEventListener("click",()=>{
      chat_open.style.display="block"
      chat_closed.style.display="none"
    })
    btn_close_chat?.addEventListener("click",()=>{
      chat_open.style.display="none"
      chat_closed.style.display="block"
    })
    chat_form?.addEventListener("submit", (event)=>{
      event.preventDefault()
      this.gameState.sendChat(input_message.value)
      input_message.value=""
    })
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
 * @typedef {Object} AndroidHost 
 * @property {function(string):void} toast
 */

Start(new MMORPG(), new WGL_B2D())

export {
  SCREEN_WIDTH,
  SCREEN_HEIGHT
}