import { mat4 } from "gl-matrix"
import { IImage } from "../blitz"

/** @interface */
class IWGLImage extends IImage {
    /** @type {WebGLTexture} */
    texture
    /** @type {number[][]} */
    uvs
}

/** @type{ Map<string,IWGLImage> } */
const _imageMap = new Map()

/**
 * @param {WebGLRenderingContext} ctx
 * @param {string} imageName
 * @param {number} frameWidth
 * @param {number} frameHeight
 * @returns {Promise<IWGLImage>|IWGLImage}
 */

function loadImage(ctx, imageName, frameWidth, frameHeight){
    let img = _imageMap.get(imageName)
    if (img) return img;

    return new Promise( (resolve,reject)=>{
        const texture = ctx.createTexture()
        if(!texture){
            reject("não consegui criar uma textura")
            return
        }        

        const result = {
            width : 32,
            height: 32,
            frameWidth,
            frameHeight,
            frameCount : 1,
            texture,
            /** @type{number[][]} */
            uvs : []
        }

        const image = new Image()
        image.onload = function(){            
            result.width = image.width
            result.height = image.height
            if(frameWidth !== 0 && frameHeight !== 0){
                let framesX =(result.width/frameWidth)|0
                let framesY =(result.height/frameHeight)|0
                let uvw = 1 / framesX
                let uvh = 1 / framesY
                result.frameCount = framesX * framesY
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
            ctx.bindTexture(ctx.TEXTURE_2D,texture)
            ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MIN_FILTER, ctx.LINEAR)
            ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_MAG_FILTER, ctx.NEAREST)    
            ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_S, ctx.CLAMP_TO_EDGE)
            ctx.texParameteri(ctx.TEXTURE_2D, ctx.TEXTURE_WRAP_T, ctx.CLAMP_TO_EDGE)

            ctx.texImage2D(ctx.TEXTURE_2D,0,ctx.RGBA,ctx.RGBA,ctx.UNSIGNED_BYTE,image)

            _imageMap.set(imageName, result)

            resolve(result)
            console.log("carreguei "+imageName)
        }
        image.onerror = function(){
            reject("não consegui carregar " + imageName)
        }
        image.src = imageName
    })
}

export {
    loadImage,
    IWGLImage
}