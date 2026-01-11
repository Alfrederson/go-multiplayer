<script>
    import {start_game, resize_screen} from "$lib/client/main"
    import { onMount } from "svelte";

    onMount(()=>{
        const finisher = start_game()

        function resize_handler(event){
            let width,height
            width = window.innerWidth
            height = window.innerHeight
            resize_screen(width,height)
        }

        window.addEventListener("resize", resize_handler)
        return function(){
            finisher()
            window.removeEventListener("resize",resize_handler)
            console.log("kill_game()")
        }
    })
</script>
<style>
    canvas {
        z-index:1;
        display: block;
        cursor:crosshair;
    }
    .game-container {
		position:fixed;
		top:0px;
		left:0px;
		width:100vw;
		height:100vh;
        flex-flow:column;   
		display: flex;
		justify-content: center;
		align-items: center;	     
      }    
</style>

<div class="game-container">
    <div style="margin:auto;">
        <canvas id="game">
        </canvas>
        <canvas id="text">
        </canvas>  
    </div>
</div>  