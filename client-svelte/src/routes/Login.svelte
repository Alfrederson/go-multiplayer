<script>
    import { user_store } from "$lib/client/game/fb/fb";

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
<h1 style="color:red">{$user_store.determinado}</h1>
<div class="layer" style="z-index:12;user-select: none;  margin:auto;">
    <div class="modal" style="background-color: rgba(0,0,0,0.5); margin-left:4.5rem;margin-right:4.5rem; border:none; display:block;">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">
                        hello!
                    </h5>
                    <button class="btn btn-close"></button>
                </div>
                <div class="modal-body">
                    <p>Para jogar nosso singelo joguinho, você deve estar logado.</p>
                    <div class="input-group">
                        <button class="btn btn-dark form-control">Fazer login com o Google</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>