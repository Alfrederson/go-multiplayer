<script>
    let open = $state(false)
</script>
<style>
    .item {
        text-align: center;
        margin-top:2px;
        display:inline-block;
        width:3.5rem;
        height:3.5rem;
        color: yellow;
        font-weight: bold;
        text-shadow: 2px 2px var(--bs-dark);
    }
    .selecionado {
        background-color:var(--bs-dark);
    }
</style>
{#if open}
<div class="layer" style="z-index:11;user-select: none;  margin:auto;">
    <div class="modal" style="background-color: rgba(0,0,0,0.5); margin-left:4.5rem;margin-right:4.5rem; border:none; display:block;">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">
                        mochila
                    </h5>
                    <button class="btn btn-close"></button>
                </div>
                <div class="pt-4 " style="border:none">
                    <ul class="gap-2">
                        <li class="item">
                            🌽 <br/> 10
                        </li>
                        <li class="item">
                            🍞 <br/> 2
                        </li>
                        <li class="item">
                            🧃 <br/> 2
                        </li>
                        <li class="item">
                            ⛏ <br/> 1
                        </li>
                        <li class="item">
                            🪓 <br/> 1
                        </li>
                        <li class="item selecionado">
                            🐛 <br/> 1
                        </li>
                        <li class="item">
                            🌾 <br/> 15
                        </li>
                        <li class="item">
                            🌭 <br/> 1
                        </li>
                    </ul>
                </div>
                <div class="modal-footer bg-transparent" style="border:none">
                    <button class="btn btn-dark">comer</button>
                    <button class="btn btn-dark">largar</button>
                    <button class="btn btn-dark" disabled>equipar</button>
                </div>
            </div>
        </div>
    </div>
</div>
{/if}