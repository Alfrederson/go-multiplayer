<script>
    let {title,body,footer} = $props()
</script>

    <div class="layer" style="z-index:11;user-select: none; margin:auto;">
        <div class="modal mt-5" style=" background-color: rgba(0,0,0,0.2); display:block;">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header pb-0 pt-0">
                        <h5 class="modal-title">{@render title()}</h5>
                    </div>
                    <div class="modal-body pb-0 pt-1">
                        {@render body()}
                    </div>
                    <div class="modal-footer bg-transparent justify-content-center pt-0 pb-0" style="border:none">
                        {@render footer()}
                    </div>
                </div>
            </div>
        </div>
    </div>