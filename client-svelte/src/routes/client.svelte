<script>
    import {start_game, resize_screen} from "$lib/client/main"
    import { onMount } from "svelte";

    onMount(()=>{
        start_game()
        window.addEventListener("resize", event =>{
            let width,height
            width = window.innerWidth
            height = window.innerHeight
            resize_screen(width,height)
        })
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