
import { TileMap } from "./webgl/drawer/tilemap"

/** @interface */
class IB2D{
    /**
     * Inicia os gráficos.
     * @param {number} width 
     * @param {number} height 
     * @param {string} elementId é o id do elemento. função falha se não existir um canvas com esse id. 
     */
    Graphics(width,height,elementId){}


    /**
     * finaliza os gráficos.
     */
    EndGraphics(){}

    /**
     * 
     * @param {function(IB2D):void} callback 
     */
    Draw(callback){}


    /**
     * Limpa a tela com a cor especificada.
     * @param {number} r 
     * @param {number} g 
     * @param {number} b 
     */
    Cls(r,g,b){}

    /**
     * Escreve um texto na posição x,y.
     * @param {string} text 
     * @param {number} x 
     * @param {number} y 
     */
    DrawText(text,x,y){}

    /**
     * Carrega uma imagem.
     * @param {string} fileName
     * @returns {Promise<IImage>}
     */
    async LoadImage(fileName){
        return new IImage()
    }

    /**
     * Carrega uma imagem com tiles.
     * @param {string} fileName
     * @param {number} frameWidth
     * @param {number} frameHeight
     * @returns {Promise<IImage>}
     */
    async LoadAnimImage(fileName, frameWidth, frameHeight){
        return new IImage()
    }
    


    /**
     * Desenha uma imagem.
     * @param {IImage} imageHandler
     * @param {number} x
     * @param {number} y
     */
    DrawImage(imageHandler,x,y){}


    /**
     * Define a posição da câmera imaginária.
     * @param {number} x 
     * @param {number} y 
     */
    SetCamera(x,y){}

    /**
     * Desenha um frame de uma imagem.
     * @param {IImage} imageHandler
     * @param {number} x
     * @param {number} y
     * @param {number} frame
     */
    DrawImageFrame(imageHandler,x,y,frame){}

    /**
     * Desenha um tilemap em x, y
     * @param {TileMap} tilemapHandler
     * @param {IImage} imageHandler
     * @param {number} x
     * @param {number} y
     */
    DrawTilemap(tilemapHandler,imageHandler,x,y){}

    /**
     * Define o ângulo de rotação para os próximos desenhos.
     * @param {number} angle
     */
    SetAngle(angle){}

    /**
     * Define a escala do desenho.
     * @param {number} x
     * @param {number} y
     */
    SetScale(x,y){}


    /**
     * 
     * @param {number} r 
     * @param {number} g 
     * @param {number} b 
     * @param {number} a 
     */
    SetColor(r,g,b,a){}
}

/** @interface */
class IImage {
    width = 0
    height = 0
    frameWidth = 0
    frameHeight = 0
    frameCount = 0
    getWidth(){}
    getHeight(){}
    getFrameWidth(){}
    getFrameHeight(){}
}


/**
 * Inicializa um "objeto" com propriedades específicas.
 * @template T
 * @param {T} x 
 * @param {object|undefined} properties 
 * @returns T
 */
function make(x, properties){
    // @ts-ignore
    x.initialize && x.initialize()

    if(properties){
        for(let k of Object.keys(properties)){
            // @ts-ignore
            x[k] = properties[k]
        }
    }
    return x
}

/** @interface */
class IApp {
    /** @param {IB2D} b */
    setup(b){}
    /** @param {IB2D} b */
    draw(b){}
}

/** @type {((arg0: IB2D) => void)[]} */
const _preloadFunctions = []
/** @type {((arg0: IB2D) => void)[]} */
const _unloadFunctions = []

/**
 * Registra uma função para ser executada no preload.
 * O preload é executado antes do initialize.
 * Este é o lugar para pré-carregar sprites e afins.
 * @param {function(IB2D):void} fn 
 */
function Preload(fn){
    _preloadFunctions.push(fn)
}

/**
 * Registra uma função para ser executada quando a engine é finalizada
 * @param {function(IB2D):void} fn 
 */
function Unload(fn){
    _unloadFunctions.push(fn)
}


/**
 * Inicializa a engine. game deve implementar a interface iapp.
 * obs: o que estava pretendendo fazer com isso?
 * @param {IApp} game 
 * @param {IB2D} b2d
 * @returns {function}
 */
function Start(game, b2d){
    const origCreate = WebGLRenderingContext.prototype.createTexture;
    const origDelete = WebGLRenderingContext.prototype.deleteTexture;
    let textureCount = 0;

    WebGLRenderingContext.prototype.createTexture = function () {
        const tex = origCreate.call(this);
        textureCount++;
        console.log("createTexture. c=",textureCount)
        return tex;
    };

    WebGLRenderingContext.prototype.deleteTexture = function (tex) {
        if (tex) textureCount--;
        console.log("deleteTexture. c=",textureCount)
        return origDelete.call(this, tex);
    };

    let finished = false

    const drawer = game.draw.bind(game)
    let animation_frame_id=0
    function draw(){
        b2d.Draw( drawer ) 
        animation_frame_id = requestAnimationFrame(draw)
    }

    game.setup(b2d)

    Promise.all(_preloadFunctions.map( f => f(b2d) )).then( function(results){
        console.log("finished preloading")
        _preloadFunctions.length = 0
        draw()
    })



    return function (){
        console.log("bye!")
        cancelAnimationFrame(animation_frame_id)
        
        _unloadFunctions.forEach( f=> f(b2d) )
        _unloadFunctions.length = 0

        b2d.EndGraphics()

        WebGLRenderingContext.prototype.createTexture = origCreate
        WebGLRenderingContext.prototype.deleteTexture = origDelete

    }
}



const PI_BY_180 = (Math.PI / 180)

/**
 * @param {number} a
 */
function Sin(a){
    return Math.sin( a * PI_BY_180)
}

/**
 * @param {number} a
 */
function Cos(a){
    return Math.cos( a * PI_BY_180)
}


export { 
    IB2D,   // interface de renderizador
    IImage, // imagem
    IApp    // de joguinho
};

export {
    // core
    make,

    // matemática
    Sin,
    Cos,

    // ciclo de vida
    Start,
    Preload,
    Unload
}