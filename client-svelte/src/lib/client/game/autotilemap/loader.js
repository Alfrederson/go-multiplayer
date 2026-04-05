export class AutotilemapLoader {
    /**
     * @param {string} mapname 
     */ 
    static async load(mapname){
        // a gente vai usar o cê dê ene.
        const result = await fetch("https://editor-mmorpg-1085195824814.us-east1.run.app/api/maps/"+mapname)
        if(result.status !== 200){
            throw "não consegui carregar o mapa"
        }
        const bytes = await result.arrayBuffer()
        console.log(bytes)
    }
}