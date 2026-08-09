numero = 1

function on_load()
    Event.sleep(15)
    Event.broadcast_message("o porquinho manda um oi para todo mundo!")
end

function on_talk()
    print("você está falando com um porco!")
end