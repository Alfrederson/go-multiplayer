class WGLImage {
    /** @type {WebGLTexture|undefined} */
    texture

    /** @type {number[][]|undefined} */
    uvs

    width = 32
    height= 32
    frameWidth = 1
    frameHeight = 1
    frameCount = 1

    /**
     * @param {WebGLTexture} [texture]
     * @param {number[][]} [uvs]
     */
    constructor(texture,uvs){
        this.texture=texture
        this.uvs=uvs
    }

    getWidth(){}
    getHeight(){}
    getFrameWidth(){}
    getFrameHeight(){}    
}


/** @type { Map<string,WGLImage> } */
const _imageMap = new Map()

/**
 * carrega uma imagem que pode ter frames ou não.
 * fazer uma versão pra cada?
 * @param {WebGLRenderingContext} ctx
 * @param {string} imageName
 * @param {number} frameWidth
 * @param {number} frameHeight
 * @returns {Promise<WGLImage>|WGLImage}
 */
function loadImage(ctx, imageName, frameWidth, frameHeight){
    let img = _imageMap.get(imageName)
    if (img) return img;

    return new Promise( (resolve,reject)=>{        
        const result = new WGLImage()
        const image = new Image()
        image.onload = function(){            
            result.width = image.width
            result.height = image.height
            if(frameWidth !== 0 && frameHeight !== 0){
                let framesX =(result.width/frameWidth)|0
                let framesY =(result.height/frameHeight)|0
                let uvw = 1 / framesX
                let uvh = 1 / framesY
                result.frameWidth = frameWidth
                result.frameHeight = frameHeight
                result.frameCount = framesX * framesY
                result.uvs = []
                for(let y = 0; y < framesY; y++){
                    for(let x = 0; x < framesX; x++){                    
                        result.uvs.push([
                            x * uvw,
                            y * uvh,
                            x * uvw + uvw,
                            y * uvh + uvh
                        ])
                    }
                }
            }else{
                result.frameWidth = image.width
                result.frameHeight = image.height
            }

            const texture = ctx.createTexture()
            result.texture = texture
            
            if(!texture){
                reject("não consegui criar uma textura")
                return
            }  

            ctx.bindTexture(ctx.TEXTURE_2D,texture)

            ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.LINEAR)
            ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.NEAREST)    
            ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE)
            ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE)

            ctx.texImage2D(ctx.TEXTURE_2D,0,ctx.RGBA,ctx.RGBA,ctx.UNSIGNED_BYTE,image)

            _imageMap.set(imageName, result)

            resolve(result)
            console.log(imageName,"carregado")
        }
        image.onerror = function(){
            reject("não consegui carregar " + imageName)
        }
        image.src = imageName
    })
}

export {
    loadImage,
    WGLImage
}