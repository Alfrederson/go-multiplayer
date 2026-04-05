<script>
    import { onMount } from "svelte";
    import BaseBox from "./BaseBox.svelte";

    let open = $state(false)
    function ok(){
        open = false
        // envia a confirmação pro servidor lá
    }
    onMount(()=>{

    })
</script>
{#if open}
    <BaseBox>
        {#snippet title()}
            Nome do NPC:
        {/snippet}
        {#snippet  body()}
            clube militaaar!<br/>
            notas de repúdio!<br/>
            diariamente!<br/>
            clube militaaar!
        {/snippet}
        {#snippet footer()}
            <div class="btn dropdown-toggle blinky p-0 m-0" onclick={ok}></div>
        {/snippet}
    </BaseBox>
{/if}