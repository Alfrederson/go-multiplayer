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

import * as Level0 from "./game/levels/0/level.js"

document.URL

import {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  SERVER_URL
} from "./config.js"
import { Client } from "./game/client/client.js"


/** @implements {IApp} */
class CatGame {
  gameState = new GameState()
  client = new Client()

  /** @param {IB2D} b */
  setup(b) {
    console.log("graphics")
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
    // carrega o mapa

    Level0.Load( this.gameState )
  }

  /** @param {IB2D} b */
  draw(b) {
    this.gameState.update()
    this.gameState.render(b)
  }
}

/** 
 * @typedef {Object} AndroidHost 
 * @property {function(string):void} toast
 */

Start(new CatGame(), new WGL_B2D())

export {
  SCREEN_WIDTH,
  SCREEN_HEIGHT
}