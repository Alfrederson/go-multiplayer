numero = 123

function on_load()
    while true do
        print("pó pó! galinha agora pesa ",self.numero)
        Event.sleep(4)
    end
end

function on_talk()
    print("você está falando com um porco!")
end